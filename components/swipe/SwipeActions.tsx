'use client'

interface SwipeActionsProps {
  onPass: () => void
  onSuperLike: () => void
  onLike: () => void
  onHint?: (hint: 'like' | 'nope' | 'super' | null) => void
}

export default function SwipeActions({ onPass, onSuperLike, onLike, onHint }: SwipeActionsProps) {
  return (
    <div className="flex items-center justify-center gap-5 py-2">
      <button
        onClick={onPass}
        onMouseEnter={() => onHint?.('nope')}
        onMouseLeave={() => onHint?.(null)}
        className="flex items-center justify-center cursor-pointer transition-all duration-200"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#ffffff',
          border: '2px solid #FEE2E2',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          color: '#F87171',
          fontSize: '22px',
          fontWeight: 700,
        }}
        onMouseOver={e => {
          e.currentTarget.style.background = '#EF4444'
          e.currentTarget.style.color = '#ffffff'
          e.currentTarget.style.transform = 'rotate(-6deg) scale(1.08)'
          e.currentTarget.style.borderColor = '#EF4444'
        }}
        onMouseOut={e => {
          e.currentTarget.style.background = '#ffffff'
          e.currentTarget.style.color = '#F87171'
          e.currentTarget.style.transform = ''
          e.currentTarget.style.borderColor = '#FEE2E2'
        }}
        title="Passer"
      >
        ✕
      </button>

      <button
        onClick={onSuperLike}
        onMouseEnter={() => onHint?.('super')}
        onMouseLeave={() => onHint?.(null)}
        className="flex items-center justify-center cursor-pointer transition-all duration-200"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#ffffff',
          border: '2px solid #E0E7FF',
          boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
          color: '#818CF8',
          fontSize: '20px',
        }}
        onMouseOver={e => {
          e.currentTarget.style.background = '#6366F1'
          e.currentTarget.style.color = '#ffffff'
          e.currentTarget.style.transform = 'scale(1.08)'
          e.currentTarget.style.borderColor = '#6366F1'
        }}
        onMouseOut={e => {
          e.currentTarget.style.background = '#ffffff'
          e.currentTarget.style.color = '#818CF8'
          e.currentTarget.style.transform = ''
          e.currentTarget.style.borderColor = '#E0E7FF'
        }}
        title="Super like"
      >
        ⭐
      </button>

      <button
        onClick={onLike}
        onMouseEnter={() => onHint?.('like')}
        onMouseLeave={() => onHint?.(null)}
        className="flex items-center justify-center cursor-pointer transition-all duration-200"
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)',
          boxShadow: '0 4px 20px rgba(78,203,160,0.50)',
          color: '#ffffff',
          fontSize: '26px',
          border: 'none',
        }}
        onMouseOver={e => {
          e.currentTarget.style.transform = 'scale(1.10)'
          e.currentTarget.style.boxShadow = '0 6px 28px rgba(78,203,160,0.65)'
        }}
        onMouseOut={e => {
          e.currentTarget.style.transform = ''
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(78,203,160,0.50)'
        }}
        title="J'adore"
      >
        ♥
      </button>
    </div>
  )
}
