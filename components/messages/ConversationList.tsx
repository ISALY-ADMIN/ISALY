'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Search } from 'lucide-react'
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
  avatarUrl?: string | null
  otherUserId?: string | null
}

interface ConversationListProps {
  convs: Conv[]
  activeId: string | null
  onSelect: (id: string) => void
  onlineIds?: Set<string>
}

export default function ConversationList({ convs, activeId, onSelect, onlineIds }: ConversationListProps) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? convs.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.preview.toLowerCase().includes(query.toLowerCase()))
    : convs

  return (
    <div
      className="flex flex-col overflow-hidden flex-shrink-0 w-full md:w-[340px]"
      style={{ background: 'rgba(255,255,255,0.03)', borderRight: '0.5px solid rgba(255,255,255,0.08)' }}
    >
      {/* En-tête + recherche */}
      <div className="px-4 pt-5 pb-3 flex-shrink-0" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div className="font-extrabold text-[16px] mb-3" style={{ color: '#ffffff', fontFamily: "'Outfit', sans-serif" }}>Messages</div>
        <div className="relative">
          <Search size={15} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.35)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher une conversation…"
            className="w-full pl-9 pr-3.5 py-2.5 rounded-[14px] text-[13px] border outline-none transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)', color: '#ffffff' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.5)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto p-1.5">
        {convs.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <div className="text-center mt-10 text-[13px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Aucun résultat pour «&nbsp;{query}&nbsp;»
          </div>
        ) : (
          filtered.map((c, idx) => {
            const isActive = activeId === c.id
            const showHeader = !!c.sectionLabel && c.sectionLabel !== filtered[idx - 1]?.sectionLabel
            const isOnline = !!(c.otherUserId && onlineIds?.has(c.otherUserId))
            const hasUnread = !!c.unread && c.unread > 0

            return (
              <div key={c.id}>
                {showHeader && (
                  <div className="px-2.5 pt-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {c.sectionLabel}
                  </div>
                )}
                <button
                  onClick={() => onSelect(c.id)}
                  className="flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-[14px] w-full cursor-pointer transition-colors mb-0.5 text-left relative"
                  style={{
                    background: isActive ? 'rgba(16,185,129,0.10)' : 'transparent',
                    borderLeft: isActive ? '2px solid #10B981' : '2px solid transparent',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  {/* Avatar + ring non-lu + pastille en ligne */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-[14px] text-white overflow-hidden"
                      style={{
                        background: c.avatarUrl ? 'transparent' : c.color,
                        boxShadow: hasUnread ? '0 0 0 2px #0A0A0A, 0 0 0 4px #10B981' : 'none',
                      }}
                    >
                      {c.avatarUrl ? (
                        <Image src={c.avatarUrl} alt={c.initials} width={44} height={44} className="w-11 h-11 rounded-full object-cover" />
                      ) : c.initials}
                    </div>
                    {isOnline && (
                      <span
                        className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                        style={{ background: '#10B981', borderColor: '#0A0A0A' }}
                      />
                    )}
                  </div>

                  {/* Textes */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[13.5px] truncate"
                        style={{ color: isActive ? '#10B981' : '#ffffff', fontWeight: hasUnread ? 700 : 600 }}
                      >
                        {c.name}
                      </span>
                      {c.certLevel ? <CertificationBadge level={c.certLevel} size="sm" /> : null}
                    </div>
                    <div
                      className="text-[12px] truncate mt-0.5"
                      style={{ color: hasUnread ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.4)', maxWidth: '190px', fontWeight: hasUnread ? 600 : 400 }}
                    >
                      {c.preview}
                    </div>
                  </div>

                  {/* Timestamp + badge non-lu */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <div className="text-[10.5px]" style={{ color: hasUnread ? '#10B981' : 'rgba(255,255,255,0.3)', fontWeight: hasUnread ? 700 : 400 }}>{c.time}</div>
                    {hasUnread ? (
                      <div
                        className="min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white"
                        style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 2px 6px rgba(16,185,129,0.4)' }}
                      >
                        {c.unread! > 9 ? '9+' : c.unread}
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

function EmptyState() {
  return (
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
        style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 14px rgba(16,185,129,.35)' }}
      >
        🔥 Aller swiper
      </a>
    </div>
  )
}
