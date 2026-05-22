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
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          background: '#ffffff',
          border: '1.5px solid #FECACA',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          color: '#EF4444',
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
          e.currentTarget.style.color = '#EF4444'
          e.currentTarget.style.transform = ''
          e.currentTarget.style.borderColor = '#FECACA'
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
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: '#ffffff',
          border: '1.5px solid #C7D2FE',
          boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
          color: '#4F46E5',
          fontSize: '20px',
        }}
        onMouseOver={e => {
          e.currentTarget.style.background = '#4F46E5'
          e.currentTarget.style.color = '#ffffff'
          e.currentTarget.style.transform = 'scale(1.08)'
          e.currentTarget.style.borderColor = '#4F46E5'
        }}
        onMouseOut={e => {
          e.currentTarget.style.background = '#ffffff'
          e.currentTarget.style.color = '#4F46E5'
          e.currentTarget.style.transform = ''
          e.currentTarget.style.borderColor = '#C7D2FE'
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
          width: '66px',
          height: '66px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          boxShadow: '0 4px 20px rgba(16,185,129,0.50)',
          color: '#ffffff',
          fontSize: '26px',
          border: 'none',
        }}
        onMouseOver={e => {
          e.currentTarget.style.transform = 'scale(1.10)'
          e.currentTarget.style.boxShadow = '0 6px 28px rgba(16,185,129,0.65)'
        }}
        onMouseOut={e => {
          e.currentTarget.style.transform = ''
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(16,185,129,0.50)'
        }}
        title="J'adore"
      >
        ♥
      </button>
    </div>
  )
}
