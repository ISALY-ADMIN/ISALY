'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import SwipeCard, { SwipeProfile } from '@/components/swipe/SwipeCard'
import SwipeActions from '@/components/swipe/SwipeActions'
import MatchList from '@/components/swipe/MatchList'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

const MATCH_COLORS = ['#4ECBA0', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6']

interface MatchItem {
  name: string
  initials: string
  color: string
  job: string
  match: number
}

export default function SwipePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [profiles, setProfiles] = useState<SwipeProfile[]>([])
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [index, setIndex] = useState(0)
  const [matchPopup, setMatchPopup] = useState<SwipeProfile | null>(null)
  const [cardKey, setCardKey] = useState(0)
  const [swipeHint, setSwipeHint] = useState<'like' | 'nope' | 'super' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfiles()
    fetchMatches()
  }, [])

  async function fetchProfiles() {
    try {
      const profilesList: SwipeProfile[] = []

      const res = await fetch('/api/match')
      if (res.ok) {
        const json = await res.json()
        if (json.profiles) {
          profilesList.push(...(json.profiles as Record<string, unknown>[]).map((p, i) => ({
            id: p.id as string,
            name: `${(p.first_name as string) ?? ''} ${((p.last_name as string) ?? '')[0] ?? ''}.`.trim(),
            age: 0,
            job: 'Colocataire',
            city: (p.city as string) ?? 'Ville non renseignée',
            rent: (p.budget_max as number) ?? 0,
            match: Math.round((p.compatibilityScore as number) ?? 0),
            emoji: '👤',
            color: MATCH_COLORS[i % MATCH_COLORS.length],
            tags: (p.passions as string[]) ?? [],
            bio: (p.bio as string) ?? '',
            certLevel: (p.cert_level as 0 | 1 | 2 | 3) ?? 0,
          })))
        }
      }

      const supabase = createClient()
      const { data: listingsData } = await supabase
        .from('listings')
        .select('id, title, city, neighborhood, rent, rooms_available, photos, owner_id, description')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20)

      if (listingsData && listingsData.length > 0) {
        const listingProfiles: SwipeProfile[] = listingsData.map((l, i) => ({
          id: l.id,
          name: l.title || `Colocation à ${l.city}`,
          age: 0,
          job: `${l.rooms_available ?? 1} chambre${(l.rooms_available ?? 1) > 1 ? 's' : ''} disponible${(l.rooms_available ?? 1) > 1 ? 's' : ''}`,
          city: l.neighborhood ? `${l.city} · ${l.neighborhood}` : l.city,
          rent: l.rent ?? 0,
          match: Math.floor(Math.random() * 20) + 75,
          emoji: '🏠',
          color: MATCH_COLORS[i % MATCH_COLORS.length],
          tags: [],
          bio: l.description ?? '',
          certLevel: 0,
          photoUrl: l.photos?.[0] ?? null,
          isListing: true,
          ownerId: l.owner_id,
        }))
        profilesList.push(...listingProfiles)
      }

      setProfiles(profilesList)
    } catch {}
    setLoading(false)
  }

  async function fetchMatches() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: matchData } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!matchData || matchData.length === 0) return

      const otherIds = matchData
        .map(m => m.user1_id === user.id ? m.user2_id : m.user1_id)
        .filter(Boolean) as string[]

      if (otherIds.length === 0) return

      const { data: matchProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, city, budget_max')
        .in('id', otherIds)

      if (!matchProfiles) return

      const mapped: MatchItem[] = matchProfiles.map((p, i) => {
        const fn = p.first_name ?? ''
        const ln = p.last_name ?? ''
        return {
          name: `${fn} ${ln[0] ?? ''}.`.trim(),
          initials: `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase(),
          color: MATCH_COLORS[i % MATCH_COLORS.length],
          job: 'Colocataire',
          match: 0,
        }
      })
      setMatches(mapped)
    } catch {}
  }

  const profile = profiles[index]

  async function handleSwipe(dir: 'left' | 'right' | 'super') {
    setSwipeHint(null)
    if (profile) {
      try {
        const res = await fetch('/api/swipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ swipedId: profile.id, direction: dir }),
        })
        const json = await res.json()
        if (json.matched) {
          setTimeout(() => {
            setMatchPopup(profile)
            fetchMatches()
            toast({ title: 'Match ! 🎉', description: `Tu as un nouveau match avec ${profile.name.split(' ')[0]} !`, duration: 3000 })
          }, 380)
        }
      } catch {}
    }
    setTimeout(() => {
      setIndex(i => i + 1)
      setCardKey(k => k + 1)
    }, 430)
  }

  function goMessage(name: string) {
    router.push(`/app/messages?with=${encodeURIComponent(name)}`)
  }

  const noMoreProfiles = !loading && index >= profiles.length

  return (
    <>
      <Topbar title="Trouver" />
      <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F4F0]">

        {/* Status bar */}
        <div style={{ background: '#F0F4F0', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#6B7280' }}>
              {profiles.length > 0 ? `${profiles.length} profils compatibles trouvés` : 'Recherche en cours...'}
            </span>
            <span style={{ fontSize: '11px', background: '#ECFDF5', color: '#059669', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
              Près de toi
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
              {index + 1}/{profiles.length > 0 ? profiles.length : '?'} vus
            </span>
            <button
              onClick={() => console.log('filtres')}
              style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 500, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              ⚙️ Filtres
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main swipe area */}
          <div className="flex flex-col items-center justify-center gap-6 flex-1 overflow-y-auto p-7 bg-[#F0F4F0]">
            {loading ? (
              <div className="text-center">
                <div className="text-5xl mb-3" style={{ animation: 'bop 1s ease infinite' }}>🏠</div>
                <p className="text-sm font-semibold text-gray-500">Recherche de profils compatibles…</p>
                <p className="text-xs mt-1 text-gray-400">Ça prend quelques secondes</p>
              </div>
            ) : noMoreProfiles ? (
              <div className="flex flex-col items-center justify-center gap-4 text-center bg-white rounded-2xl px-8 py-12 shadow-md" style={{ maxWidth: '340px' }}>
                <span className="text-6xl" style={{ animation: 'bop 1.4s ease infinite' }}>🏠</span>
                <h3 className="text-xl font-bold text-gray-900 font-serif">
                  Tous les profils ont été vus !
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Reviens demain, de nouveaux colocataires arrivent chaque jour.
                </p>
                <div className="flex flex-col gap-2.5 w-full">
                  <button
                    onClick={() => { setIndex(0); setCardKey(k => k + 1) }}
                    className="w-full px-6 py-2.5 rounded-full text-sm font-semibold text-white border-none cursor-pointer bg-mint hover:bg-mint-dark transition-colors"
                  >
                    🔄 Recommencer
                  </button>
                  <button
                    onClick={() => console.log('filtres')}
                    className="w-full px-6 py-2.5 rounded-full text-sm font-semibold border border-gray-200 text-gray-500 cursor-pointer hover:border-mint hover:text-mint transition-colors bg-transparent"
                  >
                    Affiner mes filtres
                  </button>
                </div>
              </div>
            ) : (
              <>
                {index > 0 && (
                  <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#9CA3AF', background: 'rgba(255,255,255,0.7)', padding: '4px 12px', borderRadius: '20px', backdropFilter: 'blur(4px)' }}>
                      {index} profil{index > 1 ? 's' : ''} vu{index > 1 ? 's' : ''} aujourd&apos;hui
                    </span>
                  </div>
                )}
                <SwipeCard
                  key={cardKey}
                  profile={profile}
                  onSwipe={handleSwipe}
                  onMessage={goMessage}
                  hint={swipeHint}
                />
                <SwipeActions
                  onPass={() => handleSwipe('left')}
                  onSuperLike={() => handleSwipe('super')}
                  onLike={() => handleSwipe('right')}
                  onHint={setSwipeHint}
                />
              </>
            )}
          </div>

          {/* Matches sidebar */}
          <MatchList matches={matches} />
        </div>
      </div>

      {/* Match popup */}
      {matchPopup && (
        <div
          className="fixed inset-0 flex items-center justify-center p-5 z-50"
          style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(6px)' }}
          onClick={() => setMatchPopup(null)}
        >
          <div
            className="rounded-[28px] p-10 text-center animate-pop-in"
            style={{
              maxWidth: '360px',
              width: '100%',
              background: '#FFFFFF',
              boxShadow: '0 24px 80px rgba(0,0,0,.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-[56px] mb-3">🎉</div>
            <h2
              className="text-[30px] mb-2"
              style={{ color: '#4ECBA0', fontFamily: "'DM Serif Display', serif" }}
            >
              C&apos;est un match !
            </h2>
            <p className="text-[13.5px] mb-6" style={{ color: '#6B7280' }}>
              Toi & {matchPopup.name} — envoyez un premier message !
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => { setMatchPopup(null); goMessage(matchPopup.name) }}
                className="flex-1 py-3 rounded-full text-[13.5px] font-bold text-white border-none cursor-pointer transition-all"
                style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)', boxShadow: '0 4px 16px rgba(78,203,160,.35)' }}
              >
                💬 Message
              </button>
              <button
                onClick={() => setMatchPopup(null)}
                className="flex-1 py-3 rounded-full text-[13.5px] font-semibold border cursor-pointer transition-colors"
                style={{ background: '#FFFFFF', color: '#6B7280', borderColor: '#E5E7EB' }}
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
