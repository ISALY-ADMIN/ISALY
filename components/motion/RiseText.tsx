'use client'

import { Fragment, useRef, type CSSProperties } from 'react'
import { useInViewOnce } from '@/lib/motion'

/**
 * Texte qui monte depuis un masque, mot par mot (70 ms d'écart).
 *
 * À placer DANS le titre, pas autour : `<h2><RiseText text="…" /></h2>`.
 * Le titre garde ainsi sa balise, ses styles et son nom accessible.
 *
 * Les mots sont rendus côté serveur à leur place définitive : l'animation ne
 * fait que les révéler (transform + opacity), la mise en page ne bouge pas.
 * Les lecteurs d'écran lisent la phrase entière (copie sr-only), jamais les
 * morceaux. Avec prefers-reduced-motion: reduce, le CSS n'applique aucun état
 * caché : le texte est affiché directement (voir globals.css, « MOTION »).
 *
 * `mode` :
 *   · 'view' (défaut) — se joue la première fois que le texte entre à l'écran ;
 *   · 'load' — se joue dès le premier affichage, en CSS pur, sans attendre
 *     l'hydratation (titre du haut de page).
 */
interface RiseTextProps {
  text: string
  mode?: 'view' | 'load'
  /** Délai avant le premier mot, en ms. */
  delay?: number
  /** Rang du premier mot, pour enchaîner plusieurs morceaux d'une même phrase. */
  startIndex?: number
}

const vars = (v: Record<string, string | number>) => v as CSSProperties

export default function RiseText({ text, mode = 'view', delay = 0, startIndex = 0 }: RiseTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const seen = useInViewOnce(ref)
  const words = text.split(/\s+/).filter(Boolean)
  const className = mode === 'load' ? 'm-rise-now' : `m-rise${seen ? ' is-in' : ''}`

  return (
    <span ref={ref} className={className} style={vars({ '--m-d': `${delay}ms` })}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <Fragment key={`${i}-${w}`}>
            {i > 0 && ' '}
            <span className="m-rise-mask">
              <span className="m-rise-word" style={vars({ '--i': i + startIndex })}>{w}</span>
            </span>
          </Fragment>
        ))}
      </span>
    </span>
  )
}

/**
 * Mot clé dont les lettres tombent l'une après l'autre et rebondissent sur la
 * ligne de base (écrasement à l'impact, petit rebond, stabilisation). CSS pur,
 * joué au premier affichage. 40 ms entre deux lettres, 560 ms par lettre.
 */
export function DropText({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span style={vars({ '--m-d': `${delay}ms` })}>
      <span className="sr-only">{text}</span>
      <span className="m-drop-word" aria-hidden="true">
        {Array.from(text).map((c, i) => (
          <span key={i} className="m-drop-char" style={vars({ '--i': i })}>{c}</span>
        ))}
      </span>
    </span>
  )
}
