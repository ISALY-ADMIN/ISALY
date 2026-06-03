'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import SwipeCard, { SwipeProfile } from '@/components/swipe/SwipeCard'
import SwipeActions from '@/components/swipe/SwipeActions'
import MatchList from '@/components/swipe/MatchList'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import PushPermission from '@/components/notifications/PushPermission'

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
  const [showFilters, setShowFilters] = useState(false)
  const [filterBudget, setFilterBudget] = useState(3000)
  const [filterCity, setFilterCity] = useState('')
  const [filterSort, setFilterSort] = useState('match')

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

      let filtered = [...profilesList]
      if (filterBudget < 3000) filtered = filtered.filter(p => p.rent <= filterBudget || p.rent === 0)
      if (filterCity.trim()) filtered = filtered.filter(p => p.city.toLowerCase().includes(filterCity.toLowerCase()))
      if (filterSort === 'price') filtered.sort((a, b) => a.rent - b.rent)
      else filtered.sort((a, b) => b.match - a.match)
      setProfiles(filtered)
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
    const current = profiles[index]
    if (current?.isListing && current?.ownerId) {
      router.push(`/app/messages?owner=${current.ownerId}`)
    } else {
      router.push(`/app/messages?with=${encodeURIComponent(name)}`)
    }
  }

  const noMoreProfiles = !loading && index >= profiles.length

  return (
    <>
      <Topbar title="Trouver" />
      <div className="flex flex-col flex-1 overflow-hidden bg-[#F0F4F0]">

        {/* Status bar */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
              {profiles.length > 0 ? `${profiles.length} profils compatibles trouvés` : 'Recherche en cours...'}
            </span>
            <span style={{ fontSize: '11px', background: '#ECFDF5', color: '#059669', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
              Près de toi
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
              {index + 1}/{profiles.length > 0 ? profiles.length : '?'} vus
            </span>
            <button
              onClick={() => setShowFilters(true)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              ⚙️ Filtres
            </button>
          </div>
        </div>

        <PushPermission />

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
                    onClick={() => setShowFilters(true)}
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
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.7)', padding: '4px 12px', borderRadius: '20px', backdropFilter: 'blur(4px)' }}>
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

      {/* Filtres drawer */}
      {showFilters && (
        <>
          <div
            onClick={() => setShowFilters(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40, backdropFilter: 'blur(2px)' }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '320px',
            background: '#111111', zIndex: 50,
            boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>Filtres</div>
              <button onClick={() => setShowFilters(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'rgba(255,255,255,0.35)' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>BUDGET MAXIMUM</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>0€</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#10B981' }}>{filterBudget < 3000 ? `${filterBudget}€/mois` : 'Pas de limite'}</span>
                </div>
                <input type="range" min={200} max={3000} step={50} value={filterBudget}
                  style={{ width: '100%', accentColor: '#10B981' }}
                  onChange={e => setFilterBudget(Number(e.target.value))}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>VILLE</div>
                <input type="text" placeholder="Lyon, Paris..." value={filterCity} onChange={e => setFilterCity(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #E5E7EB', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }}
                  onFocus={e => (e.target.style.borderColor = '#10B981')}
                  onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>MODE DE VIE</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
                  {['🌙 Couche-tard', '🌅 Lève-tôt', '🐾 Animaux ok', '🚭 Non-fumeur', '💼 CDI', '🏠 Télétravail'].map(tag => (
                    <button key={tag}
                      onClick={e => {
                        const btn = e.currentTarget
                        const active = btn.dataset.active === 'true'
                        btn.dataset.active = (!active).toString()
                        btn.style.background = !active ? '#ECFDF5' : '#F3F4F6'
                        btn.style.color = !active ? '#059669' : '#6B7280'
                        btn.style.borderColor = !active ? '#10B981' : '#E5E7EB'
                      }}
                      style={{ padding: '7px 14px', borderRadius: '20px', border: '1.5px solid #E5E7EB', background: '#F3F4F6', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>TRIER PAR</div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
                  {[
                    { value: 'match', label: '❤️ Meilleur match' },
                    { value: 'recent', label: '🕐 Plus récent' },
                    { value: 'price', label: '💰 Prix croissant' },
                  ].map(opt => (
                    <button key={opt.value}
                      onClick={() => setFilterSort(opt.value)}
                      style={{ padding: '10px 16px', borderRadius: '10px', border: `1.5px solid ${filterSort === opt.value ? '#10B981' : '#E5E7EB'}`, background: filterSort === opt.value ? '#ECFDF5' : '#F9FAFB', color: filterSort === opt.value ? '#059669' : '#374151', fontSize: '13px', fontWeight: filterSort === opt.value ? 600 : 400, cursor: 'pointer', textAlign: 'left' as const, fontFamily: "'Outfit', sans-serif" }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', flexShrink: 0 }}>
              <button
                onClick={() => { setShowFilters(false); fetchProfiles() }}
                style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
              >
                Appliquer les filtres
              </button>
            </div>
          </div>
        </>
      )}

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
              background: '#111111',
              boxShadow: '0 24px 80px rgba(0,0,0,.7)',
              border: '1px solid rgba(255,255,255,0.1)',
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
            <p className="text-[13.5px] mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
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
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.1)' }}
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
