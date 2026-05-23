'use client'

import { Button } from '@/components/ui/Button'

interface SwipeActionsProps {
  onPass: () => void
  onSuperLike: () => void
  onLike: () => void
  onHint?: (hint: 'like' | 'nope' | 'super' | null) => void
}

export default function SwipeActions({ onPass, onSuperLike, onLike, onHint }: SwipeActionsProps) {
  return (
    <div className="flex items-end justify-center gap-6 py-2">
      {/* PASS */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={onPass}
          onMouseEnter={() => onHint?.('nope')}
          onMouseLeave={() => onHint?.(null)}
          className="w-[60px] h-[60px] rounded-full border-2 border-red-200 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 text-2xl"
        >
          ✕
        </Button>
        <div className="text-[10px] text-gray-400">Passer</div>
      </div>

      {/* SUPER */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={onSuperLike}
          onMouseEnter={() => onHint?.('super')}
          onMouseLeave={() => onHint?.(null)}
          className="w-[52px] h-[52px] rounded-full border-2 border-indigo-200 text-indigo-400 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 text-xl"
        >
          ⭐
        </Button>
        <div className="text-[10px] text-gray-400">Super</div>
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
    </div>
  )
}
