'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import SignatureCanvas, { SignatureCanvasHandle } from '@/components/documents/SignatureCanvas'
import type { BailFormData } from '@/lib/bailPdf'

interface DocPayload {
  id: string
  status: string
  bail_data: BailFormData
  owner_signature: string | null
  owner_signed_at: string | null
  tenant_signed_at: string | null
}

export default function PublicBailSignPage() {
  const params = useParams()
  const token = params.token as string
  const sigRef = useRef<SignatureCanvasHandle>(null)

  const [doc, setDoc] = useState<DocPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/bail-signature/${token}`)
        if (!res.ok) { setError('Lien invalide ou expiré.'); setLoading(false); return }
        const json = await res.json()
        setDoc(json.document)
      } catch {
        setError('Une erreur est survenue.')
      }
      setLoading(false)
    }
    load()
  }, [token])

  async function handleSign() {
    if (!sigRef.current || sigRef.current.isEmpty()) { setError('Merci de signer avant de valider.'); return }
    setSubmitting(true)
    setError('')
    try {
      const signature = sigRef.current.toDataURL()
      const res = await fetch(`/api/bail-signature/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature }),
      })
      if (!res.ok) { const j = await res.json(); setError(j.error ?? 'Erreur lors de la signature.'); setSubmitting(false); return }
      setDone(true)
    } catch {
      setError('Une erreur est survenue.')
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '44px' }}>📄</div>
      </div>
    )
  }

  if (error && !doc) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: '420px', padding: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px' }}>{error}</p>
          <Link href="/" style={{ color: '#10B981', fontSize: '14px', fontWeight: 600 }}>Retour à l&apos;accueil</Link>
        </div>
      </div>
    )
  }

  const alreadySigned = doc?.status === 'signed' || !!doc?.tenant_signed_at || done
  const data = doc?.bail_data

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', fontFamily: "'Outfit', sans-serif", padding: '40px 20px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Contrat de location</h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '28px' }}>
          Merci de relire les informations ci-dessous avant de signer électroniquement.
        </p>

        {data && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
            {[
              ['Bailleur', data.bailleurNom],
              ['Locataire(s)', data.locataireNoms],
              ['Adresse du logement', data.adresse],
              ['Loyer mensuel', `${data.loyerMensuel} €`],
              ['Charges', `${data.chargesType} — ${data.chargesMontant} €`],
              ['Dépôt de garantie', `${data.depotGarantie} €`],
              ["Date de prise d'effet", data.dateEffet],
              ['Durée', data.duree],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '13.5px' }}>
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</span>
                <span style={{ color: '#fff', fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {doc?.owner_signature && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Signature du bailleur</div>
            <img src={doc.owner_signature} alt="Signature bailleur" style={{ background: '#fff', borderRadius: '10px', maxWidth: '220px' }} />
          </div>
        )}

        {alreadySigned ? (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>✅</div>
            <p style={{ color: '#10B981', fontWeight: 700, fontSize: '15px' }}>Bail signé avec succès</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px' }}>Votre propriétaire a été notifié.</p>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Votre signature</div>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '8px' }}>
              <SignatureCanvas ref={sigRef} label="Signez ci-dessous" />
            </div>
            {error && <p style={{ color: '#EF4444', fontSize: '12.5px', marginTop: '8px' }}>{error}</p>}
            <button
              onClick={handleSign}
              disabled={submitting}
              style={{
                marginTop: '16px', width: '100%', padding: '13px', borderRadius: '50px', border: 'none',
                background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)', color: '#fff', fontWeight: 700,
                fontSize: '14px', cursor: 'pointer', opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? 'Signature en cours…' : '✍️ Signer le bail'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
