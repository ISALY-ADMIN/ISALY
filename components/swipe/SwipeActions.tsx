'use client'

import { motion } from 'framer-motion'
import { RotateCcw, X, Star, Heart, Info } from 'lucide-react'

interface SwipeActionsProps {
  onUndo: () => void
  canUndo: boolean
  onPass: () => void
  onSuperLike: () => void
  onLike: () => void
  onInfo: () => void
}

interface ActionButtonProps {
  onClick: () => void
  size: number
  label: string
  disabled?: boolean
  glow?: string
  style: React.CSSProperties
  children: React.ReactNode
}

function ActionButton({ onClick, size, label, disabled, glow, style, children }: ActionButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      whileHover={disabled ? undefined : { scale: 1.1, boxShadow: glow }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      className="flex items-center justify-center rounded-full cursor-pointer flex-shrink-0"
      style={{
        width: size,
        height: size,
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'default' : 'pointer',
        ...style,
      }}
    >
      {children}
    </motion.button>
  )
}

export default function SwipeActions({ onUndo, canUndo, onPass, onSuperLike, onLike, onInfo }: SwipeActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="flex flex-col items-center gap-2 flex-shrink-0"
    >
      <div className="flex items-center justify-center gap-4">
        {/* Undo */}
        <ActionButton
          onClick={onUndo}
          disabled={!canUndo}
          size={44}
          label="Annuler le dernier swipe"
          glow="0 0 20px rgba(255,255,255,0.15)"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}
        >
          <RotateCcw size={18} />
        </ActionButton>

        {/* Passer */}
        <ActionButton
          onClick={onPass}
          size={56}
          label="Passer"
          glow="0 0 24px rgba(239,68,68,0.4)"
          style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(239,68,68,0.5)', color: '#EF4444' }}
        >
          <X size={26} strokeWidth={2.5} />
        </ActionButton>

        {/* Superlike */}
        <ActionButton
          onClick={onSuperLike}
          size={48}
          label="Superlike"
          glow="0 0 24px rgba(245,158,11,0.45)"
          style={{ background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.5)', color: '#F59E0B' }}
        >
          <Star size={22} fill="currentColor" />
        </ActionButton>

        {/* J'adore */}
        <ActionButton
          onClick={onLike}
          size={64}
          label="J'adore"
          glow="0 0 32px rgba(16,185,129,0.65)"
          style={{
            background: 'linear-gradient(135deg, #10B981, #059669)',
            border: 'none',
            color: '#fff',
            boxShadow: '0 6px 28px rgba(16,185,129,0.5)',
          }}
        >
          <Heart size={30} fill="currentColor" />
        </ActionButton>

        {/* Info */}
        <ActionButton
          onClick={onInfo}
          size={44}
          label="Voir les détails"
          glow="0 0 20px rgba(255,255,255,0.15)"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}
        >
          <Info size={18} />
        </ActionButton>
      </div>

      {/* Hints clavier — desktop uniquement */}
      <div
        className="hidden md:block text-center"
        style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.3px' }}
      >
        ← Passer&nbsp;&nbsp;&nbsp;→ J&apos;adore&nbsp;&nbsp;&nbsp;↑ Super&nbsp;&nbsp;&nbsp;Z Annuler&nbsp;&nbsp;&nbsp;Espace Photo
      </div>
    </motion.div>
  )
}
