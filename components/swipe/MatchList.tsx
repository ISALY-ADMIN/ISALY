'use client'

import { useRouter } from 'next/navigation'

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
    <div
      className="border-l flex flex-col overflow-hidden flex-shrink-0"
      style={{ background: '#FFFFFF', borderColor: '#E5E7EB', width: '300px' }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b flex-shrink-0" style={{ borderColor: '#F3F4F6' }}>
        <div className="flex items-center justify-between mb-0.5">
          <div className="text-[15px] font-bold" style={{ color: '#111827' }}>Matchs récents</div>
          {matches.length > 0 && (
            <span
              className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full"
              style={{ background: '#ECFDF5', color: '#2AA87C' }}
            >
              {matches.length}
            </span>
          )}
        </div>
        <div className="text-[12px]" style={{ color: '#9CA3AF' }}>Profils compatibles avec toi</div>
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
          <div className="text-[52px] mb-4" style={{ animation: 'bop 1.6s ease infinite' }}>❤️</div>
          <div
            className="text-[15px] font-bold mb-2"
            style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}
          >
            Tes matchs apparaîtront ici
          </div>
          <div className="text-[12.5px]" style={{ color: '#9CA3AF', lineHeight: 1.6 }}>
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
              onMouseEnter={e => {
                e.currentTarget.style.background = '#F9FAFB'
                e.currentTarget.style.transform = 'translateX(2px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.transform = ''
              }}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm text-white"
                  style={{ background: m.color }}
                >
                  {m.initials}
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                  style={{ background: '#4ECBA0', borderColor: '#FFFFFF' }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate" style={{ color: '#111827' }}>{m.name}</div>
                <div className="text-[11.5px] truncate" style={{ color: '#9CA3AF' }}>{m.job}</div>
              </div>

              {/* Match score */}
              {m.match > 0 && (
                <div
                  className="text-[11px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: '#ECFDF5', color: '#2AA87C' }}
                >
                  ♥ {m.match}%
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
