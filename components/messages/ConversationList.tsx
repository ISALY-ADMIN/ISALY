'use client'

import CertificationBadge, { CertLevel } from '@/components/ui/CertificationBadge'

interface Conv {
  id: string
  name: string
  initials: string
  color: string
  preview: string
  time: string
  certLevel?: CertLevel
  unread?: number
  sectionLabel?: string
}

interface ConversationListProps {
  convs: Conv[]
  activeId: string | null
  onSelect: (id: string) => void
}

export default function ConversationList({ convs, activeId, onSelect }: ConversationListProps) {
  return (
    <div
      className="flex flex-col overflow-hidden flex-shrink-0"
      style={{ width: '280px', background: 'rgba(255,255,255,0.03)', borderRight: '0.5px solid rgba(255,255,255,0.08)' }}
    >
      <div className="px-4 pt-5 pb-3 flex-shrink-0" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div className="font-extrabold text-[15px] mb-3" style={{ color: '#ffffff' }}>Messages</div>
        <input
          placeholder="Rechercher…"
          className="w-full px-3.5 py-2 rounded-full text-[13px] border-[1.5px] outline-none transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: '#ffffff' }}
          onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.5)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-1.5">
        {convs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center mt-6">
            <div className="text-[48px] mb-3" style={{ animation: 'bop 1.6s ease infinite' }}>💬</div>
            <div className="text-[14px] font-bold mb-1.5" style={{ fontFamily: "'DM Serif Display', serif", color: '#ffffff' }}>
              Pas encore de conversations
            </div>
            <div className="text-[12px] mb-5" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
              Commence à swiper pour décrocher ton premier match !
            </div>
            <a
              href="/app/swipe"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12.5px] font-bold text-white no-underline transition-all"
              style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)', boxShadow: '0 4px 14px rgba(78,203,160,.35)' }}
            >
              🔥 Aller swiper
            </a>
          </div>
        ) : (
          convs.map((c, idx) => {
            const isActive = activeId === c.id
            const showHeader = !!c.sectionLabel && c.sectionLabel !== convs[idx - 1]?.sectionLabel
            return (
              <div key={c.id}>
                {showHeader && (
                  <div className="px-2.5 pt-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {c.sectionLabel}
                  </div>
                )}
              <button
                onClick={() => onSelect(c.id)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] w-full border-none cursor-pointer transition-colors mb-0.5 text-left"
                style={{ background: isActive ? 'rgba(16,185,129,0.12)' : 'transparent' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                {/* Avatar with online dot */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-[13px] text-white"
                    style={{ background: c.color }}
                  >
                    {c.initials}
                  </div>
                  <span
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                    style={{ background: '#4ECBA0', borderColor: '#0A0A0A' }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold truncate" style={{ color: isActive ? '#10B981' : '#ffffff' }}>
                      {c.name}
                    </span>
                    {c.certLevel ? <CertificationBadge level={c.certLevel} size="sm" /> : null}
                  </div>
                  <div className="text-[11.5px] truncate" style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '140px' }}>
                    {c.preview}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="text-[10.5px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{c.time}</div>
                  {c.unread ? (
                    <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white" style={{ background: '#4ECBA0' }}>
                      {c.unread}
                    </div>
                  ) : null}
                </div>
              </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
