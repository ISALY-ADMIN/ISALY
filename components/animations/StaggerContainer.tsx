'use client'
import { motion, useInView } from 'framer-motion'
import { useRef, ReactNode } from 'react'

interface StaggerContainerProps {
  children: ReactNode
  staggerDelay?: number
  className?: string
  style?: React.CSSProperties
}

export default function StaggerContainer({
  children,
  staggerDelay = 0.08,
  className,
  style,
}: StaggerContainerProps) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, style, className }: { children: ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20, scale: 0.97 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
      }}
      style={style}
      className={className}
    >
      {children}
    </motion.div>
  )
}
