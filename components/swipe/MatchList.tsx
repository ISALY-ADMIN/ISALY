'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/Badge'

interface MatchItem {
  name: string
  initials: string
  color: string
  job: string
  match: number
}

interface MatchListProps {
  matches: MatchItem[]
}

export default function MatchList({ matches }: MatchListProps) {
  const router = useRouter()

  function openConv(name: string) {
    router.push(`/app/messages?with=${encodeURIComponent(name)}`)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden flex-shrink-0" style={{ width: '300px', background: 'rgba(255,255,255,0.03)', borderLeft: '0.5px solid rgba(255,255,255,0.06)' }}>
      {/* Header */}
      <div className="px-5 py-5 flex-shrink-0" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '18px', color: '#ffffff', marginBottom: '3px' }}>
          Matchs récents
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Profils compatibles avec toi</div>
        {matches.length > 0 && (
          <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
            {matches.length} match{matches.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
          <div className="text-[52px] mb-4" style={{ animation: 'bop 1.6s ease infinite' }}>❤️</div>
          <div className="font-bold mb-2" style={{ fontFamily: "'DM Serif Display', serif", fontSize: '16px', color: '#ffffff' }}>
            Tes matchs apparaîtront ici
          </div>
          <div className="text-[12.5px]" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
            Swipe sur des profils compatibles pour commencer !
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {matches.map((m, i) => (
            <button
              key={i}
              onClick={() => openConv(m.name)}
              className="flex items-center gap-3 p-3 rounded-[12px] w-full border-none cursor-pointer transition-all mb-0.5 text-left"
              style={{ background: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateX(2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = '' }}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm text-white" style={{ background: m.color }}>
                  {m.initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ background: '#4ECBA0', borderColor: '#0A0A0A' }} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate" style={{ color: '#ffffff' }}>{m.name}</div>
                <div className="text-[11.5px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{m.job}</div>
              </div>

              {/* Match score */}
              {m.match > 0 && (
                <span className="font-bold flex-shrink-0 text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                  ♥ {m.match}%
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
