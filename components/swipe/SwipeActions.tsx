'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'

interface SwipeActionsProps {
  onPass: () => void
  onSuperLike: () => void
  onLike: () => void
  onHint?: (hint: 'like' | 'nope' | 'super' | null) => void
}

export default function SwipeActions({ onPass, onSuperLike, onLike, onHint }: SwipeActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '24px', paddingTop: '8px' }}
    >
      {/* PASS */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={onPass}
          onMouseEnter={() => onHint?.('nope')}
          onMouseLeave={() => onHint?.(null)}
          className="w-[60px] h-[60px] rounded-full text-2xl"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(239,68,68,0.3)', color: '#EF4444' }}
        >
          ✕
        </Button>
        <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Passer</div>
      </div>

      {/* SUPER */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={onSuperLike}
          onMouseEnter={() => onHint?.('super')}
          onMouseLeave={() => onHint?.(null)}
          className="w-[52px] h-[52px] rounded-full text-xl"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(99,102,241,0.3)', color: '#6366F1' }}
        >
          ⭐
        </Button>
        <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Super</div>
      </div>

      {/* LIKE */}
      <div className="flex flex-col items-center gap-1">
        <Button
          size="icon"
          onClick={onLike}
          onMouseEnter={() => onHint?.('like')}
          onMouseLeave={() => onHint?.(null)}
          className="w-[72px] h-[72px] rounded-full text-3xl shadow-[0_6px_28px_rgba(16,185,129,0.55)]"
        >
          ♥
        </Button>
        <div className="text-[10px] text-[#10B981] font-semibold">J&apos;adore</div>
      </div>
    </motion.div>
  )
}
