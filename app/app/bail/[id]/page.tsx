'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Topbar from '@/components/layout/Topbar'
import Button from '@/components/ui/Button'
import SignatureCanvas, { SignatureCanvasHandle } from '@/components/documents/SignatureCanvas'
import Emoji from '@/components/ui/Emoji'
import { createClient } from '@/lib/supabase/client'
import { generateBailPdf, type BailFormData } from '@/lib/bailPdf'
import type { BailDetail } from '@/app/api/bail/[id]/route'
import type { Lease } from '@/types/database'

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft: { label: 'Brouillon', color: 'rgba(255,255,255,0.6)', bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)' },
  pending_signature: { label: '✍️ En attente de signature', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  active: { label: '● Bail actif', color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  ended: { label: 'Terminé', color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)' },
}

function leaseToBailData(lease: Lease, ownerName: string, tenantName: string): BailFormData {
  return {
    bailleurNom: ownerName,
    bailleurAdresse: '',
    locataireNoms: tenantName,
    garantNom: '',
    mandataireNom: '',
    adresse: `${lease.address ?? ''}${lease.city ? `, ${lease.city}` : ''}`,
    surface: '',
    nbPieces: '',
    periodeConstruction: '',
    equipements: [],
    dpe: '',
    dateEffet: formatDate(lease.start_date),
    duree: lease.end_date ? `Jusqu'au ${formatDate(lease.end_date)}` : '3 ans — tacite reconduction',
    evenementJustificatif: '',
    loyerMensuel: String(lease.monthly_rent ?? 0),
    chargesType: 'Provision sur charges',
    chargesMontant: String(lease.charges_amount ?? 0),
    depotGarantie: String(lease.deposit_amount ?? 0),
    dateExigibilite: 'Le 5 du mois',
    zoneTendue: 'Non',
    loyerReference: '',
    travaux: '',
    conditionsParticulieres: lease.house_rules ?? '',
    annexes: [],
  }
}

const sectionCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
  padding: '24px',
}

export default function BailDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const sigRef = useRef<SignatureCanvasHandle>(null)

  const [detail, setDetail] = useState<BailDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [signOpen, setSignOpen] = useState(false)
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/bail/${id}`)
      if (res.status === 401) { router.push('/auth/login'); return }
      if (!res.ok) { setNotFound(true); setLoading(false); return }
      setDetail(await res.json())
    } catch { setNotFound(true) }
    setLoading(false)
  }, [id, router])

  useEffect(() => { load() }, [load])

  /** Après la 2e signature : génère le PDF signé et le dépose dans le bucket privé "leases". */
  async function uploadSignedPdf(d: BailDetail) {
    try {
      const freshRes = await fetch(`/api/bail/${id}`)
      if (!freshRes.ok) return
      const fresh: BailDetail = await freshRes.json()
      const doc = generateBailPdf(
        leaseToBailData(fresh.lease, fresh.owner?.name ?? 'Bailleur', fresh.tenant?.name ?? 'Locataire'),
        {
          bailleur: fresh.lease.owner_signature?.signature_data ?? null,
          locataire: fresh.lease.tenant_signature?.signature_data ?? null,
        }
      )
      const blob = doc.output('blob')
      const path = `${d.lease.id}/bail-signe.pdf`
      const supabase = createClient()
      const { error: upErr } = await supabase.storage.from('leases').upload(path, blob, { upsert: true, contentType: 'application/pdf' })
      if (!upErr) {
        await fetch(`/api/bail/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_url: path }),
        })
      }
    } catch {}
  }

  async function handleSign() {
    if (!detail) return
    if (!sigRef.current || sigRef.current.isEmpty()) { setError('Merci de signer dans le cadre avant de valider.'); return }
    if (!consent) { setError('Merci de cocher la case de consentement.'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/bail/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: sigRef.current.toDataURL(), consent: true }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erreur lors de la signature.'); setSubmitting(false); return }
      if (json.status === 'active') await uploadSignedPdf(detail)
      setSignOpen(false)
      setConsent(false)
      await load()
    } catch {
      setError('Une erreur est survenue.')
    }
    setSubmitting(false)
  }

  function downloadPdf() {
    if (!detail) return
    if (detail.documentSignedUrl) { window.open(detail.documentSignedUrl, '_blank'); return }
    const doc = generateBailPdf(
      leaseToBailData(detail.lease, detail.owner?.name ?? 'Bailleur', detail.tenant?.name ?? 'Locataire'),
      {
        bailleur: detail.lease.owner_signature?.signature_data ?? null,
        locataire: detail.lease.tenant_signature?.signature_data ?? null,
      }
    )
    doc.save('bail-isaly.pdf')
  }

  if (loading) {
    return (
      <>
        <Topbar title="Mon bail" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[44px]" style={{ animation: 'bop 1s ease infinite' }}><Emoji native="📄" /></div>
        </div>
      </>
    )
  }

  if (notFound || !detail) {
    return (
      <>
        <Topbar title="Mon bail" />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="text-[52px] mb-4"><Emoji native="🚫" /></div>
          <h3 className="text-[18px] mb-2 font-bold" style={{ color: '#fff', fontFamily: "'Outfit', sans-serif" }}>Bail introuvable</h3>
          <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Ce bail n&apos;existe pas ou vous n&apos;y avez pas accès.</p>
        </div>
      </>
    )
  }

  const { lease, myRole, canSign, owner, tenant, documentSignedUrl } = detail
  const badge = STATUS_BADGE[lease.status] ?? STATUS_BADGE.draft
  const waitingForMe = canSign
  const waitingForOther =
    lease.status === 'pending_signature' && !canSign &&
    (myRole === 'owner' ? !lease.tenant_signature : true)

  const rows: [string, string][] = [
    ['Bailleur', owner?.name ?? '—'],
    ['Locataire', tenant?.name ?? '—'],
    ['Adresse du logement', `${lease.address ?? '—'}${lease.city ? `, ${lease.city}` : ''}`],
    ['Loyer mensuel', `${lease.monthly_rent ?? 0} €`],
    ['Charges', lease.charges_amount != null ? `${lease.charges_amount} €` : '—'],
    ['Dépôt de garantie', lease.deposit_amount != null ? `${lease.deposit_amount} €` : '—'],
    ['Date de début', formatDate(lease.start_date)],
    ['Date de fin', lease.end_date ? formatDate(lease.end_date) : 'Non définie (tacite reconduction)'],
  ]

  const parties: { key: 'owner' | 'tenant'; label: string; sig: typeof lease.owner_signature }[] = [
    { key: 'owner', label: `Le bailleur${owner ? ` — ${owner.name}` : ''}`, sig: lease.owner_signature },
    { key: 'tenant', label: `Le locataire${tenant ? ` — ${tenant.name}` : ''}`, sig: lease.tenant_signature },
  ]

  return (
    <>
      <Topbar title="Mon bail" />
      <div className="flex-1 overflow-y-auto" style={{ background: 'transparent' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 24px 64px', fontFamily: "'Outfit', sans-serif" }}>

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="flex items-start justify-between gap-4 mb-6 flex-wrap">
            <div>
              <h1 className="text-[26px] font-bold m-0" style={{ color: '#fff' }}>Contrat de location</h1>
              <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {lease.address}{lease.city ? `, ${lease.city}` : ''}
              </p>
            </div>
            <span className="text-[12px] font-extrabold px-3.5 py-1.5 rounded-full"
              style={{ color: badge.color, background: badge.bg, border: `1px solid ${badge.border}` }}>
              {badge.label}
            </span>
          </motion.div>

          {/* Bandeau "à vous de signer" */}
          {waitingForMe && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="rounded-[16px] px-5 py-4 mb-5 flex items-center justify-between gap-4 flex-wrap"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div className="text-[13.5px] font-semibold" style={{ color: '#10B981' }}>
                <Emoji native="✍️" /> C&apos;est à vous de signer ce bail.
              </div>
              {!signOpen && <Button size="sm" onClick={() => setSignOpen(true)}>Signer le bail</Button>}
            </motion.div>
          )}
          {waitingForOther && (
            <div className="rounded-[16px] px-5 py-4 mb-5 text-[13px] font-medium"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B' }}>
              <Emoji native="⏳" /> En attente de la signature de {myRole === 'owner' ? 'votre locataire' : 'votre loueur'}.
            </div>
          )}

          {/* Récap des clauses */}
          <div style={{ ...sectionCard, padding: 0, overflow: 'hidden', marginBottom: '20px' }}>
            {rows.map(([label, value], i) => (
              <div key={label} className="flex items-center justify-between px-6 py-3.5 text-[13.5px] gap-4"
                style={{ borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
                <span className="font-semibold text-right" style={{ color: '#fff', maxWidth: '60%' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Consignes du logement */}
          {lease.house_rules && (
            <div style={{ ...sectionCard, marginBottom: '20px' }}>
              <div className="text-[13px] font-bold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <Emoji native="📋" size="13px" /> RÈGLES & CONSIGNES DU LOGEMENT
              </div>
              <p className="text-[13.5px] m-0 whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
                {lease.house_rules}
              </p>
            </div>
          )}

          {/* PDF signé embarqué */}
          {documentSignedUrl && (
            <div style={{ ...sectionCard, padding: '12px', marginBottom: '20px' }}>
              <iframe src={documentSignedUrl} title="Bail signé (PDF)"
                style={{ width: '100%', height: '480px', border: 'none', borderRadius: '12px', background: '#fff' }} />
            </div>
          )}

          {/* Signatures */}
          <div style={{ ...sectionCard, marginBottom: '20px' }}>
            <div className="text-[13px] font-bold mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <Emoji native="🖊️" size="13px" /> SIGNATURES
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {parties.map(p => (
                <div key={p.key} className="rounded-[14px] p-4"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="text-[12px] font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>{p.label}</div>
                  {p.sig ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.sig.signature_data} alt={`Signature — ${p.label}`}
                        style={{ background: '#fff', borderRadius: '10px', maxWidth: '200px', width: '100%' }} />
                      <div className="text-[11px] mt-2" style={{ color: '#10B981' }}>
                        ✓ Signé le {formatDateTime(p.sig.signed_at)}
                      </div>
                    </>
                  ) : (
                    <div className="text-[12.5px] py-6 text-center rounded-[10px]"
                      style={{ color: 'rgba(255,255,255,0.35)', border: '1.5px dashed rgba(255,255,255,0.12)' }}>
                      En attente de signature
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Module de signature */}
          {waitingForMe && signOpen && (
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              style={{ ...sectionCard, marginBottom: '20px' }}>
              <div className="text-[14px] font-bold mb-4" style={{ color: '#fff' }}>Votre signature manuscrite</div>
              <div className="rounded-[14px] p-3" style={{ background: '#fff' }}>
                <SignatureCanvas ref={sigRef} label="Dessinez votre signature (doigt ou souris)" />
              </div>
              <label className="flex items-start gap-3 mt-4 cursor-pointer select-none">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 cursor-pointer" style={{ accentColor: '#10B981' }} />
                <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                  J&apos;ai lu et j&apos;accepte les termes du bail.
                </span>
              </label>
              {error && <p className="text-[12.5px] mt-3 mb-0" style={{ color: '#EF4444' }}>{error}</p>}
              <div className="flex items-center gap-3 mt-5">
                <Button onClick={handleSign} loading={submitting} disabled={!consent}>
                  Valider ma signature
                </Button>
                <Button variant="ghost" onClick={() => { setSignOpen(false); setError('') }}>Annuler</Button>
              </div>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <Button variant="secondary" onClick={downloadPdf}>
              <Emoji native="📄" size="14px" /> {documentSignedUrl ? 'Voir le PDF signé' : 'Télécharger le bail (PDF)'}
            </Button>
          </div>

          {/* Bandeau légal eIDAS */}
          <p className="text-[11.5px]" style={{ color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
            Signature électronique simple au sens du règlement eIDAS. Les deux parties recevront une copie signée.
            L&apos;horodatage et l&apos;adresse IP sont conservés comme preuve de consentement.
          </p>
        </div>
      </div>
    </>
  )
}
