'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'

export interface MatchItem {
  name: string
  initials: string
  color: string
  job: string
  match: number
  avatarUrl?: string | null
  timeAgo?: string
  preview?: string
}

interface MatchListProps {
  matches: MatchItem[]
}

function EmptyIllustration() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <circle cx="48" cy="48" r="40" stroke="rgba(16,185,129,0.25)" strokeWidth="1.5" strokeDasharray="4 6" />
      <circle cx="36" cy="44" r="13" stroke="#10B981" strokeWidth="2" fill="rgba(16,185,129,0.08)" />
      <circle cx="60" cy="44" r="13" stroke="rgba(16,185,129,0.5)" strokeWidth="2" fill="rgba(16,185,129,0.04)" />
      <path
        d="M48 66c-1.8-1.6-6-4.4-6-7.4 0-2 1.6-3.6 3.6-3.6 1 0 1.9.4 2.4 1.2.5-.8 1.4-1.2 2.4-1.2 2 0 3.6 1.6 3.6 3.6 0 3-4.2 5.8-6 7.4z"
        fill="#10B981"
      />
    </svg>
  )
}

export default function MatchList({ matches }: MatchListProps) {
  const router = useRouter()

  function openConv(name: string) {
    router.push(`/app/messages?with=${encodeURIComponent(name)}`)
  }

  return (
    <div
      className="h-full flex flex-col overflow-hidden flex-shrink-0"
      style={{
        width: '320px',
        background: 'rgba(255,255,255,0.02)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Header */}
      <div className="px-5 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '17px', fontWeight: 700, color: '#fff' }}>
            Matchs récents
          </div>
          {matches.length > 0 && (
            <span
              style={{
                fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)',
              }}
            >
              {matches.length}
            </span>
          )}
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
          Profils compatibles avec toi
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
          <div className="mb-4"><EmptyIllustration /></div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>
            Tes matchs apparaîtront ici
          </div>
          <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            Swipe sur des profils compatibles pour commencer !
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-2 px-2.5">
          {matches.map((m, i) => (
            <button
              key={i}
              onClick={() => openConv(m.name)}
              className="flex items-center gap-3 p-3 rounded-2xl w-full border-none cursor-pointer transition-all mb-1.5 text-left"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(16,185,129,0.08)'
                e.currentTarget.style.borderColor = 'rgba(16,185,129,0.25)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
              }}
            >
              {/* Avatar ring mint */}
              <div
                className="relative flex-shrink-0 rounded-full flex items-center justify-center"
                style={{ width: 46, height: 46, padding: '2px', background: 'linear-gradient(135deg, #10B981, #059669)' }}
              >
                <div
                  className="w-full h-full rounded-full flex items-center justify-center font-extrabold text-[13px] text-white overflow-hidden"
                  style={{ background: m.color, border: '2px solid #0A0A0A' }}
                >
                  {m.avatarUrl ? (
                    <Image src={m.avatarUrl} alt={m.name} width={42} height={42} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    m.initials
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13.5px] font-semibold truncate" style={{ color: '#fff' }}>{m.name}</span>
                  {m.timeAgo && (
                    <span className="flex-shrink-0" style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.35)' }}>{m.timeAgo}</span>
                  )}
                </div>
                <div className="text-[11.5px] truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {m.preview ?? m.job}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
