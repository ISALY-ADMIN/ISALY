'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import Emoji from '@/components/ui/Emoji'

// Briques partagées des tableaux de bord bento (dashboard-home, Ma maison…).
// Même signature visuelle partout : glassmorphism dark, hover mint, stagger.

export const cardBase: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
  padding: '20px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
  overflow: 'hidden',
  position: 'relative',
}

const revealVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
}

/** Styles globaux des modules bento (hover, focus, shimmer, pulse) — à inclure une fois par page. */
export function BentoStyles() {
  return (
    <style>{`
      .bento-card:hover { transform: translateY(-2px); border-color: rgba(16,185,129,0.45) !important; box-shadow: 0 8px 32px rgba(16,185,129,0.12); }
      .bento-card:focus-visible { outline: 2px solid #10B981; outline-offset: 2px; }
      .shimmer { animation: shimmer 1.4s ease-in-out infinite; }
      @keyframes shimmer { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
      .pulse-mint { animation: pulseMint 1.8s ease-in-out infinite; }
      @keyframes pulseMint { 0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.45); } 50% { box-shadow: 0 0 0 6px rgba(16,185,129,0); } }
    `}</style>
  )
}

/** Module bento : entièrement cliquable (href), hover mint + lift + glow, focus visible. */
export function BentoCard({ href, ariaLabel, className, children, gradient, onClick }: {
  href?: string
  ariaLabel: string
  className?: string
  children: React.ReactNode
  gradient?: boolean
  onClick?: () => void
}) {
  const style: React.CSSProperties = {
    ...cardBase,
    textDecoration: 'none',
    ...(gradient ? { background: 'linear-gradient(135deg, #10B981, #059669)', border: '1px solid rgba(255,255,255,0.15)' } : {}),
  }
  return (
    <motion.div variants={revealVariants} className={className} style={{ minHeight: '148px' }}>
      {href ? (
        <Link href={href} aria-label={ariaLabel} className="bento-card" style={style} onClick={onClick}>
          {children}
        </Link>
      ) : onClick ? (
        <button type="button" aria-label={ariaLabel} className="bento-card" onClick={onClick}
          style={{ ...style, width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
          {children}
        </button>
      ) : (
        <div aria-label={ariaLabel} style={style}>{children}</div>
      )}
    </motion.div>
  )
}

export function ModuleTitle({ icon, label, light }: { icon: string; label: string; light?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
      <Emoji native={icon} size="15px" />
      <span style={{
        fontFamily: "'Outfit', sans-serif", fontSize: '13px', fontWeight: 700,
        letterSpacing: '0.02em', color: light ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
      }}>{label}</span>
    </div>
  )
}

export function EmptyState({ text, cta }: { text: string; cta?: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{text}</div>
      {cta && <div style={{ fontSize: '13px', fontWeight: 700, color: '#10B981' }}>{cta} →</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={className} style={{ minHeight: '148px' }}>
      <div className="shimmer" style={{ ...cardBase, border: '1px solid rgba(255,255,255,0.05)' }} />
    </div>
  )
}

/** Count-up animé au premier affichage (rAF, ~700 ms, ease-out). */
export function useCountUp(target: number): number {
  const [value, setValue] = useState(0)
  const done = useRef(false)
  useEffect(() => {
    if (done.current) { setValue(target); return }
    done.current = true
    if (target === 0) return
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min((now - start) / 700, 1)
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return value
}

export function CountUp({ value, style }: { value: number; style?: React.CSSProperties }) {
  const n = useCountUp(value)
  return <span style={style}>{n}</span>
}

export function AvatarStack({ people }: { people: { name: string; avatarUrl: string | null }[] }) {
  return (
    <div style={{ display: 'flex' }}>
      {people.map((p, i) => (
        <div key={i} style={{
          width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          marginLeft: i > 0 ? '-10px' : 0, border: '2px solid #0A0A0A',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 800, color: '#fff', zIndex: people.length - i,
          position: 'relative',
        }}>
          {p.avatarUrl
            ? <Image src={p.avatarUrl} alt={p.name} width={34} height={34} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (p.name[0] ?? '?').toUpperCase()}
        </div>
      ))}
    </div>
  )
}
