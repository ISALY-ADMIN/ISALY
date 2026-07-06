'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, RefreshCw, X, MessageCircle } from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import SwipeCard, { SwipeProfile, SwipeCardHandle, SwipeDirection } from '@/components/swipe/SwipeCard'
import SwipeActions from '@/components/swipe/SwipeActions'
import MatchList, { MatchItem } from '@/components/swipe/MatchList'
import ModeSwitcher from '@/components/ModeSwitcher'
import { createClient } from '@/lib/supabase/client'
import { profilesCompatibility } from '@/lib/matching'
import { listingOccupancy } from '@/lib/utils'
import { useLease } from '@/contexts/LeaseContext'
import { useToast } from '@/hooks/use-toast'
import PushPermission from '@/components/notifications/PushPermission'
import Emoji, { EmojiText } from '@/components/ui/Emoji'

const MATCH_COLORS = ['#4ECBA0', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6']
const LIFESTYLE_TAGS = ['🌙 Couche-tard', '🌅 Lève-tôt', '🐾 Animaux ok', '🚭 Non-fumeur', '💼 CDI', '🏠 Télétravail']

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'à l’instant'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'hier' : `${d} j`
}

/* ═══════════════ Panneau de filtres (desktop + drawer mobile) ═══════════════ */

interface FilterPanelProps {
  count: number
  budget: number
  setBudget: (v: number) => void
  city: string
  setCity: (v: string) => void
  sort: string
  setSort: (v: string) => void
  lifestyle: Set<string>
  toggleLifestyle: (tag: string) => void
  mode: 'locataire' | 'loueur'
  onModeSwitch: (m: 'locataire' | 'loueur') => void
}

function FilterPanel({ count, budget, setBudget, city, setCity, sort, setSort, lifestyle, toggleLifestyle, mode, onModeSwitch }: FilterPanelProps) {
  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px',
    color: 'rgba(255,255,255,0.35)', marginBottom: '10px',
  }
  return (
    <div className="flex flex-col gap-6">
      {/* Compteur */}
      <div>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: 700, color: '#10B981', lineHeight: 1 }}>
          {count}
        </div>
        <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
          profil{count > 1 ? 's' : ''} compatible{count > 1 ? 's' : ''}
        </div>
      </div>

      {/* Mode */}
      <div>
        <div style={labelStyle}>Je cherche en tant que</div>
        <ModeSwitcher currentMode={mode} onSwitch={onModeSwitch} />
      </div>

      {/* Budget */}
      <div>
        <div style={labelStyle}>Budget maximum</div>
        <div className="flex justify-between mb-2">
          <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.55)' }}>200€</span>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#10B981' }}>
            {budget < 3000 ? `${budget}€/mois` : 'Pas de limite'}
          </span>
        </div>
        <input
          type="range" min={200} max={3000} step={50} value={budget}
          className="w-full" style={{ accentColor: '#10B981' }}
          onChange={e => setBudget(Number(e.target.value))}
        />
      </div>

      {/* Ville */}
      <div>
        <div style={labelStyle}>Ville</div>
        <input
          type="text" placeholder="Lyon, Paris…" value={city}
          onChange={e => setCity(e.target.value)}
          className="w-full outline-none transition-colors"
          style={{
            padding: '10px 14px', borderRadius: '12px', fontSize: '14px', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)', color: '#fff',
          }}
          onFocus={e => (e.target.style.borderColor = '#10B981')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
      </div>

      {/* Mode de vie */}
      <div>
        <div style={labelStyle}>Mode de vie</div>
        <div className="flex flex-wrap gap-2">
          {LIFESTYLE_TAGS.map(tag => {
            const active = lifestyle.has(tag)
            return (
              <button
                key={tag}
                onClick={() => toggleLifestyle(tag)}
                className="cursor-pointer transition-all"
                style={{
                  padding: '6px 13px', borderRadius: '20px', fontSize: '12.5px', fontFamily: "'Outfit', sans-serif",
                  border: `1.5px solid ${active ? '#10B981' : 'rgba(255,255,255,0.12)'}`,
                  background: active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                  color: active ? '#10B981' : 'rgba(255,255,255,0.55)',
                }}
              >
                <EmojiText text={tag} size="12.5px" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Tri */}
      <div>
        <div style={labelStyle}>Trier par</div>
        <div className="flex flex-col gap-2">
          {[
            { value: 'match', label: '❤️ Meilleur match' },
            { value: 'recent', label: '🕐 Plus récent' },
            { value: 'price', label: '💰 Prix croissant' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className="cursor-pointer text-left transition-all"
              style={{
                padding: '10px 14px', borderRadius: '12px', fontSize: '13px', fontFamily: "'Outfit', sans-serif",
                fontWeight: sort === opt.value ? 600 : 400,
                border: `1.5px solid ${sort === opt.value ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
                background: sort === opt.value ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                color: sort === opt.value ? '#10B981' : 'rgba(255,255,255,0.65)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════ Ghost card (pile derrière) ═══════════════ */

function GhostCard({ profile, depth }: { profile: SwipeProfile; depth: 1 | 2 }) {
  const photo = profile.photos?.[0] ?? profile.photoUrl ?? null
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={false}
      animate={{ scale: depth === 1 ? 0.95 : 0.9, y: depth === 1 ? 12 : 24, opacity: depth === 1 ? 0.6 : 0.3 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      style={{ zIndex: depth === 1 ? 2 : 1 }}
    >
      <div
        className="relative w-full h-full overflow-hidden"
        style={{ borderRadius: '24px', background: '#111111', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${profile.color}EE 0%, ${profile.color}66 100%)` }} />
        {photo && (
          <Image src={photo} alt="" fill sizes="460px" className="object-cover" draggable={false} />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent" />
      </div>
    </motion.div>
  )
}

/* ═══════════════ Match celebration ═══════════════ */

function MatchCelebration({ profile, me, onMessage, onClose }: {
  profile: SwipeProfile
  me: { initials: string; avatarUrl: string | null }
  onMessage: () => void
  onClose: () => void
}) {
  const confetti = useMemo(
    () => Array.from({ length: 22 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 2 + Math.random() * 1.6,
      size: 6 + Math.random() * 7,
      rotate: Math.random() * 360,
      shade: i % 3 === 0 ? '#10B981' : i % 3 === 1 ? '#34D399' : '#059669',
    })),
    [],
  )
  const photo = profile.photos?.[0] ?? profile.photoUrl ?? null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 overflow-hidden"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-8vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(108vh) rotate(720deg); opacity: 0.2; }
        }
      `}</style>
      {confetti.map((c, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: `${c.left}%`, top: 0, width: c.size, height: c.size * 0.45,
            background: c.shade, borderRadius: '2px',
            transform: `rotate(${c.rotate}deg)`,
            animation: `confetti-fall ${c.duration}s ${c.delay}s linear infinite`,
          }}
        />
      ))}

      <div className="flex flex-col items-center text-center" onClick={e => e.stopPropagation()}>
        {/* Avatars qui se rejoignent */}
        <div className="relative flex items-center justify-center mb-8" style={{ height: '110px' }}>
          <motion.div
            initial={{ x: -110, opacity: 0, scale: 0.6 }}
            animate={{ x: -28, opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
            className="relative z-10 rounded-full flex items-center justify-center overflow-hidden"
            style={{
              width: 96, height: 96, border: '3px solid #10B981',
              background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)',
              boxShadow: '0 0 40px rgba(16,185,129,0.45)',
              fontFamily: "'Outfit', sans-serif", fontSize: '26px', fontWeight: 800, color: '#fff',
            }}
          >
            {me.avatarUrl ? (
              <Image src={me.avatarUrl} alt="Toi" width={96} height={96} className="w-full h-full object-cover" />
            ) : (
              me.initials || 'TOI'
            )}
          </motion.div>
          <motion.div
            initial={{ x: 110, opacity: 0, scale: 0.6 }}
            animate={{ x: 28, opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
            className="relative z-20 rounded-full flex items-center justify-center overflow-hidden"
            style={{
              width: 96, height: 96, border: '3px solid #10B981',
              background: `linear-gradient(135deg, ${profile.color}, ${profile.color}99)`,
              boxShadow: '0 0 40px rgba(16,185,129,0.45)',
              fontFamily: "'Outfit', sans-serif", fontSize: '34px', fontWeight: 800, color: '#fff',
            }}
          >
            {photo ? (
              <Image src={photo} alt={profile.name} width={96} height={96} className="w-full h-full object-cover" />
            ) : (
              profile.isListing ? <Emoji native="🏠" /> : profile.name[0]
            )}
          </motion.div>
        </div>

        <motion.h2
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
          style={{ fontFamily: "'Outfit', sans-serif", fontSize: '40px', fontWeight: 700, color: '#10B981', marginBottom: '8px' }}
        >
          C&apos;est un match !
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '32px', maxWidth: '320px' }}
        >
          Toi et {profile.name.split(' ')[0]} êtes compatibles — envoyez un premier message !
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="flex flex-col gap-3 w-full"
          style={{ maxWidth: '300px' }}
        >
          <button
            onClick={onMessage}
            className="flex items-center justify-center gap-2 border-none cursor-pointer w-full"
            style={{
              padding: '14px', borderRadius: '14px', fontSize: '15px', fontWeight: 700,
              fontFamily: "'Outfit', sans-serif", color: '#fff',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              boxShadow: '0 6px 24px rgba(16,185,129,0.4)',
            }}
          >
            <MessageCircle size={17} /> Envoyer un message
          </button>
          <button
            onClick={onClose}
            className="cursor-pointer w-full"
            style={{
              padding: '13px', borderRadius: '14px', fontSize: '14px', fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)',
            }}
          >
            Continuer à swiper
          </button>
        </motion.div>
      </div>
    </div>
  )
}

/* ═══════════════ Empty state ═══════════════ */

function EmptyState({ onExpandFilters, onRestart }: { onExpandFilters: () => void; onRestart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 text-center px-8">
      <svg width="140" height="140" viewBox="0 0 140 140" fill="none" aria-hidden="true">
        <rect x="38" y="30" width="64" height="84" rx="12" stroke="rgba(16,185,129,0.4)" strokeWidth="2" fill="rgba(16,185,129,0.05)" transform="rotate(-8 70 72)" />
        <rect x="38" y="30" width="64" height="84" rx="12" stroke="#10B981" strokeWidth="2" fill="rgba(16,185,129,0.08)" transform="rotate(4 70 72)" />
        <circle cx="70" cy="62" r="12" stroke="#10B981" strokeWidth="2" transform="rotate(4 70 72)" />
        <path d="M52 96c4-8 12-12 18-12s14 4 18 12" stroke="#10B981" strokeWidth="2" strokeLinecap="round" transform="rotate(4 70 72)" />
        <circle cx="112" cy="34" r="3" fill="#10B981" opacity="0.6" />
        <circle cx="24" cy="52" r="2.5" fill="#10B981" opacity="0.4" />
        <circle cx="118" cy="96" r="2" fill="#10B981" opacity="0.5" />
      </svg>
      <div>
        <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
          Tu as tout vu pour aujourd&apos;hui
        </h3>
        <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: '320px' }}>
          De nouveaux colocataires arrivent chaque jour. Élargis tes filtres pour découvrir plus de profils.
        </p>
      </div>
      <div className="flex flex-col gap-2.5 w-full" style={{ maxWidth: '280px' }}>
        <button
          onClick={onExpandFilters}
          className="flex items-center justify-center gap-2 border-none cursor-pointer w-full"
          style={{
            padding: '13px', borderRadius: '14px', fontSize: '14px', fontWeight: 700,
            fontFamily: "'Outfit', sans-serif", color: '#fff',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            boxShadow: '0 6px 24px rgba(16,185,129,0.35)',
          }}
        >
          <SlidersHorizontal size={16} /> Élargir mes filtres
        </button>
        <button
          onClick={onRestart}
          className="flex items-center justify-center gap-2 cursor-pointer w-full"
          style={{
            padding: '12px', borderRadius: '14px', fontSize: '13.5px', fontWeight: 600,
            fontFamily: "'Outfit', sans-serif",
            background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)',
          }}
        >
          <RefreshCw size={15} /> Revoir les profils
        </button>
      </div>
    </div>
  )
}

/* ═══════════════ Page ═══════════════ */

export default function SwipePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { mode, setMode } = useLease()
  const [profiles, setProfiles] = useState<SwipeProfile[]>([])
  const [matches, setMatches] = useState<MatchItem[]>([])
  const [index, setIndex] = useState(0)
  const [cardKey, setCardKey] = useState(0)
  const [matchPopup, setMatchPopup] = useState<SwipeProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [highlightFilters, setHighlightFilters] = useState(false)
  const [filterBudget, setFilterBudget] = useState(3000)
  const [filterCity, setFilterCity] = useState('')
  const [filterSort, setFilterSort] = useState('match')
  const [lifestyle, setLifestyle] = useState<Set<string>>(new Set())
  const [undoIndex, setUndoIndex] = useState<number | null>(null)
  const [me, setMe] = useState<{ initials: string; avatarUrl: string | null }>({ initials: '', avatarUrl: null })

  const cardRef = useRef<SwipeCardHandle>(null)
  const swipeLock = useRef(false)

  const fetchProfiles = useCallback(async () => {
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
            // null = test non complété → l'UI affiche « ? », jamais un faux %
            match: p.compatibilityScore != null ? Math.round(p.compatibilityScore as number) : null,
            subScores: (p.matchBreakdown as SwipeProfile['subScores']) ?? null,
            emoji: '👤',
            color: MATCH_COLORS[i % MATCH_COLORS.length],
            tags: (p.passions as string[]) ?? [],
            bio: (p.bio as string) ?? '',
            certLevel: (p.cert_level as 0 | 1 | 2 | 3) ?? 0,
          })))
        }
      }

      const supabase = createClient()
      const [{ data: listingsData }, { data: { user } }] = await Promise.all([
        supabase
          .from('listings')
          .select('id, title, city, neighborhood, rent, rooms_available, occupants_current, capacity_total, photos, owner_id, description')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.auth.getUser(),
      ])

      if (listingsData && listingsData.length > 0) {
        // Compatibilité réelle : mon profil vs celui du loueur de chaque annonce
        let myMatchProfile: { budget_max: number | null; matching_data: unknown } | null = null
        const ownerById = new Map<string, { budget_max: number | null; matching_data: unknown }>()
        const ownerIds = Array.from(new Set(listingsData.map(l => l.owner_id).filter(Boolean))) as string[]
        if (user) {
          const { data: matchProfiles } = await supabase
            .from('profiles')
            .select('id, budget_max, matching_data')
            .in('id', [user.id, ...ownerIds])
          for (const p of matchProfiles ?? []) {
            if (p.id === user.id) myMatchProfile = p
            else ownerById.set(p.id, p)
          }
        }

        const listingProfiles: SwipeProfile[] = listingsData.map((l, i) => {
          const owner = l.owner_id ? ownerById.get(l.owner_id) : undefined
          const compat = myMatchProfile && owner ? profilesCompatibility(myMatchProfile, owner) : null
          const { current, total } = listingOccupancy(l)
          return {
            id: l.id,
            name: l.title || `Colocation à ${l.city}`,
            age: 0,
            job: 'Colocation',
            city: l.neighborhood ? `${l.city} · ${l.neighborhood}` : l.city,
            rent: l.rent ?? 0,
            match: compat?.score ?? null,
            subScores: compat?.breakdown ?? null,
            emoji: '🏠',
            color: MATCH_COLORS[i % MATCH_COLORS.length],
            tags: [],
            bio: l.description ?? '',
            certLevel: 0 as const,
            photoUrl: l.photos?.[0] ?? null,
            photos: (l.photos as string[] | null) ?? [],
            isListing: true,
            ownerId: l.owner_id,
            occupancy: { current, total },
          }
        })
        profilesList.push(...listingProfiles)
      }

      let filtered = [...profilesList]
      if (filterBudget < 3000) filtered = filtered.filter(p => p.rent <= filterBudget || p.rent === 0)
      if (filterCity.trim()) filtered = filtered.filter(p => p.city.toLowerCase().includes(filterCity.toLowerCase()))
      const isFull = (p: SwipeProfile) => !!p.occupancy && p.occupancy.total - p.occupancy.current <= 0
      if (filterSort === 'price') filtered.sort((a, b) => a.rent - b.rent)
      else filtered.sort((a, b) => (b.match ?? -1) - (a.match ?? -1))
      // Annonces complètes dépriorisées : toujours en fin de pile
      filtered.sort((a, b) => Number(isFull(a)) - Number(isFull(b)))
      setProfiles(filtered)
    } catch {}
    setLoading(false)
  }, [filterBudget, filterCity, filterSort])

  const fetchMatches = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: matchData } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id, created_at')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!matchData || matchData.length === 0) return

      const otherIds = matchData
        .map(m => m.user1_id === user.id ? m.user2_id : m.user1_id)
        .filter(Boolean) as string[]

      if (otherIds.length === 0) return

      const createdById = new Map<string, string>()
      matchData.forEach(m => {
        const other = m.user1_id === user.id ? m.user2_id : m.user1_id
        if (other && !createdById.has(other)) createdById.set(other, m.created_at)
      })

      const { data: matchProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, city, budget_max, avatar_url')
        .in('id', otherIds)

      if (!matchProfiles) return

      const mapped: MatchItem[] = matchProfiles.map((p, i) => {
        const fn = p.first_name ?? ''
        const ln = p.last_name ?? ''
        const created = createdById.get(p.id)
        return {
          name: `${fn} ${ln[0] ?? ''}.`.trim(),
          initials: `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase(),
          color: MATCH_COLORS[i % MATCH_COLORS.length],
          job: 'Colocataire',
          avatarUrl: p.avatar_url ?? null,
          timeAgo: created ? timeAgo(created) : undefined,
          preview: 'Nouveau match — dis bonjour !',
        }
      })
      setMatches(mapped)
    } catch {}
  }, [])

  // Fetch initial + refetch (débouncé) quand les filtres changent
  useEffect(() => {
    const t = setTimeout(() => {
      fetchProfiles()
      setIndex(0)
      setUndoIndex(null)
      setCardKey(k => k + 1)
    }, 350)
    return () => clearTimeout(t)
  }, [fetchProfiles])

  // Matchs + profil courant (avatar pour la célébration)
  useEffect(() => {
    fetchMatches()
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('first_name, last_name, avatar_url').eq('id', user.id).single()
      if (data) {
        setMe({
          initials: `${data.first_name?.[0] ?? ''}${data.last_name?.[0] ?? ''}`.toUpperCase(),
          avatarUrl: data.avatar_url ?? null,
        })
      }
    })()
  }, [fetchMatches])

  // Realtime : nouveaux matchs
  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      channel = supabase
        .channel('swipe-matches')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, (payload) => {
          const m = payload.new as { user1_id: string; user2_id: string }
          if (m.user1_id === user.id || m.user2_id === user.id) fetchMatches()
        })
        .subscribe()
    })
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [fetchMatches])

  const profile = profiles[index]
  const noMoreProfiles = !loading && index >= profiles.length

  async function handleSwipe(dir: SwipeDirection) {
    if (swipeLock.current) return
    swipeLock.current = true
    const swiped = profiles[index]
    const swipedIndex = index
    if (swiped) {
      try {
        const res = await fetch('/api/swipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ swipedId: swiped.id, direction: dir }),
        })
        const json = await res.json()
        if (json.matched) {
          setTimeout(() => {
            setMatchPopup(swiped)
            fetchMatches()
            toast({ title: 'Match ! 🎉', description: `Tu as un nouveau match avec ${swiped.name.split(' ')[0]} !`, duration: 3000 })
          }, 380)
        }
      } catch {}
    }
    setTimeout(() => {
      setIndex(i => i + 1)
      setUndoIndex(swipedIndex)
      setCardKey(k => k + 1)
      swipeLock.current = false
    }, 380)
  }

  function handleUndo() {
    if (undoIndex === null) return
    setIndex(undoIndex)
    setUndoIndex(null)
    setCardKey(k => k + 1)
  }

  function goMessage(name: string) {
    const current = matchPopup ?? profiles[index]
    if (current?.isListing && current?.ownerId) {
      router.push(`/app/messages?owner=${current.ownerId}`)
    } else {
      router.push(`/app/messages?with=${encodeURIComponent(name)}`)
    }
  }

  function handleModeSwitch(newMode: 'locataire' | 'loueur') {
    setMode(newMode)
    fetch('/api/profile/mode', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: newMode }),
    }).catch(() => {})
  }

  function toggleLifestyle(tag: string) {
    setLifestyle(prev => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  function expandFilters() {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setShowFilters(true)
    } else {
      setHighlightFilters(true)
      setTimeout(() => setHighlightFilters(false), 1800)
    }
  }

  // Raccourcis clavier desktop
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable) return
      if (matchPopup) return
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault(); cardRef.current?.swipe('left'); break
        case 'ArrowRight':
          e.preventDefault(); cardRef.current?.swipe('right'); break
        case 'ArrowUp':
          e.preventDefault(); cardRef.current?.swipe('super'); break
        case ' ':
          e.preventDefault(); cardRef.current?.nextPhoto(); break
        case 'z':
        case 'Z':
        case 'Backspace':
          e.preventDefault(); handleUndo(); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchPopup, undoIndex, index])

  const remaining = Math.max(0, profiles.length - index)

  const filterPanelProps: FilterPanelProps = {
    count: remaining,
    budget: filterBudget, setBudget: setFilterBudget,
    city: filterCity, setCity: setFilterCity,
    sort: filterSort, setSort: setFilterSort,
    lifestyle, toggleLifestyle,
    mode, onModeSwitch: handleModeSwitch,
  }

  return (
    <>
      <Topbar title="Trouver" />
      <PushPermission />

      <div className="flex flex-1 overflow-hidden" style={{ background: '#0A0A0A' }}>

        {/* ── Colonne gauche : filtres (desktop) ── */}
        <aside className="hidden lg:flex flex-col flex-shrink-0 overflow-y-auto p-4" style={{ width: '260px' }}>
          <div
            className="rounded-3xl p-5 transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${highlightFilters ? '#10B981' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: highlightFilters ? '0 0 0 3px rgba(16,185,129,0.25), 0 0 32px rgba(16,185,129,0.2)' : undefined,
              backdropFilter: 'blur(12px)',
            }}
          >
            <FilterPanel {...filterPanelProps} />
          </div>
        </aside>

        {/* ── Zone centrale ── */}
        <main className="flex flex-col items-center flex-1 min-w-0 overflow-hidden px-3 pt-2 pb-3">
          {/* Bouton filtres mobile */}
          <div className="lg:hidden w-full flex justify-between items-center py-1.5 flex-shrink-0">
            <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)' }}>
              {loading ? 'Recherche…' : `${remaining} profil${remaining > 1 ? 's' : ''} compatible${remaining > 1 ? 's' : ''}`}
            </span>
            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center gap-1.5 cursor-pointer"
              style={{
                background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)',
                borderRadius: '10px', padding: '6px 12px', fontSize: '12.5px', fontWeight: 600, color: '#10B981',
              }}
            >
              <SlidersHorizontal size={13} /> Filtres
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <div className="text-5xl mb-3" style={{ animation: 'bop 1s ease infinite' }}><Emoji native="🏠" /></div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Recherche de profils compatibles…</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Ça prend quelques secondes</p>
            </div>
          ) : noMoreProfiles ? (
            <div className="flex items-center justify-center flex-1">
              <EmptyState
                onExpandFilters={expandFilters}
                onRestart={() => { setIndex(0); setUndoIndex(null); setCardKey(k => k + 1) }}
              />
            </div>
          ) : (
            <>
              {/* Card stack */}
              <div
                className="relative flex-1 min-h-0 my-2"
                style={{ width: 'min(460px, 92vw)', maxHeight: '78vh' }}
              >
                {profiles[index + 2] && <GhostCard profile={profiles[index + 2]} depth={2} />}
                {profiles[index + 1] && <GhostCard profile={profiles[index + 1]} depth={1} />}
                <div className="absolute inset-0" style={{ zIndex: 3 }}>
                  <SwipeCard
                    key={`${profile.id}-${cardKey}`}
                    ref={cardRef}
                    profile={profile}
                    onSwipe={handleSwipe}
                    onMessage={goMessage}
                  />
                </div>
              </div>

              <SwipeActions
                onUndo={handleUndo}
                canUndo={undoIndex !== null}
                onPass={() => cardRef.current?.swipe('left')}
                onSuperLike={() => cardRef.current?.swipe('super')}
                onLike={() => cardRef.current?.swipe('right')}
                onInfo={() => cardRef.current?.toggleDetails()}
              />
            </>
          )}
        </main>

        {/* ── Colonne droite : matchs récents (desktop large) ── */}
        <div className="hidden xl:block h-full">
          <MatchList matches={matches} />
        </div>
      </div>

      {/* ── Drawer filtres mobile ── */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-hidden"
              style={{ width: 'min(320px, 88vw)', background: '#111111', boxShadow: '-8px 0 32px rgba(0,0,0,0.4)' }}
            >
              <div className="flex items-center justify-between flex-shrink-0" style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 700, color: '#fff' }}>Filtres</div>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex items-center justify-center border-none cursor-pointer rounded-full"
                  style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                  aria-label="Fermer"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto" style={{ padding: '20px 24px' }}>
                <FilterPanel {...filterPanelProps} />
              </div>
              <div className="flex-shrink-0" style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-full border-none cursor-pointer"
                  style={{
                    padding: '14px', borderRadius: '14px', fontSize: '15px', fontWeight: 700,
                    fontFamily: "'Outfit', sans-serif", color: '#fff',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                  }}
                >
                  Appliquer les filtres
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Match celebration ── */}
      <AnimatePresence>
        {matchPopup && (
          <MatchCelebration
            profile={matchPopup}
            me={me}
            onMessage={() => { const p = matchPopup; setMatchPopup(null); goMessage(p.name) }}
            onClose={() => setMatchPopup(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
