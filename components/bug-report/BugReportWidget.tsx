'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Bug, X, Send, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/**
 * Widget de signalement de bug — bêta.
 *
 * Bouton flottant discret (bas-droit) monté une seule fois dans le layout
 * /app/*, donc présent sur toutes les pages sans duplication. Au clic : modal
 * compacte avec une description libre, le reste du contexte (URL, user agent,
 * résolution) étant capturé automatiquement en arrière-plan.
 *
 * Passer BETA_BUG_REPORT à false retire le widget sans toucher au layout.
 */
const BETA_BUG_REPORT: boolean = true

const MAX_DESCRIPTION = 2000

interface BrowserContext {
  screen: { width: number; height: number }
  viewport: { width: number; height: number }
  dpr: number
  language: string
  timezone: string
  online: boolean
  referrer: string | null
  captured_at: string
}

/** Contexte technique capturé silencieusement au moment de l'envoi. */
function captureBrowserContext(): BrowserContext {
  return {
    screen: { width: window.screen?.width ?? 0, height: window.screen?.height ?? 0 },
    viewport: { width: window.innerWidth, height: window.innerHeight },
    dpr: window.devicePixelRatio ?? 1,
    language: navigator.language ?? '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
    online: navigator.onLine,
    referrer: document.referrer || null,
    captured_at: new Date().toISOString(),
  }
}

export default function BugReportWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = useCallback(() => {
    setOpen(false)
    // Laisse l'animation de sortie se jouer avant de réarmer le formulaire.
    setTimeout(() => { setDescription(''); setSent(false); setError(null) }, 250)
  }, [])

  // Échap pour fermer, cohérent avec les autres modals du projet.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  async function submit() {
    const text = description.trim()
    if (!text || sending) return

    setSending(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { error: insertError } = await supabase.from('bug_reports').insert({
        // Null si non connecté : la policy RLS l'autorise explicitement.
        user_id: user?.id ?? null,
        description: text.slice(0, MAX_DESCRIPTION),
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        browser_context: captureBrowserContext(),
      })

      if (insertError) throw insertError

      setSent(true)
      setTimeout(close, 2600)
    } catch {
      setError("L'envoi a échoué. Réessaie dans un instant.")
    } finally {
      setSending(false)
    }
  }

  if (!BETA_BUG_REPORT) return null

  return (
    <>
      {/* ── Bouton flottant ──
          Pilule icône + libellé à partir de `sm`, cercle 44px en dessous : sur
          mobile la largeur est trop précieuse pour un élément permanent, et
          aria-label/title portent alors seuls l'intitulé.
          Fond translucide mint plutôt qu'aplat #10B981 : le bouton est visible
          sur toutes les pages /app/*, il doit rester lisible sans concurrencer
          les vraies actions (swipe, candidature…). */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Signaler un bug"
        title="Signaler un bug"
        className="fixed flex items-center justify-center gap-2 cursor-pointer transition-all w-11 sm:w-auto px-0 sm:px-4"
        style={{
          right: '20px', bottom: '20px', zIndex: 60,
          height: '44px', borderRadius: '9999px',
          background: 'rgba(16,185,129,0.10)',
          border: '1px solid rgba(16,185,129,0.28)',
          backdropFilter: 'blur(12px)',
          color: '#10B981',
          boxShadow: '0 6px 22px rgba(0,0,0,0.35)',
          opacity: open ? 0 : 1,
          pointerEvents: open ? 'none' : 'auto',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(16,185,129,0.18)'
          e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(16,185,129,0.10)'
          e.currentTarget.style.borderColor = 'rgba(16,185,129,0.28)'
        }}
      >
        <Bug size={17} />
        <span
          className="hidden sm:inline"
          style={{
            fontFamily: "'Outfit', sans-serif", fontSize: '13.5px',
            fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '-0.1px',
          }}
        >
          Signaler un bug
        </span>
      </button>

      {/* ── Modal ── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="fixed inset-0"
              style={{ zIndex: 70, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Signaler un bug"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="fixed flex flex-col overflow-hidden"
              style={{
                zIndex: 71,
                // Ancrée sur le bouton : la modal semble en sortir.
                right: '20px', bottom: '20px',
                width: 'min(400px, calc(100vw - 40px))',
                maxHeight: 'calc(100vh - 40px)',
                borderRadius: '20px',
                background: 'rgba(17,17,17,0.92)',
                border: '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {/* En-tête */}
              <div
                className="flex items-center justify-between flex-shrink-0"
                style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center gap-2.5">
                  <Bug size={16} style={{ color: '#10B981' }} />
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff', letterSpacing: '-0.2px' }}>
                    Signaler un bug
                  </span>
                </div>
                <button
                  onClick={close}
                  aria-label="Fermer"
                  className="flex items-center justify-center border-none cursor-pointer rounded-full"
                  style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                >
                  <X size={14} />
                </button>
              </div>

              {sent ? (
                /* ── État de succès ── */
                <div className="flex flex-col items-center text-center" style={{ padding: '32px 24px' }}>
                  <CheckCircle2 size={38} style={{ color: '#10B981', marginBottom: '14px' }} />
                  <div style={{ fontSize: '15.5px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
                    Merci ! Ton signalement a été transmis.
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                    On regarde ça au plus vite.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col" style={{ padding: '16px 18px 18px' }}>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Décris ce qui ne fonctionne pas..."
                    autoFocus
                    maxLength={MAX_DESCRIPTION}
                    rows={5}
                    className="w-full outline-none resize-none transition-colors"
                    style={{
                      padding: '12px 14px', borderRadius: '14px', fontSize: '14px', lineHeight: 1.55,
                      boxSizing: 'border-box', fontFamily: "'Outfit', sans-serif",
                      background: 'rgba(255,255,255,0.05)',
                      border: '1.5px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                    }}
                    onFocus={e => (e.target.style.borderColor = '#10B981')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />

                  {/* Contexte capturé — transparence sur ce qui part avec le ticket */}
                  <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.35)', margin: '10px 2px 0', lineHeight: 1.5 }}>
                    Page, navigateur et taille d&apos;écran sont joints automatiquement.
                    <br />
                    <span style={{ color: 'rgba(255,255,255,0.28)' }}>{pathname}</span>
                  </div>

                  {error && (
                    <div style={{ fontSize: '12.5px', color: '#EF4444', margin: '10px 2px 0' }}>{error}</div>
                  )}

                  <button
                    onClick={submit}
                    disabled={!description.trim() || sending}
                    className="flex items-center justify-center gap-2 w-full border-none transition-all"
                    style={{
                      marginTop: '14px', padding: '13px', borderRadius: '14px',
                      fontSize: '14.5px', fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: '#fff',
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      opacity: !description.trim() || sending ? 0.45 : 1,
                      cursor: !description.trim() || sending ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Send size={15} />
                    {sending ? 'Envoi…' : 'Envoyer le signalement'}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
