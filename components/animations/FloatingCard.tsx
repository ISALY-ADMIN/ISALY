'use client'
import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface FloatingCardProps {
  children: ReactNode
  delay?: number
  amplitude?: number
  style?: React.CSSProperties
}

export default function FloatingCard({
  children,
  delay = 0,
  amplitude = 8,
  style,
}: FloatingCardProps) {
  return (
    <motion.div
      animate={{ y: [0, -amplitude, 0] }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
      style={style}
    >
      {children}
    </motion.div>
  )
}
