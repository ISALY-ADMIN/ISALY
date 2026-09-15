'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Infobulle « premier usage » du swipe : « ← Passe · Like → », posée sur la
 * carte, qui s'efface au premier geste ou au clic et ne revient plus
 * (localStorage).
 *
 * Née dans /app/swipe (où elle était écrite en ligne), sortie ici telle
 * quelle pour être réutilisée par la pile visiteur de la page d'accueil
 * (components/home/SwipeDeck) : même pastille, même comportement.
 *
 * Chaque écran passe sa propre clé : /app/swipe garde `tooltip_swipe_seen`,
 * l'accueil a la sienne. Un visiteur qui a swipé sur l'accueil reverra donc
 * l'infobulle une fois dans l'app, dont l'écran (cinq boutons, filtres) est
 * différent — et le comportement de /app/swipe reste exactement celui d'avant.
 */

export const SWIPE_TIP_KEY = 'tooltip_swipe_seen'

export function useSwipeTip(storageKey: string = SWIPE_TIP_KEY) {
  const [showSwipeTip, setShowSwipeTip] = useState(false)

  // Tooltip premier usage : une seule fois (localStorage)
  useEffect(() => {
    try { if (!localStorage.getItem(storageKey)) setShowSwipeTip(true) } catch {}
  }, [storageKey])

  const dismissSwipeTip = useCallback(() => {
    if (!showSwipeTip) return
    setShowSwipeTip(false)
    try { localStorage.setItem(storageKey, '1') } catch {}
  }, [showSwipeTip, storageKey])

  return { showSwipeTip, dismissSwipeTip }
}

/** Animations de l'infobulle. `tip-wobble` est appliquée par l'appelant sur
 *  son conteneur de carte (/app/swipe) ; `tip-pulse` par la pastille. La
 *  pulsation, infinie, s'arrête si l'utilisateur a réduit les animations. */
export function SwipeTipKeyframes() {
  return (
    <style>{`
      @keyframes tip-wobble {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-2.5deg); }
        75% { transform: rotate(2.5deg); }
      }
      @keyframes tip-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.65; }
      }
      @media (prefers-reduced-motion: reduce) {
        .isaly-swipe-tip { animation: none !important; }
      }
    `}</style>
  )
}

/** La pastille elle-même. À placer dans le conteneur `relative` de la carte.
 *  `placement` déplace la pastille verticalement (par défaut à 18 px du bas,
 *  comme dans /app/swipe) quand elle y couvrirait un bouton de la carte. */
export function SwipeTipBadge({
  onDismiss,
  placement = { bottom: 18 },
}: {
  onDismiss: () => void
  placement?: { top: number | string } | { bottom: number | string }
}) {
  return (
    <button
      onClick={onDismiss}
      className="isaly-swipe-tip absolute border-none cursor-pointer"
      style={{
        ...placement, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
        background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(16,185,129,0.4)', borderRadius: '100px',
        padding: '10px 20px', fontSize: '13.5px', fontWeight: 700, color: '#fff',
        fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        animation: 'tip-pulse 2s ease infinite',
      }}
    >
      ← Passe · Like →
    </button>
  )
}
