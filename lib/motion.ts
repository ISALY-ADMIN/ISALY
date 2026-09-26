'use client'

import { useEffect, useState, type RefObject } from 'react'
import { useReducedMotion } from 'framer-motion'

/**
 * Langage de mouvement ISALY — le même que la vidéo marketing (15 s) :
 * squash & stretch, arcs, follow-through (léger dépassement puis
 * stabilisation), textes qui montent depuis un masque.
 *
 * Un seul endroit pour les courbes et les durées. Les classes CSS qui les
 * utilisent vivent dans app/globals.css (section « MOTION »), sous forme de
 * variables `--m-*` : les deux côtés doivent rester alignés.
 *
 * Règles communes :
 *   · on n'anime que `transform` et `opacity` (aucun décalage de mise en page) ;
 *   · rien ne retarde le premier affichage : le texte est rendu côté serveur,
 *     l'animation ne fait que le révéler ;
 *   · prefers-reduced-motion: reduce → contenu affiché directement (au plus
 *     un fondu court). Côté CSS c'est la media query, côté framer-motion
 *     c'est `useReducedMotion()`.
 */

/** Sortie douce : démarre vite, se pose sans à-coup. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const
/** Ressort : dépasse légèrement la cible puis revient (follow-through). */
export const EASE_SPRING = [0.34, 1.56, 0.64, 1] as const

export const EASE_OUT_CSS = 'cubic-bezier(0.22, 1, 0.36, 1)'
export const EASE_SPRING_CSS = 'cubic-bezier(0.34, 1.56, 0.64, 1)'

/** Durées, en secondes (framer-motion). */
export const DUR = {
  /** Micro-interactions : pression, survol. */
  micro: 0.15,
  /** Éléments : cartes, pastilles, questions. */
  element: 0.35,
  /** Entrées de section : titres, blocs. */
  section: 0.6,
} as const

/** Décalage entre deux mots de RiseText (60–80 ms demandés). */
export const WORD_STAGGER = 0.07

/** Ressorts framer-motion, pour les mouvements pilotés physiquement
 *  (glissement, pression). Réglés pour un seul petit dépassement. */
export const SPRING = {
  /** Retour après pression d'un bouton : rebond franc, bref. */
  press: { type: 'spring' as const, stiffness: 520, damping: 15, mass: 0.7 },
  /** Carte qui remonte en place dans la pile. */
  settle: { type: 'spring' as const, stiffness: 320, damping: 19 },
  /** Remplissage de barres (progression, dimensions). */
  fill: { type: 'spring' as const, stiffness: 170, damping: 16 },
}

/** Transition « instantanée » à substituer quand le mouvement est réduit. */
export const INSTANT = { duration: 0 } as const

/** Réexport : un seul import pour tout le module. `null` côté serveur,
 *  traité comme « pas de préférence » (le rendu serveur ne bouge pas). */
export function useMotionReduced(): boolean {
  return useReducedMotion() === true
}

/**
 * Vrai dès que l'élément a été vu une fois (IntersectionObserver, puis
 * déconnexion). Sans IntersectionObserver, vrai immédiatement : mieux vaut
 * un contenu affiché sans animation qu'un contenu jamais révélé.
 */
export function useInViewOnce(
  ref: RefObject<Element>,
  { threshold = 0.2, rootMargin = '0px 0px -8% 0px' }: { threshold?: number; rootMargin?: string } = {},
): boolean {
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    if (seen) return
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setSeen(true); io.disconnect() }
    }, { threshold, rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, seen, threshold, rootMargin])
  return seen
}
