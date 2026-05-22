'use client'

interface SwipeActionsProps {
  onPass: () => void
  onSuperLike: () => void
  onLike: () => void
  onHint?: (hint: 'like' | 'nope' | 'super' | null) => void
}

export default function SwipeActions({ onPass, onSuperLike, onLike, onHint }: SwipeActionsProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      {/* PASS */}
      <button
        onClick={onPass}
        onMouseEnter={() => onHint?.('nope')}
        onMouseLeave={() => onHint?.(null)}
        className="flex items-center justify-center rounded-full border-none cursor-pointer transition-all duration-200 font-bold text-xl"
        style={{
          width: '60px',
          height: '60px',
          background: '#FFFFFF',
          color: '#EF4444',
          border: '2px solid #FEE2E2',
          boxShadow: '0 4px 16px rgba(239,68,68,.12)',
        }}
        onMouseDown={e => {
          e.currentTarget.style.transform = 'scale(0.92)'
          e.currentTarget.style.background = '#EF4444'
          e.currentTarget.style.color = '#fff'
        }}
        onMouseUp={e => {
          e.currentTarget.style.transform = 'scale(1.08)'
          e.currentTarget.style.background = '#FFFFFF'
          e.currentTarget.style.color = '#EF4444'
        }}
        title="Passer"
      >
        ✕
      </button>

      {/* SUPER LIKE */}
      <button
        onClick={onSuperLike}
        onMouseEnter={e => {
          onHint?.('super')
          e.currentTarget.style.background = '#6366F1'
          e.currentTarget.style.color = '#fff'
          e.currentTarget.style.transform = 'scale(1.1)'
        }}
        onMouseLeave={e => {
          onHint?.(null)
          e.currentTarget.style.background = '#FFFFFF'
          e.currentTarget.style.color = '#6366F1'
          e.currentTarget.style.transform = ''
        }}
        className="flex items-center justify-center rounded-full border-none cursor-pointer transition-all duration-200 font-bold text-xl"
        style={{
          width: '60px',
          height: '60px',
          background: '#FFFFFF',
          color: '#6366F1',
          border: '2px solid #E0E7FF',
          boxShadow: '0 4px 16px rgba(99,102,241,.12)',
        }}
        title="Super like"
      >
        ⭐
      </button>

      {/* LIKE */}
      <button
        onClick={onLike}
        className="flex items-center justify-center rounded-full border-none cursor-pointer text-2xl font-bold text-white pulse-like transition-all duration-200"
        style={{
          width: '72px',
          height: '72px',
          background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)',
          boxShadow: '0 4px 20px rgba(78,203,160,.45)',
        }}
        onMouseEnter={e => {
          onHint?.('like')
          e.currentTarget.style.transform = 'scale(1.12)'
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(78,203,160,.65)'
        }}
        onMouseLeave={e => {
          onHint?.(null)
          e.currentTarget.style.transform = ''
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(78,203,160,.45)'
        }}
        title="J'adore"
      >
        ♥
      </button>
    </div>
  )
}
