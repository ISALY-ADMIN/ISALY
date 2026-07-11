'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'isaly_pwa_banner_dismissed'

/**
 * Bannière "Installer l'app" — mobile uniquement.
 * Android/Chrome : bouton natif via beforeinstallprompt.
 * iOS Safari : instructions manuelles (pas d'API d'installation).
 */
export default function InstallBanner() {
  const [visible, setVisible] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) return
    } catch { return }

    // Déjà installée (standalone) → rien à afficher
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if ((navigator as unknown as { standalone?: boolean }).standalone) return
    // Mobile uniquement
    if (window.innerWidth >= 768) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIos(ios)

    if (ios) {
      setVisible(true)
      return
    }

    function onPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function dismiss() {
    setVisible(false)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setVisible(false)
    else dismiss()
    setDeferredPrompt(null)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Installer l'application ISALY"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 90,
        background: '#111111',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '14px 16px calc(14px + env(safe-area-inset-bottom))',
        display: 'flex', alignItems: 'center', gap: '12px',
        boxShadow: '0 -8px 30px rgba(0,0,0,0.4)',
      }}
    >
      <span style={{ fontSize: '22px', flexShrink: 0 }}>📱</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>
          Installe ISALY sur ton écran d&apos;accueil
        </div>
        {isIos && (
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
            Appuie sur <span style={{ color: '#10B981', fontWeight: 700 }}>↑ Partager</span> puis « Sur l&apos;écran d&apos;accueil »
          </div>
        )}
      </div>
      {!isIos && (
        <button
          onClick={install}
          style={{
            flexShrink: 0, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#fff', fontSize: '13px', fontWeight: 700,
            fontFamily: "'Outfit', sans-serif",
            padding: '10px 18px', borderRadius: '10px',
            boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
          }}
        >
          Installer
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Fermer"
        style={{
          flexShrink: 0, width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <X size={15} />
      </button>
    </div>
  )
}
