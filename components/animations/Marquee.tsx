'use client'
import { motion } from 'framer-motion'

interface MarqueeProps {
  items: string[]
  speed?: number
  reverse?: boolean
}

export default function Marquee({ items, speed = 30, reverse = false }: MarqueeProps) {
  const doubled = [...items, ...items]

  return (
    <div style={{ overflow: 'hidden', width: '100%', position: 'relative' }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '80px',
        background: 'linear-gradient(to right, #0A0A0A, transparent)',
        zIndex: 2,
      }} />
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: '80px',
        background: 'linear-gradient(to left, #0A0A0A, transparent)',
        zIndex: 2,
      }} />
      <motion.div
        style={{ display: 'flex', gap: '0', width: 'fit-content' }}
        animate={{ x: reverse ? ['-50%', '0%'] : ['0%', '-50%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
      >
        {doubled.map((item, i) => (
          <div key={i} style={{
            padding: '8px 24px',
            margin: '0 8px',
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.5)',
            whiteSpace: 'nowrap',
            fontFamily: "'Outfit', sans-serif",
          }}>
            {item}
          </div>
        ))}
      </motion.div>
    </div>
  )
}
