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
        onMouseEnter={e => {
          onHint?.('nope')
          e.currentTarget.style.background = '#FEF2F2'
          e.currentTarget.style.borderColor = '#EF4444'
          e.currentTarget.style.transform = 'scale(1.08)'
        }}
        onMouseLeave={e => {
          onHint?.(null)
          e.currentTarget.style.background = '#FFFFFF'
          e.currentTarget.style.borderColor = '#FEE2E2'
          e.currentTarget.style.transform = ''
        }}
        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)' }}
        onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.08)' }}
        className="flex items-center justify-center rounded-full border-none cursor-pointer transition-all duration-200 font-bold text-xl"
        style={{
          width: '56px',
          height: '56px',
          background: '#FFFFFF',
          color: '#EF4444',
          border: '2px solid #FEE2E2',
          boxShadow: '0 4px 16px rgba(239,68,68,.12)',
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
          e.currentTarget.style.transform = 'scale(1.12)'
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,.4)'
        }}
        onMouseLeave={e => {
          onHint?.(null)
          e.currentTarget.style.background = '#FFFFFF'
          e.currentTarget.style.color = '#6366F1'
          e.currentTarget.style.transform = ''
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,.12)'
        }}
        className="flex items-center justify-center rounded-full border-none cursor-pointer transition-all duration-200 font-bold text-xl"
        style={{
          width: '52px',
          height: '52px',
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
          width: '68px',
          height: '68px',
          background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)',
          boxShadow: '0 4px 20px rgba(78,203,160,.45)',
        }}
        onMouseEnter={e => {
          onHint?.('like')
          e.currentTarget.style.transform = 'scale(1.12)'
          e.currentTarget.style.boxShadow = '0 10px 36px rgba(78,203,160,.65)'
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
