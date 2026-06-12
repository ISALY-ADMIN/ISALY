'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem('isaly_pwa_dismissed')
    if (dismissed) return

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isStandalone) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window.navigator as unknown as { standalone?: boolean }).standalone
    setIsIOS(ios)

    const timer = setTimeout(() => setShow(true), 30000)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      clearTimeout(timer)
      setTimeout(() => setShow(true), 30000)
    }
    window.addEventListener('beforeinstallprompt', handler)

    return () => { clearTimeout(timer); window.removeEventListener('beforeinstallprompt', handler) }
  }, [])

  function dismiss() {
    localStorage.setItem('isaly_pwa_dismissed', '1')
    setShow(false)
  }

  async function install() {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferredPrompt(null)
    }
    setShow(false)
    localStorage.setItem('isaly_pwa_dismissed', '1')
  }

  if (!show || installed) return null

  return (
    <div
      style={{
        position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 200, width: 'calc(100% - 32px)', maxWidth: '400px',
        background: '#111111', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '20px', padding: '20px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        animation: 'slideUp 0.35s cubic-bezier(.34,1.56,.64,1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <img src="/favicon.png" alt="ISALY" style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
            Installer ISALY
          </div>
          {isIOS ? (
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.55)', margin: '0 0 14px', lineHeight: 1.5 }}>
              Appuie sur <span style={{ color: '#10B981', fontWeight: 600 }}>Partager</span> puis <span style={{ color: '#10B981', fontWeight: 600 }}>Sur l'écran d'accueil</span> pour installer l'app.
            </p>
          ) : (
            <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.55)', margin: '0 0 14px', lineHeight: 1.5 }}>
              Accès rapide depuis ton téléphone — aucun app store requis.
            </p>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isIOS && (
              <button
                onClick={install}
                style={{ flex: 1, padding: '9px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Installer
              </button>
            )}
            <button
              onClick={dismiss}
              style={{ flex: isIOS ? 1 : undefined, padding: '9px 14px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}
            >
              {isIOS ? 'Compris' : 'Plus tard'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
