'use client'

interface SwipeActionsProps {
  onPass: () => void
  onSuperLike: () => void
  onLike: () => void
  onHint?: (hint: 'like' | 'nope' | 'super' | null) => void
}

export default function SwipeActions({ onPass, onSuperLike, onLike, onHint }: SwipeActionsProps) {
  return (
    <div className="flex items-center justify-center gap-5">

      {/* PASS */}
      <button
        onClick={onPass}
        onMouseEnter={() => onHint?.('nope')}
        onMouseLeave={() => onHint?.(null)}
        className="w-14 h-14 bg-white rounded-full border-2 border-red-100 shadow-md text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200 flex items-center justify-center text-xl font-bold cursor-pointer"
        title="Passer"
      >
        ✕
      </button>

      {/* SUPER LIKE */}
      <button
        onClick={onSuperLike}
        onMouseEnter={() => onHint?.('super')}
        onMouseLeave={() => onHint?.(null)}
        className="w-14 h-14 bg-white rounded-full border-2 border-indigo-100 shadow-md text-indigo-400 hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all duration-200 flex items-center justify-center text-xl font-bold cursor-pointer"
        title="Super like"
      >
        ⭐
      </button>

      {/* LIKE */}
      <button
        onClick={onLike}
        onMouseEnter={() => onHint?.('like')}
        onMouseLeave={() => onHint?.(null)}
        className="w-16 h-16 rounded-full shadow-lg text-white text-2xl flex items-center justify-center cursor-pointer hover:scale-110 transition-transform duration-200 pulse-like border-none font-bold"
        style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)' }}
        title="J'adore"
      >
        ♥
      </button>

    </div>
  )
}
