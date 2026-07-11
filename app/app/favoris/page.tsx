'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import Button from '@/components/ui/Button'
import Emoji from '@/components/ui/Emoji'
import CertificationBadge, { type CertLevel } from '@/components/ui/CertificationBadge'
import { IsalyScoreBadge } from '@/components/ui/IsalyScore'
import { BentoStyles, CountUp } from '@/components/ui/Bento'
import { createClient } from '@/lib/supabase/client'
import { computeCompatibility } from '@/lib/matching'
import type { Listing } from '@/types/database'

// ═══════════════ Types & constantes ═══════════════

interface FavProfile {
  id: string
  first_name: string | null
  last_name: string | null
  city: string | null
  bio: string | null
  budget_max: number | null
  avatar_url: string | null
  cert_level: number | null
  last_seen: string | null
  matching_data: unknown
}

type Tab = 'annonces' | 'profils'

const OUTFIT = "'Outfit', sans-serif"

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
  overflow: 'hidden',
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
}

const exitAnim = { opacity: 0, scale: 0.85, transition: { duration: 0.22 } }

const BOOST_BADGE: Record<string, { label: string; icon: string } | undefined> = {
  featured: { label: 'Boostée', icon: '⚡' },
  priority: { label: 'Prioritaire', icon: '🚀' },
}

function isOnline(lastSeen: string | null): boolean {
  return !!lastSeen && Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000
}

// ═══════════════ Briques UI ═══════════════

function CompatBadge({ pct }: { pct: number }) {
  return (
    <span style={{
      fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px',
      background: 'rgba(16,185,129,0.9)', color: '#fff', backdropFilter: 'blur(4px)',
      fontFamily: OUTFIT,
    }}>{pct}% compatible</span>
  )
}

function HeartToggle({ onRemove, label }: { onRemove: () => void; label: string }) {
  return (
    <motion.button
      type="button" aria-label={label} whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.75 }}
      onClick={e => { e.stopPropagation(); onRemove() }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 38, height: 38, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
      }}>
      <Heart size={17} fill="#10B981" color="#10B981" />
    </motion.button>
  )
}

function EmptyTab({ title, sub, cta, href }: { title: string; sub: string; cta: string; href: string }) {
  const router = useRouter()
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      style={{ ...cardStyle, borderRadius: '20px', padding: '72px 24px', textAlign: 'center' }}>
      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.1"
        strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 20px', display: 'block', opacity: 0.8 }}>
        <path d="M19.5 12.57 12 20l-7.5-7.43A5 5 0 1 1 12 6.01a5 5 0 1 1 7.5 6.56Z" />
        <path d="M9.5 11.5h5" strokeDasharray="1 3" opacity="0.5" />
      </svg>
      <div style={{ fontFamily: OUTFIT, fontSize: '19px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{title}</div>
      <div style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '28px', lineHeight: 1.6 }}>{sub}</div>
      <Button onClick={() => router.push(href)}>{cta}</Button>
    </motion.div>
  )
}

function SkeletonGrid({ cols, count, height }: { cols: string; count: number; height: number }) {
  return (
    <div className={`grid gap-4 ${cols}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="shimmer" style={{ ...cardStyle, height, border: '1px solid rgba(255,255,255,0.05)' }} />
      ))}
    </div>
  )
}

// ═══════════════ Cards ═══════════════

function ListingCard({ l, compat, onRemove }: { l: Listing; compat: number | null; onRemove: () => void }) {
  const router = useRouter()
  const total = l.capacity_total ?? l.occupants_current + (l.rooms_available ?? 0)
  const boost = BOOST_BADGE[l.boost_type]
  const details = [
    l.city,
    l.surface ? `${l.surface} m²` : null,
    l.rooms_available != null ? `${l.rooms_available} ch. dispo` : null,
  ].filter(Boolean).join(' · ')

  return (
    <article className="fav-card" role="link" tabIndex={0} aria-label={l.title ?? `Colocation à ${l.city}`}
      onClick={() => router.push(`/app/annonce/${l.id}`)}
      onKeyDown={e => { if (e.key === 'Enter') router.push(`/app/annonce/${l.id}`) }}
      style={{ ...cardStyle, cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Cover 4:3 + overlay + badges */}
      <div style={{
        position: 'relative', aspectRatio: '4 / 3', flexShrink: 0,
        background: l.photos?.[0] ? `url(${l.photos[0]}) center/cover` : 'linear-gradient(135deg, #064E3B, #047857)',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.55))' }} />
        {compat != null && (
          <div style={{ position: 'absolute', top: 12, left: 12 }}><CompatBadge pct={compat} /></div>
        )}
        {boost && (
          <span style={{
            position: 'absolute', top: 12, right: 12, fontSize: '11px', fontWeight: 800,
            padding: '4px 10px', borderRadius: '20px', fontFamily: OUTFIT,
            background: 'rgba(245,158,11,0.9)', color: '#1C1200', backdropFilter: 'blur(4px)',
          }}><Emoji native={boost.icon} size="11px" /> {boost.label}</span>
        )}
        {l.owner_id && (
          <span style={{ position: 'absolute', bottom: 12, right: 12 }}>
            <IsalyScoreBadge userId={l.owner_id} size={30} />
          </span>
        )}
      </div>

      {/* Contenu */}
      <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        <div style={{ fontFamily: OUTFIT, fontSize: '15.5px', fontWeight: 700, color: '#fff' }}>
          {l.title || `Colocation à ${l.city ?? '…'}`}
        </div>
        <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)' }}>{details || '—'}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
          <span style={{ fontFamily: OUTFIT, fontSize: '17px', fontWeight: 800, color: '#10B981' }}>
            {l.rent != null ? `${l.rent} €` : '— €'}<span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(16,185,129,0.7)' }}>/mois</span>
          </span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            <Emoji native="👥" size="12px" /> {l.occupants_current}/{total} places
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: 'auto', paddingTop: '14px' }}>
          <Button size="sm" variant="secondary"
            onClick={e => { e.stopPropagation(); router.push(`/app/messages?owner=${l.owner_id}`) }}>
            Contacter
          </Button>
          <HeartToggle onRemove={onRemove} label="Retirer cette annonce des favoris" />
        </div>
      </div>
    </article>
  )
}

function ProfileCard({ p, compat, onRemove }: { p: FavProfile; compat: number | null; onRemove: () => void }) {
  const router = useRouter()
  const online = isOnline(p.last_seen)
  const initials = `${p.first_name?.[0] ?? '?'}${p.last_name?.[0] ?? ''}`.toUpperCase()
  const goProfile = () => router.push(`/app/profil-public/${p.id}`)

  return (
    <article className="fav-card" role="link" tabIndex={0} aria-label={`Profil de ${p.first_name ?? 'colocataire'}`}
      onClick={goProfile} onKeyDown={e => { if (e.key === 'Enter') goProfile() }}
      style={{ ...cardStyle, cursor: 'pointer', padding: '24px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '100%' }}>

      <div style={{ position: 'relative', marginBottom: '12px' }} title={online ? 'En ligne' : undefined}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
          background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : 'linear-gradient(135deg, #10B981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: OUTFIT, fontSize: '22px', fontWeight: 800, color: '#fff',
          boxShadow: online ? '0 0 0 2px #0A0A0A, 0 0 0 4px #10B981' : 'none',
        }}>{!p.avatar_url && initials}</div>
        {online && (
          <span style={{
            position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: '50%',
            background: '#10B981', border: '2.5px solid #0A0A0A',
          }} />
        )}
      </div>

      <div style={{ fontFamily: OUTFIT, fontSize: '15.5px', fontWeight: 700, color: '#fff' }}>
        {p.first_name ?? 'Utilisateur'} {p.last_name ? `${p.last_name[0]}.` : ''}
      </div>
      <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
        {[p.city ?? 'Ville non renseignée', p.budget_max ? `${p.budget_max} €/mois max` : null].filter(Boolean).join(' · ')}
      </div>

      {(p.cert_level ?? 0) > 0 || compat != null ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <IsalyScoreBadge userId={p.id} size={26} />
          {(p.cert_level ?? 0) > 0 && <CertificationBadge level={(p.cert_level ?? 0) as CertLevel} size="sm" />}
          {compat != null && (
            <span style={{
              fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '20px', fontFamily: OUTFIT,
              background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.35)',
            }}>{compat}% compatible</span>
          )}
        </div>
      ) : null}

      {p.bio && (
        <p style={{
          fontSize: '12.5px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.55, margin: '10px 0 0',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{p.bio}</p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 'auto', paddingTop: '16px' }}>
        <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); goProfile() }}>
          Voir le profil
        </Button>
        <HeartToggle onRemove={onRemove} label="Retirer ce profil des favoris" />
      </div>
    </article>
  )
}

// ═══════════════ Page ═══════════════

export default function FavorisPage() {
  const [tab, setTab] = useState<Tab>('annonces')
  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState<Listing[]>([])
  const [profiles, setProfiles] = useState<FavProfile[]>([])
  /** matching_data des owners d'annonces, indexé par owner_id (badge % compat sur les cards annonces). */
  const [ownersMatching, setOwnersMatching] = useState<Record<string, unknown>>({})
  const [myMatching, setMyMatching] = useState<unknown>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/favorites')
        const { favorites } = await res.json()
        const supabase = createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: me } = await supabase.from('profiles').select('matching_data').eq('id', user.id).maybeSingle()
          setMyMatching(me?.matching_data ?? null)
        }

        if (favorites?.length) {
          const listingIds = favorites.filter((f: { target_type: string }) => f.target_type === 'listing').map((f: { target_id: string }) => f.target_id)
          const profileIds = favorites.filter((f: { target_type: string }) => f.target_type === 'profile').map((f: { target_id: string }) => f.target_id)

          const [ls, ps] = await Promise.all([
            listingIds.length ? supabase.from('listings').select('*').in('id', listingIds) : Promise.resolve({ data: [] }),
            profileIds.length
              ? supabase.from('profiles').select('id, first_name, last_name, city, bio, budget_max, avatar_url, cert_level, last_seen, matching_data').in('id', profileIds)
              : Promise.resolve({ data: [] }),
          ])
          const listingRows = (ls.data ?? []) as Listing[]
          setListings(listingRows)
          setProfiles((ps.data ?? []) as FavProfile[])

          const ownerIds = Array.from(new Set(listingRows.map(l => l.owner_id).filter(Boolean))) as string[]
          if (ownerIds.length) {
            const { data: owners } = await supabase.from('profiles').select('id, matching_data').in('id', ownerIds)
            setOwnersMatching(Object.fromEntries((owners ?? []).map(o => [o.id, o.matching_data])))
          }
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  /** Retrait optimiste : AnimatePresence anime la sortie, l'API togglera côté serveur. */
  function removeFavorite(targetId: string, targetType: 'listing' | 'profile') {
    if (targetType === 'listing') setListings(ls => ls.filter(l => l.id !== targetId))
    else setProfiles(ps => ps.filter(p => p.id !== targetId))
    fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_id: targetId, target_type: targetType }),
    }).catch(() => {})
  }

  const compatWith = (md: unknown): number | null => {
    const r = computeCompatibility(myMatching, md)
    return r ? Math.round(r.score) : null
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'annonces', label: 'Annonces', count: listings.length },
    { id: 'profils', label: 'Profils', count: profiles.length },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Topbar title="Mes favoris" />
      <BentoStyles />
      <style>{`
        .fav-card { transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease; }
        .fav-card:hover { transform: translateY(-4px); border-color: rgba(16,185,129,0.45) !important; box-shadow: 0 10px 36px rgba(16,185,129,0.14); }
        .fav-card:focus-visible { outline: 2px solid #10B981; outline-offset: 2px; }
      `}</style>

      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 24px 64px' }}>

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: OUTFIT, fontSize: '28px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Mes favoris</h1>
            <div style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.4)' }}>
              {loading ? 'Chargement de vos favoris…' : (
                <><CountUp value={listings.length} /> annonce{listings.length > 1 ? 's' : ''} · <CountUp value={profiles.length} /> profil{profiles.length > 1 ? 's' : ''} sauvegardé{profiles.length > 1 ? 's' : ''}</>
              )}
            </div>
          </div>
          {!loading && listings.length + profiles.length > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              fontSize: '12px', fontWeight: 800, padding: '6px 14px', borderRadius: '20px', fontFamily: OUTFIT,
              background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.35)',
            }}>
              <Heart size={12} fill="#10B981" color="#10B981" />
              <CountUp value={listings.length + profiles.length} /> favoris
            </span>
          )}
        </motion.div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '28px' }}>
          {tabs.map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              style={{
                position: 'relative', padding: '10px 2px 12px', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: OUTFIT, fontSize: '14px', fontWeight: 700,
                color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.45)', transition: 'color 0.18s ease',
              }}>
              {t.label}
              {!loading && (
                <span style={{
                  marginLeft: '8px', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px',
                  background: tab === t.id ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                  color: tab === t.id ? '#10B981' : 'rgba(255,255,255,0.4)',
                }}>{t.count}</span>
              )}
              {tab === t.id && (
                <motion.div layoutId="fav-tab-underline"
                  style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, background: '#10B981', borderRadius: 2 }} />
              )}
            </button>
          ))}
        </div>

        {/* ── Contenu du tab (crossfade 200ms) ── */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {tab === 'annonces' ? (
              loading ? (
                <SkeletonGrid cols="grid-cols-1 md:grid-cols-2" count={4} height={340} />
              ) : listings.length === 0 ? (
                <EmptyTab title="Aucune annonce sauvegardée"
                  sub="Explorez les colocations et touchez le cœur pour retrouver vos annonces préférées ici."
                  cta="Explorer les annonces" href="/app/recherche" />
              ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="visible"
                  className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <AnimatePresence>
                    {listings.map(l => (
                      <motion.div key={l.id} layout variants={itemVariants} exit={exitAnim}>
                        <ListingCard l={l}
                          compat={l.owner_id ? compatWith(ownersMatching[l.owner_id]) : null}
                          onRemove={() => removeFavorite(l.id, 'listing')} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )
            ) : (
              loading ? (
                <SkeletonGrid cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" count={6} height={260} />
              ) : profiles.length === 0 ? (
                <EmptyTab title="Aucun profil sauvegardé"
                  sub="Swipez des profils de colocataires et sauvegardez vos coups de cœur pour les retrouver ici."
                  cta="Trouver des colocataires" href="/app/swipe" />
              ) : (
                <motion.div variants={containerVariants} initial="hidden" animate="visible"
                  className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence>
                    {profiles.map(p => (
                      <motion.div key={p.id} layout variants={itemVariants} exit={exitAnim}>
                        <ProfileCard p={p} compat={compatWith(p.matching_data)}
                          onRemove={() => removeFavorite(p.id, 'profile')} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
