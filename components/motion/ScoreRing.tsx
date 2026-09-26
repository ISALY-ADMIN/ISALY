'use client'

import { useEffect, useRef, useState } from 'react'
import { useInViewOnce, useMotionReduced } from '@/lib/motion'

/**
 * Pastille ronde de compatibilité, animée à son apparition : l'anneau se
 * remplit jusqu'au pourcentage pendant que le nombre compte de 0 à la valeur
 * (≈ 800 ms, sortie douce), puis une petite pulsation finale.
 *
 * Une seule horloge (requestAnimationFrame) pilote l'anneau ET le nombre :
 * ils ne peuvent pas se désynchroniser. Seul le `stroke-dashoffset` du SVG et
 * le texte changent — aucune mise en page ne bouge, la pastille a une taille
 * fixe dès le premier rendu.
 *
 * Mouvement réduit : valeur finale et anneau plein affichés directement.
 * Le nom accessible est porté par le bouton parent, pas par le compteur.
 */
interface ScoreRingProps {
  value: number
  size: number
  /** Couleur du disque central. */
  fill: string
  /** Couleur du texte. */
  ink?: string
  fontSize?: number
}

const DURATION = 800

export default function ScoreRing({ value, size, fill, ink = '#fff', fontSize = 15 }: ScoreRingProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const seen = useInViewOnce(ref, { threshold: 0.6, rootMargin: '0px' })
  const reduced = useMotionReduced()
  const target = Math.max(0, Math.min(100, Math.round(value)))
  const [shown, setShown] = useState(0)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (!seen) return
    if (reduced) { setShown(target); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / DURATION)
      // Même famille que EASE_OUT (cubic-bezier(0.22, 1, 0.36, 1)) : quartique.
      const eased = 1 - Math.pow(1 - t, 4)
      setShown(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else setPulse(true)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, reduced, target])

  const stroke = 3
  const r = size / 2 - stroke / 2
  const c = 2 * Math.PI * r
  const inner = size - stroke * 2 - 4

  return (
    <span
      ref={ref}
      className={pulse ? 'm-pulse' : undefined}
      onAnimationEnd={() => setPulse(false)}
      style={{ position: 'relative', display: 'inline-flex', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true"
        style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fff" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)}
        />
      </svg>
      <span style={{
        width: inner, height: inner, borderRadius: '50%', background: fill, color: ink,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
      }}>
        {shown}%
      </span>
    </span>
  )
}
