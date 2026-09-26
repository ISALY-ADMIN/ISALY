'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { EASE_OUT, useMotionReduced } from '@/lib/motion'

/**
 * Explosion de match : une onde de choc circulaire et des éclats (petits
 * ronds et confettis aux couleurs ISALY) projetés sur des trajectoires
 * courbes — vitesse initiale, gravité et une légère dérive latérale qui
 * incurve chaque arc. Moins d'une seconde, une seule fois.
 *
 * Canvas unique, `pointer-events: none` : rien ne bloque les clics sur les
 * boutons de la fenêtre. La zone (AREA × AREA px) est centrée sur le parent,
 * qui doit être positionné : on le pose dans la pastille, l'explosion part
 * de son centre et déborde librement autour.
 *
 * Mouvement réduit : rien n'est rendu.
 */

const COLORS = ['#4ADE80', '#A6CEBC', '#F59E0B', '#F6F3F0']
const DURATION = 950
const COUNT = 42
/** Côté de la zone de dessin : assez pour les arcs, sans canvas géant. */
const AREA = 820

interface Particle {
  x: number; y: number; vx: number; vy: number; curl: number
  size: number; color: string; kind: 'dot' | 'confetti'; rot: number; vr: number
}

export default function MatchBurst() {
  const reduced = useMotionReduced()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (reduced) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = AREA
    const height = AREA
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.scale(dpr, dpr)

    const ox = width / 2
    const oy = height / 2
    const parts: Particle[] = Array.from({ length: COUNT }, (_, i) => {
      const a = (i / COUNT) * Math.PI * 2 + Math.random() * 0.4
      const speed = 380 + Math.random() * 420
      return {
        x: ox, y: oy,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 160,
        curl: (Math.random() - 0.5) * 900,
        size: 3 + Math.random() * 4,
        color: COLORS[i % COLORS.length],
        kind: i % 3 === 0 ? 'dot' : 'confetti',
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 14,
      }
    })

    let raf = 0
    let last = performance.now()
    const t0 = last
    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000)
      last = now
      const t = (now - t0) / DURATION
      ctx.clearRect(0, 0, width, height)
      if (t >= 1) return
      for (const p of parts) {
        // Frottement + gravité + dérive perpendiculaire à la vitesse : c'est
        // elle qui courbe la trajectoire en arc au lieu d'une ligne droite.
        const drag = Math.pow(0.12, dt)
        const n = Math.hypot(p.vx, p.vy) || 1
        p.vx = p.vx * drag + (-p.vy / n) * p.curl * dt
        p.vy = p.vy * drag + (p.vx / n) * p.curl * dt + 900 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rot += p.vr * dt
        ctx.globalAlpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4
        ctx.fillStyle = p.color
        if (p.kind === 'dot') {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2); ctx.fill()
        } else {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot)
          ctx.fillRect(-p.size / 2, -p.size * 0.22, p.size, p.size * 0.44)
          ctx.restore()
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  if (reduced) return null

  return (
    <div aria-hidden="true" style={{
      position: 'absolute', left: '50%', top: '50%', width: AREA, height: AREA,
      marginLeft: -AREA / 2, marginTop: -AREA / 2, pointerEvents: 'none',
    }}>
      {/* Onde de choc : anneau qui s'élargit et s'éteint. */}
      <motion.span
        initial={{ scale: 0.2, opacity: 0.9 }}
        animate={{ scale: 4.2, opacity: 0 }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
        style={{
          position: 'absolute', left: '50%', top: '50%',
          width: 120, height: 120, marginLeft: -60, marginTop: -60,
          borderRadius: '50%', border: '3px solid #4ADE80',
        }}
      />
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
    </div>
  )
}
