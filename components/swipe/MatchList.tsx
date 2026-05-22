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
      style={{ background: '#FFFFFF', borderColor: '#E5E7EB', width: '320px' }}
    >
      <div className="px-5 py-4 border-b flex-shrink-0" style={{ borderColor: '#E5E7EB' }}>
        <div className="text-[15px] font-bold mb-0.5" style={{ color: '#111827' }}>Matchs récents</div>
        <div className="text-[12px]" style={{ color: '#6B7280' }}>Profils compatibles avec toi</div>
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
          <div className="text-[44px] mb-3">🏠</div>
          <div className="text-[14px] font-semibold mb-1" style={{ color: '#111827' }}>Pas encore de match</div>
          <div className="text-[12.5px]" style={{ color: '#9CA3AF' }}>Commence à swiper pour trouver ton coloc !</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2.5">
          {matches.map((m, i) => (
            <button
              key={i}
              onClick={() => openConv(m.name)}
              className="flex items-center gap-3 p-3 rounded-[12px] w-full border-none cursor-pointer transition-colors mb-1 text-left"
              style={{ background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm text-white flex-shrink-0"
                style={{ background: m.color }}
              >
                {m.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate" style={{ color: '#111827' }}>{m.name}</div>
                <div className="text-[11.5px] truncate" style={{ color: '#9CA3AF' }}>{m.job}</div>
              </div>
              <div
                className="text-[11.5px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: '#ECFDF5', color: '#2AA87C' }}
              >
                {m.match}%
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
