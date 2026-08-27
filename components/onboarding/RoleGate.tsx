'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { canSwitchMode, ROLE_CHOICES, type UserRoleMode } from '@/lib/roles'
import Emoji from '@/components/ui/Emoji'

/**
 * Garde de rôle — comptes existants.
 *
 * Tout compte créé avant la question d'onboarding a `role_confirmed_at = NULL`,
 * qu'il ait déjà un `role` hérité ou non (notamment ceux que le pivot 100%
 * locataire avait forcés à 'locataire' sans jamais leur demander). Ce composant,
 * monté une fois dans le layout /app/*, leur repose la question sous forme de
 * modal bloquante : pas de fermeture, pas d'échappement, tant qu'ils n'ont pas
 * répondu une fois.
 *
 * Le compte à double vue en est dispensé — il voit les deux panneaux.
 */
export default function RoleGate() {
  const router = useRouter()
  const [needsAnswer, setNeedsAnswer] = useState(false)
  const [choice, setChoice] = useState<UserRoleMode | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      // Le compte à double vue n'est jamais bloqué.
      if (canSwitchMode(user.email)) return

      const { data, error: qError } = await supabase
        .from('profiles')
        .select('role_confirmed_at')
        .eq('id', user.id)
        .single()

      // Colonne absente (migration 37 pas encore jouée) : on ne bloque personne.
      if (qError || cancelled || !data) return

      if (!data.role_confirmed_at) setNeedsAnswer(true)
    }

    check()
    return () => { cancelled = true }
  }, [])

  // Modal bloquante : on neutralise le défilement de la page derrière.
  useEffect(() => {
    if (!needsAnswer) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [needsAnswer])

  async function submit() {
    if (!choice || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: choice }),
      })
      if (!res.ok) throw new Error()
      setNeedsAnswer(false)
      // Recharge la navigation et le dashboard dans la variante du rôle choisi.
      router.refresh()
    } catch {
      setError("L'enregistrement a échoué. Réessaie dans un instant.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {needsAnswer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 90, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', padding: '20px' }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Choisis ton profil"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{
              width: 'min(520px, 100%)',
              maxHeight: 'calc(100vh - 40px)',
              overflowY: 'auto',
              borderRadius: '24px',
              background: 'rgba(17,17,17,0.96)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
              padding: '32px',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            <div style={{ fontSize: '21px', fontWeight: 700, color: '#fff', letterSpacing: '-0.4px', marginBottom: '6px' }}>
              Tu es plutôt…
            </div>
            <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: '22px' }}>
              ISALY s&apos;adapte à ton profil. Cette réponse détermine ce que tu vois dans
              l&apos;application — tu ne la donneras qu&apos;une fois.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {ROLE_CHOICES.map(r => {
                const selected = choice === r.value
                return (
                  <button
                    key={r.value}
                    onClick={() => setChoice(r.value)}
                    aria-pressed={selected}
                    className="cursor-pointer transition-all text-left"
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '14px',
                      padding: '16px 18px', borderRadius: '16px',
                      border: `1.5px solid ${selected ? '#10B981' : 'rgba(255,255,255,0.10)'}`,
                      background: selected ? 'rgba(16,185,129,0.10)' : 'rgba(255,255,255,0.04)',
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    <span style={{ fontSize: '24px', lineHeight: 1, flexShrink: 0 }}>
                      <Emoji native={r.emoji} size="24px" />
                    </span>
                    <span>
                      <span style={{ display: 'block', fontSize: '14.5px', fontWeight: 700, color: selected ? '#10B981' : '#fff' }}>
                        {r.title}
                      </span>
                      <span style={{ display: 'block', fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', marginTop: '3px', lineHeight: 1.5 }}>
                        {r.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>

            {error && (
              <div style={{ fontSize: '12.5px', color: '#F59E0B', marginBottom: '12px' }}>{error}</div>
            )}

            <button
              onClick={submit}
              disabled={!choice || saving}
              className="flex items-center justify-center gap-2 w-full border-none transition-all"
              style={{
                padding: '14px', borderRadius: '14px', fontSize: '14.5px', fontWeight: 700,
                fontFamily: "'Outfit', sans-serif", color: '#fff',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                opacity: !choice || saving ? 0.45 : 1,
                cursor: !choice || saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving && <Loader2 size={15} className="rolegate-spin" />}
              {saving ? 'Enregistrement…' : 'Continuer'}
            </button>

            <style>{`
              @keyframes rolegate-spin { to { transform: rotate(360deg); } }
              .rolegate-spin { animation: rolegate-spin 1s linear infinite; }
            `}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
