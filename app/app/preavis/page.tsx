'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Topbar from '@/components/layout/Topbar'
import Button from '@/components/ui/Button'
import Emoji from '@/components/ui/Emoji'
import { BentoStyles, cardBase } from '@/components/ui/Bento'
import {
  DELAI_PREAVIS_MOIS,
  TYPE_LOGEMENT_LABEL,
  computeDateFinEffective,
  formatDateFr,
  toDateKey,
  type TypeLogement,
} from '@/lib/preavis'

/**
 * Déclaration de préavis par le locataire (C2).
 *
 * Acte engageant : deux étapes obligatoires. L'écran affiche d'abord la date de
 * fin calculée par le serveur, puis demande une confirmation explicite. La date
 * de déclaration n'est jamais saisie ici — elle est posée par l'API.
 */

interface PreavisState {
  lease: { id: string; address: string | null; city: string | null; monthly_rent: number | null; end_date: string | null } | null
  type_logement: TypeLogement | null
  preview: { type_logement: TypeLogement; delai_mois: number; date_fin_effective: string } | null
  preavis: {
    id: string
    date_declaration: string
    date_fin_effective: string
    type_logement: TypeLogement
    delai_mois: number
    status: string
  } | null
}

const TXT = 'rgba(255,255,255,0.7)'
const TXT_FAINT = 'rgba(255,255,255,0.45)'

export default function PreavisPage() {
  const [state, setState] = useState<PreavisState | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<'idle' | 'confirm'>('idle')
  const [declaredType, setDeclaredType] = useState<TypeLogement | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/preavis', { cache: 'no-store' })
      const json = await res.json()
      setState(json as PreavisState)
    } catch {
      setError('Impossible de charger votre bail pour le moment.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Régime retenu : celui du bail s'il est connu, sinon celui déclaré ici.
  const effectiveType: TypeLogement | null = state?.type_logement ?? (declaredType || null)

  // Aperçu local quand le serveur n'a pas pu le calculer (régime inconnu) :
  // même règle que lib/preavis.ts, recalculée côté serveur à la confirmation.
  const previewDate = state?.preview?.date_fin_effective
    ?? (effectiveType ? toDateKey(computeDateFinEffective(new Date(), effectiveType)) : null)
  const previewDelai = effectiveType ? DELAI_PREAVIS_MOIS[effectiveType] : null

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/preavis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lease_id: state?.lease?.id,
          type_logement: state?.type_logement ?? (declaredType || undefined),
          confirm: true,
        }),
      })
      const json = await res.json()
      if (!res.ok) setError(json.error ?? 'La déclaration n’a pas pu être enregistrée.')
      else { setStep('idle'); await load() }
    } catch {
      setError('La déclaration n’a pas pu être enregistrée.')
    }
    setSubmitting(false)
  }

  async function cancel() {
    if (!state?.preavis) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/preavis', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: state.preavis.id }),
      })
      const json = await res.json()
      if (!res.ok) setError(json.error ?? 'L’annulation n’a pas pu être enregistrée.')
      else await load()
    } catch {
      setError('L’annulation n’a pas pu être enregistrée.')
    }
    setSubmitting(false)
  }

  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Topbar title="Mon préavis" />
      <BentoStyles />
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px 48px', fontFamily: "'Outfit', sans-serif" }}>
        <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Mon préavis</h1>
          <p style={{ fontSize: '13.5px', color: TXT_FAINT, margin: 0 }}>
            Déclarer mon départ du logement et fixer la date de fin de bail.
          </p>
        </motion.div>
        {children}
      </div>
    </div>
  )

  if (loading) {
    return shell(<div style={{ ...cardBase, color: TXT_FAINT, fontSize: '13.5px' }}>Chargement…</div>)
  }

  // ── Aucun bail actif ──
  if (!state?.lease) {
    return shell(
      <div style={{ ...cardBase, alignItems: 'flex-start', gap: '12px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: 0 }}>Aucun bail actif</h2>
        <p style={{ fontSize: '13.5px', color: TXT, margin: 0, lineHeight: 1.6 }}>
          Le préavis se déclare depuis un bail en cours. Dès qu’un bail est actif à votre nom, il apparaît ici.
        </p>
        <Link href="/app/maison" className="no-underline">
          <Button variant="secondary" size="sm">Retour à Ma maison</Button>
        </Link>
      </div>,
    )
  }

  const address = `${state.lease.address ?? ''}${state.lease.city ? `, ${state.lease.city}` : ''}`

  // ── Préavis déjà déposé ──
  if (state.preavis) {
    const p = state.preavis
    const past = p.date_fin_effective < new Date().toISOString().slice(0, 10)
    return shell(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ ...cardBase, alignItems: 'flex-start', gap: '10px', border: '1px solid rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.06)' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.08em', color: '#F59E0B' }}>
            <Emoji native="📤" size="13px" /> PRÉAVIS EN COURS
          </span>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.35 }}>
            Vous quitterez le logement le {formatDateFr(p.date_fin_effective)}
          </h2>
          <p style={{ fontSize: '13.5px', color: TXT, margin: 0, lineHeight: 1.6 }}>
            {address} — déclaré le {formatDateFr(p.date_declaration)}, logement {TYPE_LOGEMENT_LABEL[p.type_logement]},
            préavis légal de {p.delai_mois} mois.
          </p>
          <p style={{ fontSize: '12.5px', color: TXT_FAINT, margin: 0, lineHeight: 1.6 }}>
            Votre loueur en a été informé. À cette date, votre part de commission ISALY s’arrête automatiquement.
            {' '}Si vous vivez en colocation, celle de vos colocataires n’est pas affectée.
          </p>
        </div>

        <div style={{ ...cardBase, alignItems: 'flex-start', gap: '10px' }}>
          <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#fff', margin: 0 }}>Changer d’avis</h3>
          <p style={{ fontSize: '13px', color: TXT, margin: 0, lineHeight: 1.6 }}>
            {past
              ? 'La date de fin est dépassée : le retrait du préavis ne peut plus se faire depuis l’application. Contactez votre loueur.'
              : 'Vous pouvez retirer votre préavis tant que la date de fin n’est pas atteinte. Votre loueur en sera informé.'}
          </p>
          {!past && (
            <Button variant="danger" size="sm" onClick={cancel} loading={submitting} disabled={submitting}>
              Retirer mon préavis
            </Button>
          )}
        </div>

        {error && <ErrorNote text={error} />}
      </div>,
    )
  }

  // ── Étape 2 : confirmation ──
  if (step === 'confirm' && previewDate && previewDelai) {
    return shell(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ ...cardBase, alignItems: 'flex-start', gap: '14px', border: '1px solid rgba(16,185,129,0.35)' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.08em', color: '#10B981' }}>
            CONFIRMATION
          </span>
          <h2 style={{ fontSize: '21px', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.35 }}>
            Vous quitterez le logement le {formatDateFr(previewDate)}
          </h2>
          <p style={{ fontSize: '13.5px', color: TXT, margin: 0, lineHeight: 1.7 }}>
            {address}<br />
            Logement {effectiveType ? TYPE_LOGEMENT_LABEL[effectiveType] : ''} — préavis légal de {previewDelai} mois,
            décompté à partir d’aujourd’hui, {formatDateFr(new Date())}.
          </p>
          <p style={{ fontSize: '12.5px', color: TXT_FAINT, margin: 0, lineHeight: 1.6 }}>
            En confirmant, votre loueur reçoit immédiatement une notification et un email indiquant cette date.
            Votre part de commission ISALY s’arrête automatiquement à cette date — pas avant.
            Vous pourrez retirer ce préavis tant que la date n’est pas atteinte.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button onClick={submit} loading={submitting} disabled={submitting}>
              Je confirme mon préavis
            </Button>
            <Button variant="ghost" size="md" onClick={() => setStep('idle')} disabled={submitting}>
              Revenir en arrière
            </Button>
          </div>
        </div>
        {error && <ErrorNote text={error} />}
      </div>,
    )
  }

  // ── Étape 1 : information + déclenchement ──
  return shell(
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ ...cardBase, alignItems: 'flex-start', gap: '12px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: 0 }}>{address}</h2>
        <p style={{ fontSize: '13.5px', color: TXT, margin: 0, lineHeight: 1.7 }}>
          Donner son préavis, c’est annoncer officiellement son départ. Le délai légal court à partir du jour
          de la déclaration : <strong style={{ color: '#fff' }}>1 mois</strong> pour un logement meublé,
          {' '}<strong style={{ color: '#fff' }}>3 mois</strong> pour un logement non meublé.
        </p>
        {state.lease.end_date && (
          <p style={{ fontSize: '12.5px', color: TXT_FAINT, margin: 0 }}>
            Fin de bail prévue au contrat : {formatDateFr(state.lease.end_date)}. Sans préavis, la commission
            s’arrête d’elle-même à cette date.
          </p>
        )}
      </div>

      {/* Régime inconnu : ni le bail ni l'annonce ne le portent — on le demande
          plutôt que de supposer, le délai passe du simple au triple. */}
      {!state.type_logement && (
        <div style={{ ...cardBase, alignItems: 'flex-start', gap: '12px' }}>
          <h3 style={{ fontSize: '14.5px', fontWeight: 700, color: '#fff', margin: 0 }}>
            Votre logement est-il meublé ?
          </h3>
          <p style={{ fontSize: '12.5px', color: TXT_FAINT, margin: 0, lineHeight: 1.6 }}>
            Cette information n’est pas renseignée sur votre bail. Elle détermine votre délai de préavis.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {(['meuble', 'non_meuble'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setDeclaredType(t)}
                style={{
                  padding: '10px 18px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: '13px', fontWeight: 700,
                  color: declaredType === t ? '#fff' : TXT,
                  background: declaredType === t ? 'rgba(16,185,129,0.16)' : 'transparent',
                  border: `1px solid ${declaredType === t ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.15)'}`,
                }}
              >
                {t === 'meuble' ? '🛋 Meublé — 1 mois' : 'Non meublé — 3 mois'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ ...cardBase, alignItems: 'flex-start', gap: '12px' }}>
        <Button
          onClick={() => { setError(null); setStep('confirm') }}
          disabled={!effectiveType}
        >
          <Emoji native="📤" size="14px" /> Donner mon préavis
        </Button>
        <p style={{ fontSize: '12px', color: TXT_FAINT, margin: 0 }}>
          {effectiveType
            ? 'La date exacte vous sera affichée avant toute confirmation.'
            : 'Indiquez d’abord si le logement est meublé.'}
        </p>
      </div>

      {error && <ErrorNote text={error} />}
    </div>,
  )
}

function ErrorNote({ text }: { text: string }) {
  return (
    <div style={{
      padding: '12px 16px', borderRadius: '10px', fontSize: '13px',
      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171',
    }}>
      {text}
    </div>
  )
}

