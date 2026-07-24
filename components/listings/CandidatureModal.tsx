'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ArrowLeft, ArrowRight, Check, MessageSquareHeart, CalendarDays,
  Clock3, Briefcase, ShieldCheck, Users, Sparkles, ExternalLink,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { EMPLOI_OPTIONS, LEASE_DURATION_OPTIONS } from '@/lib/candidatures'
import type { EmploiSituation } from '@/types/database'

const OUTFIT = "'Outfit', sans-serif"
const MINT = '#10B981'

interface CandidatureDraft {
  motivation: string
  moveInDate: string
  leaseDuration: string
  emploi: EmploiSituation | null
  hasGarant: boolean | null
  colocataires: number
}

const EMPTY: CandidatureDraft = {
  motivation: '', moveInDate: '', leaseDuration: '', emploi: null, hasGarant: null, colocataires: 0,
}

// ─── Petits sous-composants ──────────────────────────────────
function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{
          width: i === step ? 22 : 7, height: 7, borderRadius: 4,
          background: i <= step ? MINT : 'rgba(255,255,255,0.14)',
          transition: 'all 0.25s ease',
        }} />
      ))}
    </div>
  )
}

function FieldLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px',
      fontFamily: OUTFIT, fontSize: '13.5px', fontWeight: 700, color: '#fff',
    }}>
      <span style={{ color: MINT, display: 'inline-flex' }}>{icon}</span>
      {children}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        padding: '9px 14px', borderRadius: '10px', cursor: 'pointer',
        fontFamily: OUTFIT, fontSize: '13px', fontWeight: 600,
        background: active ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? 'rgba(16,185,129,0.45)' : 'rgba(255,255,255,0.1)'}`,
        color: active ? MINT : 'rgba(255,255,255,0.7)',
        transition: 'all 0.15s ease', display: 'inline-flex', alignItems: 'center', gap: '7px',
      }}
    >{children}</button>
  )
}

// ─── Modal ───────────────────────────────────────────────────
export default function CandidatureModal({
  listingId, listingTitle, onClose, onSubmitted,
}: {
  listingId: string
  listingTitle: string
  onClose: () => void
  onSubmitted: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<CandidatureDraft>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const TOTAL = 3
  const set = <K extends keyof CandidatureDraft>(k: K, v: CandidatureDraft[K]) =>
    setDraft(d => ({ ...d, [k]: v }))

  async function submit() {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/candidatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          motivation_message: draft.motivation || null,
          move_in_date: draft.moveInDate || null,
          lease_duration: draft.leaseDuration || null,
          emploi_situation: draft.emploi,
          has_garant: draft.hasGarant,
          colocataires_count: draft.colocataires > 0 ? draft.colocataires : null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Erreur lors de l’envoi')
      onSubmitted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
      setBusy(false)
    }
  }

  if (!mounted) return null

  const stepTitles = ['Votre motivation', 'Votre projet de bail', 'Garanties & finalisation']

  const body = (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto',
          background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '24px', padding: '26px', position: 'relative',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px',
              fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px', color: MINT,
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.28)',
              padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase',
            }}>
              <Sparkles size={11} strokeWidth={2.4} /> Candidature
            </div>
            <h2 style={{ fontFamily: OUTFIT, fontSize: '19px', fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.25 }}>
              {stepTitles[step]}
            </h2>
            <div style={{
              fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', marginTop: '4px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '380px',
            }}>
              {listingTitle}
            </div>
          </div>
          <button
            type="button" onClick={onClose} aria-label="Fermer"
            style={{
              flexShrink: 0, width: 34, height: 34, borderRadius: '10px', cursor: 'pointer',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          ><X size={16} /></button>
        </div>

        <div style={{ marginBottom: '22px' }}><StepDots step={step} total={TOTAL} /></div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}
          >
            {step === 0 && (
              <>
                <div>
                  <FieldLabel icon={<MessageSquareHeart size={15} strokeWidth={2} />}>
                    Message de motivation <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>· optionnel</span>
                  </FieldLabel>
                  <textarea
                    value={draft.motivation}
                    onChange={e => set('motivation', e.target.value.slice(0, 1000))}
                    placeholder="Présentez-vous en quelques lignes : qui vous êtes, pourquoi cette colocation vous plaît…"
                    rows={5}
                    style={{
                      width: '100%', resize: 'vertical', minHeight: '120px',
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '14px', padding: '14px', color: '#fff', fontFamily: OUTFIT,
                      fontSize: '13.5px', lineHeight: 1.55, outline: 'none',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.45)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                  />
                  <div style={{ textAlign: 'right', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                    {draft.motivation.length}/1000
                  </div>
                </div>
                <div>
                  <FieldLabel icon={<CalendarDays size={15} strokeWidth={2} />}>Date d’emménagement souhaitée</FieldLabel>
                  <input
                    type="date"
                    value={draft.moveInDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={e => set('moveInDate', e.target.value)}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px', padding: '12px 14px', color: '#fff', fontFamily: OUTFIT,
                      fontSize: '13.5px', outline: 'none', colorScheme: 'dark',
                    }}
                  />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div>
                  <FieldLabel icon={<Clock3 size={15} strokeWidth={2} />}>Durée de bail envisagée</FieldLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {LEASE_DURATION_OPTIONS.map(o => (
                      <Chip key={o.value} active={draft.leaseDuration === o.value} onClick={() => set('leaseDuration', o.value)}>
                        {o.label}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <FieldLabel icon={<Briefcase size={15} strokeWidth={2} />}>Situation professionnelle</FieldLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {EMPLOI_OPTIONS.map(o => (
                      <Chip key={o.value} active={draft.emploi === o.value} onClick={() => set('emploi', o.value)}>
                        <span>{o.emoji}</span> {o.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <FieldLabel icon={<ShieldCheck size={15} strokeWidth={2} />}>Avez-vous un garant ?</FieldLabel>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Chip active={draft.hasGarant === true} onClick={() => set('hasGarant', true)}>Oui</Chip>
                    <Chip active={draft.hasGarant === false} onClick={() => set('hasGarant', false)}>Non</Chip>
                  </div>
                  {draft.hasGarant === true && (
                    <Link
                      href="/app/dossier"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '10px',
                        fontSize: '12px', fontWeight: 600, color: MINT, textDecoration: 'none',
                      }}
                    >
                      <ExternalLink size={12} strokeWidth={2} /> Ajouter votre garant digital au dossier
                    </Link>
                  )}
                </div>
                <div>
                  <FieldLabel icon={<Users size={15} strokeWidth={2} />}>
                    Colocataires avec vous <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>· optionnel</span>
                  </FieldLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {[0, 1, 2, 3, 4].map(n => (
                      <Chip key={n} active={draft.colocataires === n} onClick={() => set('colocataires', n)}>
                        {n === 0 ? 'Seul·e' : `+${n}`}
                      </Chip>
                    ))}
                  </div>
                </div>
                {error && (
                  <div style={{
                    fontSize: '12.5px', color: '#F87171', background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 12px',
                  }}>{error}</div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer nav */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '26px' }}>
          {step > 0 && (
            <Button variant="ghost" size="md" onClick={() => setStep(s => s - 1)} disabled={busy}>
              <ArrowLeft size={15} strokeWidth={2} /> Retour
            </Button>
          )}
          <div style={{ flex: 1 }} />
          {step < TOTAL - 1 ? (
            <Button variant="primary" size="md" onClick={() => setStep(s => s + 1)}>
              Continuer <ArrowRight size={15} strokeWidth={2} />
            </Button>
          ) : (
            <Button variant="primary" size="md" onClick={submit} loading={busy}>
              <Check size={15} strokeWidth={2.4} /> Envoyer ma candidature
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )

  return createPortal(<AnimatePresence>{body}</AnimatePresence>, document.body)
}
