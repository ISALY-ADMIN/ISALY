'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Topbar from '@/components/layout/Topbar'
import Button from '@/components/ui/Button'
import SignatureCanvas, { SignatureCanvasHandle } from '@/components/documents/SignatureCanvas'
import Emoji from '@/components/ui/Emoji'
import { createClient } from '@/lib/supabase/client'
import { emptyBailNonMeubleData, type BailNonMeubleData } from '@/components/documents/BailNonMeubleForm'

// ═══════════ Constantes loi 89 ═══════════

const STEPS = [
  'Parties', 'Objet du contrat', 'Durée', 'Conditions financières',
  'Travaux', 'Garanties & clauses', 'Conditions particulières & annexes', 'Récapitulatif & signature',
]
const PERIODES = ['Avant 1949', '1949-1974', '1975-1989', '1989-2005', 'Depuis 2005']
const AUTRES_PARTIES = ['Grenier', 'Comble', 'Terrasse', 'Balcon', 'Loggia', 'Jardin']
const EQUIPEMENTS = ['Cuisine équipée', 'Installations sanitaires', 'Double vitrage', 'Volets', 'Cheminée']
const LOCAUX_PRIVATIFS = ['Cave', 'Parking', 'Garage']
const LOCAUX_COMMUNS = ['Ascenseur', 'Espaces verts', 'Local à vélos', 'Laverie', 'Local poubelles', 'Gardiennage']
const ANNEXES = [
  'Règlement de copropriété',
  'Dossier de diagnostic technique (DPE, plomb, amiante, électricité/gaz, risques)',
  "Notice d'information relative aux droits et obligations",
  'État des lieux',
  'Autorisation préalable de mise en location',
  'Références aux loyers du voisinage',
]
const DPE_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
const DRAFT_KEY = 'isaly-bail89-draft'

const CLAUSE_SOLIDARITE = "Les preneurs sont tenus solidairement et indivisiblement de l'exécution de toutes les conditions du bail et du paiement des loyers, charges et accessoires, y compris après le départ de l'un d'entre eux, jusqu'à l'expiration du bail."
const CLAUSE_RESOLUTOIRE = "À défaut de paiement d'une échéance de loyer ou de charges, ou en cas de non-versement du dépôt de garantie, le bail sera résilié de plein droit deux mois après une mise en demeure restée infructueuse (article 24, loi du 6 juillet 1989)."

// ═══════════ Primitives UI dark ═══════════

const labelCls = 'block text-[11.5px] font-extrabold uppercase tracking-wider mb-2'
const labelStyle: React.CSSProperties = { color: 'rgba(255,255,255,0.4)' }
const inputCls = 'w-full px-4 py-2.5 rounded-[10px] text-[13.5px] outline-none'
const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff',
  fontFamily: "'Outfit', sans-serif",
}
const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
  padding: '24px',
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: boolean }) {
  return (
    <div className={span ? 'sm:col-span-2' : undefined}>
      <label className={labelCls} style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function TxtIn({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input className={inputCls} type={type} placeholder={placeholder} value={value}
      style={{ ...inputStyle, ...(type === 'date' ? { colorScheme: 'dark' as const } : {}) }}
      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)')}
      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
      onChange={e => onChange(e.target.value)} />
  )
}

function TxtArea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea className={`${inputCls} resize-none`} style={inputStyle} rows={rows} placeholder={placeholder}
      value={value} onChange={e => onChange(e.target.value)} />
  )
}

function Sel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select className={inputCls} style={{ ...inputStyle, appearance: 'none' }} value={value}
      onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o} value={o} style={{ background: '#1a1a1a' }}>{o}</option>)}
    </select>
  )
}

function Chk({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none py-1">
      <span className="flex-shrink-0 mt-0.5 flex items-center justify-center rounded-[6px] transition-all"
        style={{
          width: 18, height: 18,
          background: checked ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255,255,255,0.05)',
          border: checked ? '1px solid #10B981' : '1px solid rgba(255,255,255,0.2)',
          color: '#fff', fontSize: '11px', fontWeight: 900,
        }}>{checked ? '✓' : ''}</span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.45 }}>{label}</span>
    </label>
  )
}

function Chips({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const on = value.includes(o)
        return (
          <button key={o} type="button"
            onClick={() => onChange(on ? value.filter(x => x !== o) : [...value, o])}
            className="px-3.5 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-all"
            style={{
              background: on ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
              border: on ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(255,255,255,0.1)',
              color: on ? '#10B981' : 'rgba(255,255,255,0.55)',
              fontFamily: "'Outfit', sans-serif",
            }}>{o}</button>
        )
      })}
    </div>
  )
}

function Radio2<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: T[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className="px-4 py-2 rounded-[10px] text-[12.5px] font-bold cursor-pointer transition-all"
          style={{
            background: value === o ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
            border: value === o ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(255,255,255,0.1)',
            color: value === o ? '#10B981' : 'rgba(255,255,255,0.55)',
            fontFamily: "'Outfit', sans-serif",
          }}>{o}</button>
      ))}
    </div>
  )
}

// ═══════════ Page ═══════════

interface ListingOption { id: string; title: string | null; city: string | null; rent: number | null }

export default function NouveauBailPage() {
  return (
    <Suspense fallback={null}>
      <NouveauBailLoi89 />
    </Suspense>
  )
}

function NouveauBailLoi89() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sigRef = useRef<SignatureCanvasHandle>(null)

  const [step, setStep] = useState(1)
  const [d, setD] = useState<BailNonMeubleData>(emptyBailNonMeubleData())
  const [meta, setMeta] = useState({
    listing_id: searchParams.get('listing') ?? '',
    tenant_id: searchParams.get('tenant') ?? '',
    city: '',
    end_date: '',
  })
  const [listings, setListings] = useState<ListingOption[]>([])
  const [tenantName, setTenantName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const restored = useRef(false)

  const upd = useCallback(<K extends keyof BailNonMeubleData>(key: K, value: BailNonMeubleData[K]) => {
    setD(prev => ({ ...prev, [key]: value }))
  }, [])

  // ── Restauration brouillon + pré-remplissage ──
  useEffect(() => {
    let draft: { d?: BailNonMeubleData; step?: number; meta?: typeof meta } | null = null
    try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null') } catch {}
    if (draft?.d) {
      setD(prev => ({ ...prev, ...draft!.d }))
      if (draft.step) setStep(Math.min(draft.step, 7)) // jamais restauré directement sur la signature
      if (draft.meta) setMeta(m => ({ ...draft!.meta!, tenant_id: m.tenant_id || draft!.meta!.tenant_id, listing_id: m.listing_id || draft!.meta!.listing_id }))
    }

    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const [{ data: me }, { data: myListings }] = await Promise.all([
        supabase.from('profiles').select('first_name, last_name, email, city').eq('id', user.id).maybeSingle(),
        supabase.from('listings').select('id, title, city, rent').eq('owner_id', user.id).order('created_at', { ascending: false }),
      ])
      setListings((myListings ?? []) as ListingOption[])
      if (me) {
        setD(prev => ({
          ...prev,
          bailleurNomPrenom: prev.bailleurNomPrenom || `${me.first_name ?? ''} ${me.last_name ?? ''}`.trim(),
          bailleurEmail: prev.bailleurEmail || (me.email ?? ''),
          bailleurDomicile: prev.bailleurDomicile || (me.city ?? ''),
        }))
      }

      const tenantId = searchParams.get('tenant') || draft?.meta?.tenant_id
      if (tenantId) {
        const { data: p } = await supabase.from('profiles').select('id, first_name, last_name, email').eq('id', tenantId).maybeSingle()
        if (p) {
          const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Locataire'
          setTenantName(name)
          setD(prev => ({
            ...prev,
            locataire1Nom: prev.locataire1Nom || name,
            locataire1Email: prev.locataire1Email || (p.email ?? ''),
          }))
        }
      }
      restored.current = true
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Pré-remplissage depuis l'annonce sélectionnée ──
  useEffect(() => {
    const l = listings.find(x => x.id === meta.listing_id)
    if (!l) return
    setD(prev => ({
      ...prev,
      adresse: prev.adresse || (l.title ?? ''),
      loyerMensuel: prev.loyerMensuel || String(l.rent ?? ''),
    }))
    setMeta(m => ({ ...m, city: m.city || (l.city ?? '') }))
  }, [meta.listing_id, listings])

  // ── Sauvegarde automatique du brouillon ──
  useEffect(() => {
    if (!restored.current) return
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ d, step, meta })) } catch {}
  }, [d, step, meta])

  // ── Validation par étape ──
  function stepError(s: number): string {
    if (s === 1 && (!d.bailleurNomPrenom || !d.locataire1Nom)) return 'Renseignez au minimum le bailleur et le locataire.'
    if (s === 1 && !meta.tenant_id) return "Sélectionnez le locataire (depuis un match) ou saisissez son identifiant."
    if (s === 2 && (!d.adresse || !d.surfaceHabitable || !d.nbPiecesPrincipales)) return 'Adresse, surface et nombre de pièces sont obligatoires.'
    if (s === 3 && !d.dateEffet) return "La date de prise d'effet est obligatoire."
    if (s === 4 && !d.loyerMensuel) return 'Le loyer mensuel est obligatoire.'
    return ''
  }

  function next() {
    const err = stepError(step)
    if (err) { setError(err); return }
    setError('')
    setStep(s => Math.min(s + 1, 8))
  }

  async function handleSubmit() {
    if (!sigRef.current || sigRef.current.isEmpty()) { setError('Merci de signer dans le cadre.'); return }
    if (!consent) { setError('Merci de cocher la case de consentement.'); return }
    for (const s of [1, 2, 3, 4]) {
      const err = stepError(s)
      if (err) { setError(`Étape ${s} — ${err}`); setStep(s); return }
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/bail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: meta.tenant_id,
          listing_id: meta.listing_id || null,
          address: d.adresse,
          city: meta.city || null,
          rent: Number(d.loyerMensuel) || 0,
          charges: d.chargesMontant ? Number(d.chargesMontant) : null,
          deposit: d.depotGarantie ? Number(d.depotGarantie) : null,
          start_date: d.dateEffet,
          end_date: meta.end_date || null,
          house_rules: d.conditionsParticulieres || null,
          signature: sigRef.current.toDataURL(),
          consent: true,
          bail_data: d,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erreur lors de la création du bail.'); setSubmitting(false); return }
      try { localStorage.removeItem(DRAFT_KEY) } catch {}
      router.push(`/app/bail/${json.id}`)
    } catch {
      setError('Une erreur est survenue.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <Topbar title="Établir un bail" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[44px]" style={{ animation: 'bop 1s ease infinite' }}><Emoji native="📄" /></div>
        </div>
      </>
    )
  }

  // ── Récapitulatif (étape 8) ──
  const recap: [string, ([string, string])[]][] = [
    ['I. Parties', [
      ['Bailleur', `${d.bailleurNomPrenom} (${d.bailleurQualite})`],
      ['Email bailleur', d.bailleurEmail],
      ['Mandataire', d.mandataireActif ? d.mandataireNom : 'Aucun'],
      ['Garant', d.garantNom || 'Aucun'],
      ['Locataire 1', `${d.locataire1Nom}${d.locataire1Email ? ` · ${d.locataire1Email}` : ''}`],
      ['Locataire 2', d.locataire2Actif ? d.locataire2Nom : '—'],
    ]],
    ['II. Objet du contrat', [
      ['Adresse', `${d.adresse}${d.batiment ? ` · ${d.batiment}` : ''}${meta.city ? `, ${meta.city}` : ''}`],
      ['Type / régime', `${d.typeImmeuble} · ${d.regimeJuridique}`],
      ['Construction', d.periodeConstruction],
      ['Surface / pièces', `${d.surfaceHabitable} m² · ${d.nbPiecesPrincipales} pièce(s)`],
      ['Autres parties', d.autresParties.join(', ') || '—'],
      ['Équipements', d.equipements.join(', ') || '—'],
      ['Chauffage / eau chaude', `${d.chauffageType} / ${d.eauChaudeType}`],
      ['DPE', d.dpe],
      ['Destination', d.destination],
      ['Parties accessoires', d.locauxPrivatifs.join(', ') || '—'],
      ['Parties communes', d.locauxCommuns.join(', ') || '—'],
      ['Internet / TV', d.equipementTic || '—'],
    ]],
    ['III. Durée', [
      ["Prise d'effet", d.dateEffet],
      ['Durée', d.dureeType],
      ['Motif durée réduite', d.dureeType === 'Durée réduite' ? d.dureeReduiteEvenement : '—'],
    ]],
    ['IV. Conditions financières', [
      ['Loyer mensuel', `${d.loyerMensuel} €`],
      ['Zone tendue', d.zoneTendue ? `Oui · réf. ${d.loyerReference || '—'} € / majoré ${d.loyerReferenceMajore || '—'} €` : 'Non'],
      ['Complément de loyer', d.complementLoyerActif ? `${d.complementLoyerMontant} €` : 'Non'],
      ['Dernier loyer (< 18 mois)', d.precedentLocataireMoins18Mois ? `${d.dernierLoyerMontant} €` : '—'],
      ['Révision annuelle', d.revisionDateAnnuelle ? `Le ${d.revisionDateAnnuelle} · IRL ${d.revisionTrimestreIRL}` : '—'],
      ['Charges', `${d.chargesModalite} · ${d.chargesMontant || 0} €`],
      ['Paiement', `Le ${d.jourExigibilite} · total ${((Number(d.loyerMensuel) || 0) + (Number(d.chargesMontant) || 0)).toLocaleString('fr-FR')} €/mois`],
      ['Assurance pour compte des colocataires', d.assuranceCompteColocatairesActif ? `Oui · ${d.assuranceAnnuelle} €/an` : 'Non'],
    ]],
    ['V. Travaux', [
      ['Travaux bailleur', d.travauxAmeliorationTexte ? `${d.travauxAmeliorationTexte} (${d.travauxAmeliorationMontant} €)` : '—'],
      ['Majoration loyer', d.majorationTravauxNature ? `${d.majorationTravauxNature} · ${d.majorationTravauxMontant} €` : '—'],
      ['Travaux locataire / diminution', d.diminutionTravauxNature ? `${d.diminutionTravauxNature} · ${d.diminutionTravauxMontant} € · ${d.diminutionTravauxDuree}` : '—'],
    ]],
    ['VI. Garanties & clauses', [
      ['Dépôt de garantie', `${d.depotGarantie || 0} €${d.depotGarantieLettres ? ` (${d.depotGarantieLettres})` : ''}`],
      ['Clause de solidarité', 'Incluse'],
      ['Clause résolutoire', 'Incluse'],
      ['Honoraires', d.mandataireActif ? `Visite/dossier/rédaction ${d.honorairesPlafondVisiteDossierRedaction || '—'} €/m² · EDL ${d.honorairesPlafondEtatLieux || '—'} €/m²` : 'Sans objet (pas de mandataire)'],
    ]],
    ['VII. Conditions particulières & annexes', [
      ['Conditions particulières', d.conditionsParticulieres || '—'],
      ['Annexes', d.annexes.length ? d.annexes.join(' · ') : 'Aucune'],
    ]],
  ]

  return (
    <>
      <Topbar title="Établir un bail" />
      <div className="flex-1 overflow-y-auto">
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px 64px', fontFamily: "'Outfit', sans-serif" }}>

          {/* Header + progress */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className="text-[26px] font-bold m-0" style={{ color: '#fff' }}>Contrat de location — loi n°89-462</h1>
            <p className="text-[13px] mt-1 mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Logement non meublé · le brouillon est sauvegardé automatiquement.
            </p>
            <div className="text-[10.5px] font-extrabold uppercase mb-2" style={{ letterSpacing: '2px', color: '#10B981' }}>
              Étape {step} / 8 — {STEPS[step - 1]}
            </div>
            <div className="flex gap-1.5 mb-7">
              {STEPS.map((_, i) => (
                <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-300"
                  style={{ background: i < step ? 'linear-gradient(90deg, #10B981, #059669)' : 'rgba(255,255,255,0.08)' }} />
              ))}
            </div>
          </motion.div>

          <motion.div key={step} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

            {/* ── ÉTAPE 1 — PARTIES ── */}
            {step === 1 && (
              <div className="flex flex-col gap-5">
                <div style={cardStyle}>
                  <div className="text-[13px] font-bold mb-4" style={{ color: '#10B981' }}>BAILLEUR</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Prénom et nom"><TxtIn value={d.bailleurNomPrenom} onChange={v => upd('bailleurNomPrenom', v)} placeholder="Catherine Dupont" /></Field>
                    <Field label="Email"><TxtIn value={d.bailleurEmail} onChange={v => upd('bailleurEmail', v)} placeholder="email@exemple.fr" /></Field>
                    <Field label="Domicile ou siège social" span><TxtIn value={d.bailleurDomicile} onChange={v => upd('bailleurDomicile', v)} placeholder="Adresse complète" /></Field>
                    <Field label="Qualité" span><Radio2 value={d.bailleurQualite} onChange={v => upd('bailleurQualite', v)} options={['Personne physique', 'Personne morale']} /></Field>
                  </div>
                  {d.bailleurQualite === 'Personne morale' && (
                    <div className="mt-3"><Chk checked={d.bailleurSocieteCivileFamiliale} onChange={v => upd('bailleurSocieteCivileFamiliale', v)} label="Société civile constituée exclusivement entre parents et alliés" /></div>
                  )}
                </div>

                <div style={cardStyle}>
                  <Chk checked={d.mandataireActif} onChange={v => upd('mandataireActif', v)} label="Un mandataire intervient dans la location (agence, administrateur de biens…)" />
                  {d.mandataireActif && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <Field label="Nom du mandataire"><TxtIn value={d.mandataireNom} onChange={v => upd('mandataireNom', v)} /></Field>
                      <Field label="Activité"><TxtIn value={d.mandataireActivite} onChange={v => upd('mandataireActivite', v)} placeholder="Gestion locative" /></Field>
                      <Field label="Adresse"><TxtIn value={d.mandataireAdresse} onChange={v => upd('mandataireAdresse', v)} /></Field>
                      <Field label="N° carte professionnelle"><TxtIn value={d.mandataireNumCarte} onChange={v => upd('mandataireNumCarte', v)} /></Field>
                    </div>
                  )}
                </div>

                <div style={cardStyle}>
                  <div className="text-[13px] font-bold mb-4" style={{ color: '#10B981' }}>GARANT (OPTIONNEL)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Nom du garant"><TxtIn value={d.garantNom} onChange={v => upd('garantNom', v)} /></Field>
                    <Field label="Adresse du garant"><TxtIn value={d.garantAdresse} onChange={v => upd('garantAdresse', v)} /></Field>
                  </div>
                </div>

                <div style={cardStyle}>
                  <div className="text-[13px] font-bold mb-4" style={{ color: '#10B981' }}>LOCATAIRE(S)</div>
                  {tenantName ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-[13.5px] font-semibold mb-4"
                      style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981' }}>
                      <Emoji native="👤" size="14px" /> {tenantName} — pré-rempli depuis le match
                    </div>
                  ) : (
                    <div className="mb-4">
                      <Field label="Identifiant du locataire (depuis un match)"><TxtIn value={meta.tenant_id} onChange={v => setMeta(m => ({ ...m, tenant_id: v }))} placeholder="UUID du profil locataire" /></Field>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Prénom et nom du locataire"><TxtIn value={d.locataire1Nom} onChange={v => upd('locataire1Nom', v)} /></Field>
                    <Field label="Email du locataire"><TxtIn value={d.locataire1Email} onChange={v => upd('locataire1Email', v)} /></Field>
                  </div>
                  <div className="mt-4">
                    <Chk checked={d.locataire2Actif} onChange={v => upd('locataire2Actif', v)} label="Ajouter un second locataire (colocation)" />
                    {d.locataire2Actif && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                        <Field label="Prénom et nom"><TxtIn value={d.locataire2Nom} onChange={v => upd('locataire2Nom', v)} /></Field>
                        <Field label="Email"><TxtIn value={d.locataire2Email} onChange={v => upd('locataire2Email', v)} /></Field>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── ÉTAPE 2 — OBJET DU CONTRAT ── */}
            {step === 2 && (
              <div className="flex flex-col gap-5">
                <div style={cardStyle}>
                  <div className="text-[13px] font-bold mb-4" style={{ color: '#10B981' }}>LOCALISATION</div>
                  <div className="mb-4">
                    <Field label="Annonce liée (pré-remplit adresse et loyer)">
                      <select className={inputCls} style={{ ...inputStyle, appearance: 'none' }} value={meta.listing_id}
                        onChange={e => setMeta(m => ({ ...m, listing_id: e.target.value }))}>
                        <option value="" style={{ background: '#1a1a1a' }}>— Aucune annonce liée —</option>
                        {listings.map(l => (
                          <option key={l.id} value={l.id} style={{ background: '#1a1a1a' }}>
                            {l.title ?? 'Annonce'}{l.city ? ` · ${l.city}` : ''}{l.rent ? ` · ${l.rent} €` : ''}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Adresse du logement" span><TxtIn value={d.adresse} onChange={v => upd('adresse', v)} placeholder="12 rue des Lilas" /></Field>
                    <Field label="Bâtiment / escalier / étage / porte"><TxtIn value={d.batiment} onChange={v => upd('batiment', v)} placeholder="Bât. B, esc. 2, 3e ét., porte 12" /></Field>
                    <Field label="Ville"><TxtIn value={meta.city} onChange={v => setMeta(m => ({ ...m, city: v }))} placeholder="Lyon" /></Field>
                    <Field label="Identifiant fiscal du logement"><TxtIn value={d.identifiantFiscal} onChange={v => upd('identifiantFiscal', v)} /></Field>
                    <Field label="Période de construction"><Sel value={d.periodeConstruction} onChange={v => upd('periodeConstruction', v)} options={PERIODES} /></Field>
                  </div>
                </div>

                <div style={cardStyle}>
                  <div className="text-[13px] font-bold mb-4" style={{ color: '#10B981' }}>CONSISTANCE DU LOGEMENT</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <Field label="Type d'habitat"><Radio2 value={d.typeImmeuble} onChange={v => upd('typeImmeuble', v)} options={['Collectif', 'Individuel']} /></Field>
                    <Field label="Régime juridique"><Radio2 value={d.regimeJuridique} onChange={v => upd('regimeJuridique', v)} options={['Mono-propriété', 'Copropriété']} /></Field>
                    <Field label="Surface habitable (m²)"><TxtIn type="number" value={d.surfaceHabitable} onChange={v => upd('surfaceHabitable', v)} placeholder="65" /></Field>
                    <Field label="Pièces principales"><TxtIn type="number" value={d.nbPiecesPrincipales} onChange={v => upd('nbPiecesPrincipales', v)} placeholder="3" /></Field>
                    <Field label="DPE (classe énergie)"><Sel value={d.dpe} onChange={v => upd('dpe', v)} options={DPE_OPTIONS} /></Field>
                    <Field label="Destination"><Radio2 value={d.destination} onChange={v => upd('destination', v)} options={['Habitation', 'Usage mixte']} /></Field>
                  </div>
                  <div className="mb-4"><Field label="Autres parties du logement"><Chips options={AUTRES_PARTIES} value={d.autresParties} onChange={v => upd('autresParties', v)} /></Field></div>
                  <div className="mb-4"><Field label="Équipements"><Chips options={EQUIPEMENTS} value={d.equipements} onChange={v => upd('equipements', v)} /></Field></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Chauffage"><Radio2 value={d.chauffageType} onChange={v => upd('chauffageType', v)} options={['Individuel', 'Collectif']} /></Field>
                    <Field label="Eau chaude sanitaire"><Radio2 value={d.eauChaudeType} onChange={v => upd('eauChaudeType', v)} options={['Individuel', 'Collectif']} /></Field>
                  </div>
                </div>

                <div style={cardStyle}>
                  <div className="text-[13px] font-bold mb-4" style={{ color: '#10B981' }}>ACCESSOIRES & COMMUNS</div>
                  <div className="mb-4"><Field label="Parties accessoires à usage privatif"><Chips options={LOCAUX_PRIVATIFS} value={d.locauxPrivatifs} onChange={v => upd('locauxPrivatifs', v)} /></Field></div>
                  <div className="mb-4"><Field label="Parties et équipements communs"><Chips options={LOCAUX_COMMUNS} value={d.locauxCommuns} onChange={v => upd('locauxCommuns', v)} /></Field></div>
                  <Field label="Internet / TV (équipement d'accès aux technologies)"><TxtIn value={d.equipementTic} onChange={v => upd('equipementTic', v)} placeholder="Fibre optique, prise TV…" /></Field>
                </div>
              </div>
            )}

            {/* ── ÉTAPE 3 — DURÉE ── */}
            {step === 3 && (
              <div style={cardStyle}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <Field label="Date de prise d'effet"><TxtIn type="date" value={d.dateEffet} onChange={v => upd('dateEffet', v)} /></Field>
                  <Field label="Date de fin (optionnel — tacite reconduction sinon)"><TxtIn type="date" value={meta.end_date} onChange={v => setMeta(m => ({ ...m, end_date: v }))} /></Field>
                </div>
                <Field label="Durée du contrat">
                  <Radio2 value={d.dureeType} onChange={v => upd('dureeType', v)} options={['3 ans (personne physique)', '6 ans (personne morale)', 'Durée réduite']} />
                </Field>
                {d.dureeType === 'Durée réduite' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <Field label="Durée (années, min. 1 an)"><TxtIn type="number" value={d.dureeReduiteAnnees} onChange={v => upd('dureeReduiteAnnees', v)} placeholder="1" /></Field>
                    <Field label="Événement justifiant la durée réduite" span><TxtArea value={d.dureeReduiteEvenement} onChange={v => upd('dureeReduiteEvenement', v)} placeholder="Raison professionnelle ou familiale précise justifiant la reprise du logement…" /></Field>
                  </div>
                )}
              </div>
            )}

            {/* ── ÉTAPE 4 — CONDITIONS FINANCIÈRES ── */}
            {step === 4 && (
              <div className="flex flex-col gap-5">
                <div style={cardStyle}>
                  <div className="text-[13px] font-bold mb-4" style={{ color: '#10B981' }}>LOYER</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <Field label="Loyer mensuel hors charges (€)"><TxtIn type="number" value={d.loyerMensuel} onChange={v => upd('loyerMensuel', v)} placeholder="650" /></Field>
                    <Field label="Jour d'exigibilité du paiement"><TxtIn value={d.jourExigibilite} onChange={v => upd('jourExigibilite', v)} placeholder="1er du mois" /></Field>
                  </div>
                  <Chk checked={d.zoneTendue} onChange={v => upd('zoneTendue', v)} label="Le logement est situé en zone tendue (encadrement des loyers)" />
                  {d.zoneTendue && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 mb-1">
                      <Field label="Loyer de référence (€/m²)"><TxtIn type="number" value={d.loyerReference} onChange={v => upd('loyerReference', v)} /></Field>
                      <Field label="Loyer de référence majoré (€/m²)"><TxtIn type="number" value={d.loyerReferenceMajore} onChange={v => upd('loyerReferenceMajore', v)} /></Field>
                    </div>
                  )}
                  <div className="mt-2">
                    <Chk checked={d.complementLoyerActif} onChange={v => upd('complementLoyerActif', v)} label="Complément de loyer (caractéristiques exceptionnelles)" />
                    {d.complementLoyerActif && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                        <Field label="Montant (€)"><TxtIn type="number" value={d.complementLoyerMontant} onChange={v => upd('complementLoyerMontant', v)} /></Field>
                        <Field label="Justification"><TxtIn value={d.complementLoyerJustification} onChange={v => upd('complementLoyerJustification', v)} /></Field>
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <Chk checked={d.precedentLocataireMoins18Mois} onChange={v => upd('precedentLocataireMoins18Mois', v)} label="Un locataire a occupé le logement il y a moins de 18 mois" />
                    {d.precedentLocataireMoins18Mois && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                        <Field label="Dernier loyer versé (€)"><TxtIn type="number" value={d.dernierLoyerMontant} onChange={v => upd('dernierLoyerMontant', v)} /></Field>
                        <Field label="Date de dernier versement"><TxtIn type="date" value={d.dernierLoyerDateVersement} onChange={v => upd('dernierLoyerDateVersement', v)} /></Field>
                      </div>
                    )}
                  </div>
                </div>

                <div style={cardStyle}>
                  <div className="text-[13px] font-bold mb-4" style={{ color: '#10B981' }}>RÉVISION & CHARGES</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <Field label="Date de révision annuelle"><TxtIn value={d.revisionDateAnnuelle} onChange={v => upd('revisionDateAnnuelle', v)} placeholder="1er janvier" /></Field>
                    <Field label="Trimestre IRL de référence"><TxtIn value={d.revisionTrimestreIRL} onChange={v => upd('revisionTrimestreIRL', v)} placeholder="T2 2026" /></Field>
                  </div>
                  <div className="mb-4">
                    <Field label="Modalité de règlement des charges">
                      <Radio2 value={d.chargesModalite} onChange={v => upd('chargesModalite', v)}
                        options={['Provisions avec régularisation', 'Paiement périodique sans provision', 'Forfait (colocation)']} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Montant des charges (€/mois)"><TxtIn type="number" value={d.chargesMontant} onChange={v => upd('chargesMontant', v)} placeholder="60" /></Field>
                    <Field label="Total mensuel (loyer + charges)">
                      <div className={inputCls} style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: '#10B981', fontWeight: 800 }}>
                        {((Number(d.loyerMensuel) || 0) + (Number(d.chargesMontant) || 0)).toLocaleString('fr-FR')} €
                      </div>
                    </Field>
                  </div>
                  <div className="mt-4">
                    <Chk checked={d.assuranceCompteColocatairesActif} onChange={v => upd('assuranceCompteColocatairesActif', v)} label="Assurance souscrite par le bailleur pour le compte des colocataires" />
                    {d.assuranceCompteColocatairesActif && (
                      <div className="mt-3 sm:w-1/2">
                        <Field label="Montant annuel récupérable (€)"><TxtIn type="number" value={d.assuranceAnnuelle} onChange={v => upd('assuranceAnnuelle', v)} /></Field>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── ÉTAPE 5 — TRAVAUX ── */}
            {step === 5 && (
              <div className="flex flex-col gap-5">
                <div style={cardStyle}>
                  <div className="text-[13px] font-bold mb-4" style={{ color: '#10B981' }}>TRAVAUX RÉALISÉS PAR LE BAILLEUR</div>
                  <div className="mb-4"><Field label="Nature des travaux (amélioration / mise en décence)"><TxtArea value={d.travauxAmeliorationTexte} onChange={v => upd('travauxAmeliorationTexte', v)} placeholder="Description des travaux effectués depuis la fin du dernier contrat…" /></Field></div>
                  <div className="sm:w-1/2"><Field label="Montant (€)"><TxtIn type="number" value={d.travauxAmeliorationMontant} onChange={v => upd('travauxAmeliorationMontant', v)} /></Field></div>
                </div>
                <div style={cardStyle}>
                  <div className="text-[13px] font-bold mb-4" style={{ color: '#10B981' }}>MAJORATION DE LOYER (TRAVAUX D&apos;AMÉLIORATION)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Nature des travaux"><TxtIn value={d.majorationTravauxNature} onChange={v => upd('majorationTravauxNature', v)} /></Field>
                    <Field label="Majoration mensuelle (€)"><TxtIn type="number" value={d.majorationTravauxMontant} onChange={v => upd('majorationTravauxMontant', v)} /></Field>
                  </div>
                </div>
                <div style={cardStyle}>
                  <div className="text-[13px] font-bold mb-4" style={{ color: '#10B981' }}>TRAVAUX DU LOCATAIRE / DIMINUTION DE LOYER</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Nature des travaux" span><TxtIn value={d.diminutionTravauxNature} onChange={v => upd('diminutionTravauxNature', v)} /></Field>
                    <Field label="Diminution mensuelle (€)"><TxtIn type="number" value={d.diminutionTravauxMontant} onChange={v => upd('diminutionTravauxMontant', v)} /></Field>
                    <Field label="Durée de la diminution"><TxtIn value={d.diminutionTravauxDuree} onChange={v => upd('diminutionTravauxDuree', v)} placeholder="12 mois" /></Field>
                  </div>
                </div>
              </div>
            )}

            {/* ── ÉTAPE 6 — GARANTIES & CLAUSES ── */}
            {step === 6 && (
              <div className="flex flex-col gap-5">
                <div style={cardStyle}>
                  <div className="text-[13px] font-bold mb-4" style={{ color: '#10B981' }}>DÉPÔT DE GARANTIE</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Montant (€ — max. 1 mois de loyer HC)"><TxtIn type="number" value={d.depotGarantie} onChange={v => upd('depotGarantie', v)} placeholder="650" /></Field>
                    <Field label="Montant en toutes lettres"><TxtIn value={d.depotGarantieLettres} onChange={v => upd('depotGarantieLettres', v)} placeholder="six cent cinquante euros" /></Field>
                  </div>
                </div>
                <div style={cardStyle}>
                  <div className="text-[13px] font-bold mb-3" style={{ color: '#10B981' }}>CLAUSES INCLUSES AU CONTRAT</div>
                  <div className="text-[12.5px] mb-3 p-4 rounded-[12px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                    <strong style={{ color: '#fff' }}>Clause de solidarité.</strong> {CLAUSE_SOLIDARITE}
                  </div>
                  <div className="text-[12.5px] p-4 rounded-[12px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                    <strong style={{ color: '#fff' }}>Clause résolutoire.</strong> {CLAUSE_RESOLUTOIRE}
                  </div>
                </div>
                {d.mandataireActif && (
                  <div style={cardStyle}>
                    <div className="text-[13px] font-bold mb-4" style={{ color: '#10B981' }}>HONORAIRES DE LOCATION (MANDATAIRE)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Plafond visite/dossier/rédaction (€/m²)"><TxtIn type="number" value={d.honorairesPlafondVisiteDossierRedaction} onChange={v => upd('honorairesPlafondVisiteDossierRedaction', v)} /></Field>
                      <Field label="Plafond état des lieux (€/m²)"><TxtIn type="number" value={d.honorairesPlafondEtatLieux} onChange={v => upd('honorairesPlafondEtatLieux', v)} /></Field>
                      <Field label="Part bailleur (détail)"><TxtIn value={d.honorairesBailleurDetail} onChange={v => upd('honorairesBailleurDetail', v)} /></Field>
                      <Field label="Part locataire (détail)"><TxtIn value={d.honorairesLocataireDetail} onChange={v => upd('honorairesLocataireDetail', v)} /></Field>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ÉTAPE 7 — CONDITIONS PARTICULIÈRES & ANNEXES ── */}
            {step === 7 && (
              <div className="flex flex-col gap-5">
                <div style={cardStyle}>
                  <Field label="Conditions particulières (règles du logement, consignes…)">
                    <TxtArea rows={5} value={d.conditionsParticulieres} onChange={v => upd('conditionsParticulieres', v)}
                      placeholder="Calme après 22h, tri des déchets, entretien des communs…" />
                  </Field>
                </div>
                <div style={cardStyle}>
                  <div className="text-[13px] font-bold mb-3" style={{ color: '#10B981' }}>ANNEXES JOINTES AU CONTRAT</div>
                  <div className="flex flex-col gap-1">
                    {ANNEXES.map(a => (
                      <Chk key={a} checked={d.annexes.includes(a)}
                        onChange={on => upd('annexes', on ? [...d.annexes, a] : d.annexes.filter(x => x !== a))} label={a} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── ÉTAPE 8 — RÉCAPITULATIF & SIGNATURE ── */}
            {step === 8 && (
              <div className="flex flex-col gap-5">
                {recap.map(([section, rows]) => (
                  <div key={section} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                    <div className="px-6 py-3.5 text-[12px] font-extrabold uppercase tracking-wider"
                      style={{ color: '#10B981', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{section}</div>
                    {rows.map(([k, v], i) => (
                      <div key={k} className="flex items-start justify-between gap-4 px-6 py-2.5 text-[13px]"
                        style={{ borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <span style={{ color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>{k}</span>
                        <span className="font-semibold text-right" style={{ color: '#fff', maxWidth: '62%' }}>{v || '—'}</span>
                      </div>
                    ))}
                  </div>
                ))}

                <div style={cardStyle}>
                  <div className="text-[14px] font-bold mb-1" style={{ color: '#fff' }}>Signature du bailleur</div>
                  <p className="text-[12px] mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Vous signez en premier ; le locataire signera ensuite depuis son espace.
                  </p>
                  <div className="rounded-[14px] p-3" style={{ background: '#fff' }}>
                    <SignatureCanvas ref={sigRef} label="Votre signature (doigt ou souris)" />
                  </div>
                  <div className="mt-4">
                    <Chk checked={consent} onChange={setConsent} label="J'ai lu et j'accepte les termes du présent contrat de location." />
                  </div>
                  <p className="text-[11.5px] mt-4 mb-0 px-4 py-3 rounded-[10px]"
                    style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                    <Emoji native="🔏" size="12px" /> Signature électronique simple au sens du règlement eIDAS.
                    Horodatage et adresse IP conservés comme preuve de consentement. Exemplaires originaux dont un remis à chaque signataire.
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {error && <p className="text-[12.5px] mt-4 mb-0" style={{ color: '#EF4444' }}>{error}</p>}

          {/* Navigation */}
          <div className="flex items-center gap-3 mt-6">
            {step > 1 && <Button variant="secondary" onClick={() => { setError(''); setStep(s => s - 1) }}>← Retour</Button>}
            {step < 8 && <Button onClick={next}>Continuer →</Button>}
            {step === 8 && (
              <Button onClick={handleSubmit} loading={submitting} disabled={!consent}>
                <Emoji native="📄" size="14px" /> Générer et envoyer pour signature
              </Button>
            )}
            <Button variant="ghost" onClick={() => router.back()}>Annuler</Button>
          </div>
        </div>
      </div>
    </>
  )
}
