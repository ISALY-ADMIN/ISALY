'use client'

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button
          onClick={onPass}
          onMouseEnter={() => onHint?.('nope')}
          onMouseLeave={() => onHint?.(null)}
          className="flex items-center justify-center cursor-pointer transition-all duration-200"
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '2px solid #FECACA',
            boxShadow: '0 4px 16px rgba(239,68,68,0.15)',
            color: '#F87171',
            fontSize: '24px',
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
            e.currentTarget.style.borderColor = '#FECACA'
          }}
          title="Passer"
        >
          ✕
        </button>
        <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '4px', textAlign: 'center' }}>Passer</div>
      </div>

      {/* SUPER */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button
          onClick={onSuperLike}
          onMouseEnter={() => onHint?.('super')}
          onMouseLeave={() => onHint?.(null)}
          className="flex items-center justify-center cursor-pointer transition-all duration-200"
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '2px solid #C7D2FE',
            boxShadow: '0 4px 16px rgba(99,102,241,0.15)',
            color: '#818CF8',
            fontSize: '22px',
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
            e.currentTarget.style.borderColor = '#C7D2FE'
          }}
          title="Super like"
        >
          ⭐
        </button>
        <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '4px', textAlign: 'center' }}>Super</div>
      </div>

      {/* LIKE */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button
          onClick={onLike}
          onMouseEnter={() => onHint?.('like')}
          onMouseLeave={() => onHint?.(null)}
          className="flex items-center justify-center cursor-pointer transition-all duration-200"
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)',
            boxShadow: '0 6px 28px rgba(78,203,160,0.55)',
            color: '#ffffff',
            fontSize: '30px',
            border: 'none',
          }}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'scale(1.10)'
            e.currentTarget.style.boxShadow = '0 8px 36px rgba(78,203,160,0.70)'
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = ''
            e.currentTarget.style.boxShadow = '0 6px 28px rgba(78,203,160,0.55)'
          }}
          title="J'adore"
        >
          ♥
        </button>
        <div style={{ fontSize: '10px', color: '#10B981', marginTop: '4px', textAlign: 'center', fontWeight: 600 }}>J&apos;adore</div>
      </div>
    </div>
  )
}
