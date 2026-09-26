'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { INSTANT, SPRING, useInViewOnce, useMotionReduced } from '@/lib/motion'

/**
 * Remplissage d'une barre (0–100) qui se déploie depuis zéro avec un ressort,
 * à sa première apparition à l'écran. À placer dans la piste (qui fixe la
 * hauteur, le fond et `overflow: hidden`).
 *
 * Le remplissage occupe toute la largeur et c'est `scaleX` qui l'ajuste :
 * seule la transformation bouge, jamais la largeur (aucun recalcul de mise en
 * page). `delay` (s) permet de les enchaîner l'une après l'autre.
 *
 * Mouvement réduit : valeur finale affichée directement.
 */
export default function SpringBar({ value, background, delay = 0 }: {
  value: number
  background: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInViewOnce(ref, { threshold: 0.3, rootMargin: '0px' })
  const reduced = useMotionReduced()
  const target = Math.max(0, Math.min(100, value)) / 100

  return (
    <motion.div
      ref={ref}
      initial={reduced ? false : { scaleX: 0 }}
      animate={{ scaleX: seen || reduced ? target : 0 }}
      transition={reduced ? INSTANT : { ...SPRING.fill, delay }}
      style={{ height: '100%', width: '100%', background, transformOrigin: 'left', borderRadius: 'inherit' }}
    />
  )
}
