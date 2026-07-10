'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, MessageCircle, User as UserIcon, X, CheckCircle2, Sparkles,
  Home as HomeIcon, Clock, Inbox,
} from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import Button from '@/components/ui/Button'
import CertificationBadge, { type CertLevel } from '@/components/ui/CertificationBadge'
import { BentoStyles, CountUp, cardBase } from '@/components/ui/Bento'
import { createClient } from '@/lib/supabase/client'
import { computeCompatibility } from '@/lib/matching'
import type { SwipeDirection } from '@/types/database'

// ─── Types ───────────────────────────────────────────────────
interface CandidateProfile {
  id: string
  first_name: string | null
  last_name: string | null
  city: string | null
  bio: string | null
  avatar_url: string | null
  cert_level: number | null
  last_seen: string | null
  matching_data: unknown
}

interface ListingLite {
  id: string
  title: string | null
  city: string | null
  photos: string[] | null
  is_active: boolean
  created_at: string
}

interface Candidature {
  swipe_id: string
  swiper_id: string
  direction: SwipeDirection
  created_at: string
  ignored: boolean
  listing_id: string | null
  profile: CandidateProfile
  listing: ListingLite | null
  hasMatch: boolean
  conversationId: string | null
  compatibility: number | null
}

type TabFilter = 'all' | 'pending' | 'contacted' | 'matched'

const OUTFIT = "'Outfit', sans-serif"

// ─── Helpers ─────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  if (s < 30 * 86400) return `il y a ${Math.floor(s / 86400)} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isOnline(lastSeen: string | null): boolean {
  return !!lastSeen && Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000
}

// ─── Toast ───────────────────────────────────────────────────
function Toast({ msg, tone, onClose }: { msg: string; tone: 'success' | 'error'; onClose: () => void }) {
  const isErr = tone === 'error'
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      style={{
        position: 'fixed', top: '76px', left: '50%', transform: 'translateX(-50%)',
        background: isErr ? 'rgba(239,68,68,0.14)' : 'rgba(16,185,129,0.14)',
        color: isErr ? '#F87171' : '#4ECBA0',
        border: `1px solid ${isErr ? 'rgba(239,68,68,0.35)' : 'rgba(16,185,129,0.35)'}`,
        borderRadius: '12px', padding: '10px 18px', fontSize: '13px', fontWeight: 600,
        zIndex: 999, boxShadow: '0 8px 32px rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', gap: '10px', fontFamily: OUTFIT,
      }}
    >
      <CheckCircle2 size={16} strokeWidth={2.2} />
      <span>{msg}</span>
      <button
        onClick={onClose}
        aria-label="Fermer"
        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', padding: '2px' }}
      ><X size={14} /></button>
    </motion.div>
  )
}

// ─── Stats card ──────────────────────────────────────────────
function StatCard({ icon, label, value, tint }: {
  icon: React.ReactNode; label: string; value: number; tint?: string
}) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
      style={{ ...cardBase, minHeight: '96px', padding: '18px 22px', flexDirection: 'row', alignItems: 'center', gap: '16px' }}
    >
      <span style={{
        width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
        background: tint ? `${tint}18` : 'rgba(16,185,129,0.12)',
        border: `1px solid ${tint ? `${tint}40` : 'rgba(16,185,129,0.28)'}`,
        color: tint ?? '#10B981',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <CountUp value={value} style={{ fontFamily: OUTFIT, fontSize: '26px', fontWeight: 800, color: '#fff', lineHeight: 1 }} />
        <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{label}</span>
      </div>
    </motion.div>
  )
}

// ─── Candidature card ────────────────────────────────────────
function CandidatureCard({ c, onContact, onIgnore, busy }: {
  c: Candidature
  onContact: () => void
  onIgnore: () => void
  busy: boolean
}) {
  const router = useRouter()
  const online = isOnline(c.profile.last_seen)
  const initials = `${c.profile.first_name?.[0] ?? '?'}${c.profile.last_name?.[0] ?? ''}`.toUpperCase()
  const name = `${c.profile.first_name ?? 'Utilisateur'}${c.profile.last_name ? ` ${c.profile.last_name[0]}.` : ''}`
  const listingTitle = c.listing?.title || (c.listing?.city ? `Colocation à ${c.listing.city}` : 'Annonce')

  const goProfile = () => router.push(`/app/profil-public/${c.profile.id}`)

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
      className="candidature-card"
      style={{ ...cardBase, padding: 0, height: 'auto' }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', gap: '0', alignItems: 'stretch' }} className="candidature-row">
        {/* ── Avatar ─────────────────────────────────────── */}
        <div style={{
          padding: '18px 6px 18px 22px', display: 'flex', alignItems: 'center',
          flexShrink: 0,
        }}>
          <button
            type="button" onClick={goProfile}
            aria-label={`Voir le profil de ${name}`}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', position: 'relative' }}
            title={online ? 'En ligne' : undefined}
          >
            <div style={{
              width: 60, height: 60, borderRadius: '50%', overflow: 'hidden',
              background: c.profile.avatar_url
                ? `url(${c.profile.avatar_url}) center/cover`
                : 'linear-gradient(135deg, #10B981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: OUTFIT, fontSize: '20px', fontWeight: 800, color: '#fff',
              boxShadow: online ? '0 0 0 2px #0A0A0A, 0 0 0 4px #10B981' : 'none',
            }}>{!c.profile.avatar_url && initials}</div>
            {online && (
              <span style={{
                position: 'absolute', bottom: 0, right: 0, width: 13, height: 13, borderRadius: '50%',
                background: '#10B981', border: '2.5px solid #0A0A0A',
              }} />
            )}
          </button>
        </div>

        {/* ── Centre : infos ──────────────────────────────── */}
        <div style={{
          flex: 1, minWidth: 0, padding: '16px 16px 16px 12px',
          display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center',
        }}>
          {/* Ligne 1 : prénom + ville + badge cert + compat */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button" onClick={goProfile}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: OUTFIT, fontSize: '15.5px', fontWeight: 700, color: '#fff', lineHeight: 1.2,
              }}
            >{name}</button>
            {c.profile.city && (
              <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)' }}>· {c.profile.city}</span>
            )}
            {(c.profile.cert_level ?? 0) > 0 && (
              <CertificationBadge level={(c.profile.cert_level ?? 0) as CertLevel} size="sm" />
            )}
            {c.compatibility != null && (
              <span style={{
                fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '20px', fontFamily: OUTFIT,
                background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.35)',
                display: 'inline-flex', alignItems: 'center', gap: '4px',
              }}>
                <Sparkles size={11} strokeWidth={2.2} />
                {c.compatibility}%
              </span>
            )}
            {c.hasMatch && (
              <span style={{
                fontSize: '10.5px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px',
                letterSpacing: '0.4px', flexShrink: 0,
                background: 'rgba(16,185,129,0.14)', color: '#10B981', border: '1px solid rgba(16,185,129,0.35)',
              }}>● MATCH</span>
            )}
          </div>

          {/* Ligne 2 : annonce concernée (mini) */}
          {c.listing && (
            <Link
              href={`/app/annonce/${c.listing.id}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                textDecoration: 'none', color: 'rgba(255,255,255,0.75)',
                fontSize: '12.5px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px', padding: '6px 10px 6px 6px',
                width: 'fit-content', maxWidth: '100%',
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.35)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
            >
              {c.listing.photos?.[0] ? (
                <span style={{
                  width: 26, height: 26, borderRadius: '6px', overflow: 'hidden', flexShrink: 0,
                  position: 'relative', background: 'rgba(16,185,129,0.1)',
                }}>
                  <Image src={c.listing.photos[0]} alt={listingTitle} fill sizes="26px" style={{ objectFit: 'cover' }} unoptimized />
                </span>
              ) : (
                <span style={{
                  width: 26, height: 26, borderRadius: '6px', flexShrink: 0,
                  background: 'rgba(16,185,129,0.14)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981',
                }}>
                  <HomeIcon size={14} strokeWidth={1.8} />
                </span>
              )}
              <span style={{
                fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260,
              }}>{listingTitle}</span>
            </Link>
          )}

          {/* Ligne 3 : bio 1 ligne + date */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', fontSize: '12.5px' }}>
            {c.profile.bio && (
              <span style={{
                color: 'rgba(255,255,255,0.5)', lineHeight: 1.5,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 380,
              }}>{c.profile.bio}</span>
            )}
            <span style={{ color: 'rgba(255,255,255,0.35)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={11} strokeWidth={1.8} /> {timeAgo(c.created_at)}
            </span>
          </div>
        </div>

        {/* ── Actions (droite) ────────────────────────────── */}
        <div style={{
          flexShrink: 0, padding: '16px 18px',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', gap: '8px',
          justifyContent: 'center', minWidth: '180px',
        }} className="candidature-actions">
          <Button
            variant="primary" size="sm"
            onClick={onContact}
            loading={busy}
            aria-label={c.hasMatch ? 'Ouvrir la conversation' : 'Contacter ce candidat'}
          >
            <MessageCircle size={13} strokeWidth={2} />
            {c.hasMatch ? 'Ouvrir chat' : 'Contacter'}
          </Button>
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button
              variant="ghost" size="sm"
              onClick={goProfile}
              aria-label="Voir le profil complet"
              className="!px-2.5 !py-1.5"
              style={{ flex: 1 }}
            >
              <UserIcon size={13} strokeWidth={2} />
              <span style={{ fontSize: '12px' }}>Profil</span>
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={onIgnore}
              disabled={busy}
              aria-label="Ignorer cette candidature"
              className="candidature-ignore !px-2.5 !py-1.5"
              title="Ignorer"
            >
              <X size={13} strokeWidth={2} />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Empty state ─────────────────────────────────────────────
function EmptyState({ onBoost }: { onBoost: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      style={{
        ...cardBase, minHeight: '320px', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '56px 32px',
      }}
    >
      <div
        style={{
          width: 72, height: 72, borderRadius: '20px', marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.12))',
          border: '1px solid rgba(16,185,129,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Inbox size={32} color="#10B981" strokeWidth={1.5} />
      </div>
      <h3 style={{ fontFamily: OUTFIT, fontSize: '20px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
        Aucune candidature pour le moment
      </h3>
      <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, margin: '0 0 24px', maxWidth: '380px' }}>
        Boostez la visibilité de vos annonces pour recevoir plus de candidatures compatibles.
      </p>
      <Button variant="primary" size="md" onClick={onBoost}>
        <Sparkles size={16} strokeWidth={2.2} />
        Boostez vos annonces
      </Button>
    </motion.div>
  )
}

function SkeletonCard() {
  return <div className="shimmer" style={{ ...cardBase, height: '138px', padding: 0 }} />
}

// ─── Main page ───────────────────────────────────────────────
function CandidaturesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const listingFilter = searchParams.get('listing')
  const [items, setItems] = useState<Candidature[] | null>(null)
  const [tab, setTab] = useState<TabFilter>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // 1. Charge les swipes reçus (candidatures)
    const { data: swipes } = await supabase
      .from('swipes')
      .select('id, swiper_id, direction, created_at, ignored_by_target, listing_id')
      .eq('swiped_id', user.id)
      .in('direction', ['right', 'super'])
      .order('created_at', { ascending: false })

    if (!swipes || swipes.length === 0) { setItems([]); return }

    const swiperIds = Array.from(new Set(swipes.map(s => s.swiper_id).filter(Boolean))) as string[]

    // 2. Profils des candidats + mon profil (pour la compat)
    const [profilesRes, listingsRes, matchesRes, meRes] = await Promise.all([
      supabase.from('profiles')
        .select('id, first_name, last_name, city, bio, avatar_url, cert_level, last_seen, matching_data')
        .in('id', swiperIds),
      supabase.from('listings')
        .select('id, title, city, photos, is_active, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('matches')
        .select('id, user1_id, user2_id')
        .or(`and(user1_id.eq.${user.id},user2_id.in.(${swiperIds.join(',')})),and(user2_id.eq.${user.id},user1_id.in.(${swiperIds.join(',')}))`),
      supabase.from('profiles').select('matching_data').eq('id', user.id).maybeSingle(),
    ])

    const profiles = (profilesRes.data ?? []) as CandidateProfile[]
    const listings = (listingsRes.data ?? []) as ListingLite[]
    const matches = (matchesRes.data ?? []) as { id: string; user1_id: string | null; user2_id: string | null }[]
    const myMatching = meRes.data?.matching_data ?? null

    // Récupère les conversations pour les matchs trouvés
    const matchIds = matches.map(m => m.id)
    const convRes = matchIds.length
      ? await supabase.from('conversations').select('id, match_id').in('match_id', matchIds)
      : { data: [] as { id: string; match_id: string | null }[] }
    const convByMatch = new Map<string, string>()
    for (const c of (convRes.data ?? []) as { id: string; match_id: string | null }[]) {
      if (c.match_id) convByMatch.set(c.match_id, c.id)
    }

    // Map match par autre user
    const matchByOtherUser = new Map<string, { matchId: string; conversationId: string | null }>()
    for (const m of matches) {
      const other = m.user1_id === user.id ? m.user2_id : m.user1_id
      if (other) matchByOtherUser.set(other, { matchId: m.id, conversationId: convByMatch.get(m.id) ?? null })
    }

    // Fallback : plus récente active (pour swipes legacy sans listing_id)
    const listingFallback =
      listings.find(l => l.is_active) ?? listings[0] ?? null
    const listingById = new Map(listings.map(l => [l.id, l]))

    // 3. Compose les candidatures
    const profileById = new Map(profiles.map(p => [p.id, p]))
    const candidatures: Candidature[] = swipes
      .filter(s => !!s.swiper_id)
      .map(s => {
        const profile = profileById.get(s.swiper_id as string)
        if (!profile) return null
        const mHit = matchByOtherUser.get(s.swiper_id as string)
        const cmp = computeCompatibility(myMatching, profile.matching_data)
        const swipeListingId = (s as { listing_id?: string | null }).listing_id ?? null
        const listing = (swipeListingId && listingById.get(swipeListingId)) || listingFallback
        return {
          swipe_id: s.id,
          swiper_id: s.swiper_id as string,
          direction: s.direction as SwipeDirection,
          created_at: s.created_at,
          ignored: !!s.ignored_by_target,
          listing_id: swipeListingId,
          profile,
          listing,
          hasMatch: !!mHit,
          conversationId: mHit?.conversationId ?? null,
          compatibility: cmp ? Math.round(cmp.score) : null,
        } as Candidature
      })
      .filter((x): x is Candidature => x !== null)

    setItems(candidatures)
  }, [router])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4200)
    return () => clearTimeout(t)
  }, [toast])

  const filteredByListing = useMemo(() => {
    const arr = items ?? []
    if (!listingFilter) return arr
    return arr.filter(c => c.listing_id === listingFilter)
  }, [items, listingFilter])

  const activeListing = useMemo(() => {
    if (!listingFilter) return null
    return filteredByListing.find(c => c.listing)?.listing ?? null
  }, [filteredByListing, listingFilter])

  const visible = useMemo(() => {
    const notIgnored = filteredByListing.filter(c => !c.ignored)
    if (tab === 'all') return notIgnored
    if (tab === 'pending') return notIgnored.filter(c => !c.hasMatch && !c.conversationId)
    if (tab === 'contacted') return notIgnored.filter(c => c.conversationId != null && !c.hasMatch)
    if (tab === 'matched') return notIgnored.filter(c => c.hasMatch)
    return notIgnored
  }, [filteredByListing, tab])

  const stats = useMemo(() => {
    const notIgnored = filteredByListing.filter(c => !c.ignored)
    return {
      total: notIgnored.length,
      pending: notIgnored.filter(c => !c.hasMatch && !c.conversationId).length,
      matched: notIgnored.filter(c => c.hasMatch).length,
    }
  }, [filteredByListing])

  async function handleContact(c: Candidature) {
    if (busyId) return
    setBusyId(c.swipe_id)
    try {
      // Si la conversation existe déjà, on ouvre directement.
      if (c.conversationId) {
        router.push(`/app/messages?conversation=${c.conversationId}`)
        return
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      // Crée un match (ou récupère un match existant côté serveur si RLS le permet)
      let matchId: string | null = null
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${c.swiper_id}),and(user1_id.eq.${c.swiper_id},user2_id.eq.${user.id})`)
        .maybeSingle()

      if (existingMatch?.id) {
        matchId = existingMatch.id
      } else {
        const { data: newMatch, error: mErr } = await supabase
          .from('matches')
          .insert({ user1_id: user.id, user2_id: c.swiper_id })
          .select('id')
          .single()
        if (mErr || !newMatch) throw new Error(mErr?.message ?? 'Erreur création match')
        matchId = newMatch.id
      }

      // Crée une conversation si elle n'existe pas
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('match_id', matchId)
        .maybeSingle()

      let conversationId = existingConv?.id ?? null
      if (!conversationId) {
        const { data: newConv, error: cErr } = await supabase
          .from('conversations')
          .insert({ match_id: matchId })
          .select('id')
          .single()
        if (cErr || !newConv) throw new Error(cErr?.message ?? 'Erreur création conversation')
        conversationId = newConv.id
      }

      // Notifie le candidat qu'il vient d'être contacté
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: c.swiper_id,
          type: 'match',
          title: 'Un loueur souhaite vous parler',
          body: 'Votre candidature a été retenue — ouvrez la conversation.',
          link: `/app/messages?conversation=${conversationId}`,
        }),
      }).catch(() => {})

      router.push(`/app/messages?conversation=${conversationId}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue'
      setToast({ msg: `Erreur : ${msg}`, tone: 'error' })
      setBusyId(null)
    }
  }

  async function handleIgnore(c: Candidature) {
    if (busyId) return
    setBusyId(c.swipe_id)
    // Optimistic
    setItems(prev => (prev ?? []).map(x => x.swipe_id === c.swipe_id ? { ...x, ignored: true } : x))
    const supabase = createClient()
    const { error } = await supabase
      .from('swipes')
      .update({ ignored_by_target: true })
      .eq('id', c.swipe_id)
    if (error) {
      setItems(prev => (prev ?? []).map(x => x.swipe_id === c.swipe_id ? { ...x, ignored: false } : x))
      setToast({ msg: `Erreur : ${error.message}`, tone: 'error' })
    } else {
      setToast({ msg: 'Candidature ignorée', tone: 'success' })
    }
    setBusyId(null)
  }

  const tabs: { id: TabFilter; label: string; count: number }[] = useMemo(() => {
    const notIgnored = filteredByListing.filter(c => !c.ignored)
    return [
      { id: 'all', label: 'Toutes', count: notIgnored.length },
      { id: 'pending', label: 'En attente', count: notIgnored.filter(c => !c.hasMatch && !c.conversationId).length },
      { id: 'contacted', label: 'Contactés', count: notIgnored.filter(c => c.conversationId != null && !c.hasMatch).length },
      { id: 'matched', label: 'Matchs', count: notIgnored.filter(c => c.hasMatch).length },
    ]
  }, [filteredByListing])

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Topbar title="Mes candidatures" />
      <BentoStyles />

      <style>{`
        .candidature-card:hover { border-color: rgba(16,185,129,0.35) !important; transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.28); }
        .candidature-ignore:hover { background: rgba(239,68,68,0.08) !important; color: #F87171 !important; }
        @media (max-width: 820px) {
          .candidature-row { flex-direction: column !important; }
          .candidature-actions { border-left: none !important; border-top: 1px solid rgba(255,255,255,0.06) !important; min-width: 0 !important; }
        }
      `}</style>

      <AnimatePresence>
        {toast && <Toast msg={toast.msg} tone={toast.tone} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          style={{ marginBottom: '28px' }}
        >
          <h1 style={{ fontFamily: OUTFIT, fontSize: '28px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
            Mes candidatures
          </h1>
          <div style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.4)' }}>
            Gérez les demandes reçues sur vos annonces
          </div>
        </motion.div>

        {/* ── Bandeau filtre par annonce ── */}
        {listingFilter && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: '12px', padding: '10px 14px', marginBottom: '20px',
              fontSize: '13px', color: 'rgba(255,255,255,0.75)',
            }}
          >
            <Inbox size={14} strokeWidth={2} color="#10B981" />
            <span>
              Filtre :{' '}
              <strong style={{ color: '#fff', fontWeight: 700 }}>
                {activeListing?.title || (activeListing?.city ? `Colocation à ${activeListing.city}` : 'annonce sélectionnée')}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => router.push('/app/candidatures')}
              aria-label="Retirer le filtre"
              style={{
                marginLeft: 'auto', background: 'none', border: 'none',
                color: '#10B981', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontFamily: OUTFIT, fontSize: '12px', fontWeight: 700,
              }}
            >
              <X size={12} strokeWidth={2.4} /> Retirer
            </button>
          </motion.div>
        )}

        {/* ── Stats row ── */}
        {items !== null && items.length > 0 && (
          <motion.div
            initial="hidden" animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px', marginBottom: '20px',
            }}
          >
            <StatCard icon={<Users size={20} strokeWidth={1.8} />} label={stats.total > 1 ? 'candidatures reçues' : 'candidature reçue'} value={stats.total} />
            <StatCard icon={<Clock size={20} strokeWidth={1.8} />} label="en attente de réponse" value={stats.pending} tint="#F59E0B" />
            <StatCard icon={<CheckCircle2 size={20} strokeWidth={1.8} />} label={stats.matched > 1 ? 'matchs confirmés' : 'match confirmé'} value={stats.matched} tint="#818CF8" />
          </motion.div>
        )}

        {/* ── Filtres (tabs) ── */}
        {items !== null && items.length > 0 && (
          <div style={{ display: 'flex', gap: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '20px' }}>
            {tabs.map(t => (
              <button
                key={t.id} type="button" onClick={() => setTab(t.id)}
                style={{
                  position: 'relative', padding: '10px 2px 12px', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: OUTFIT, fontSize: '13.5px', fontWeight: 700,
                  color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.45)', transition: 'color 0.18s ease',
                }}
              >
                {t.label}
                <span style={{
                  marginLeft: '8px', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px',
                  background: tab === t.id ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                  color: tab === t.id ? '#10B981' : 'rgba(255,255,255,0.4)',
                }}>{t.count}</span>
                {tab === t.id && (
                  <motion.div layoutId="candid-tab-underline"
                    style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, background: '#10B981', borderRadius: 2 }} />
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Liste ── */}
        {items === null ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <SkeletonCard /><SkeletonCard />
          </div>
        ) : items.length === 0 ? (
          <EmptyState onBoost={() => router.push('/app/boost')} />
        ) : visible.length === 0 ? (
          <div style={{
            ...cardBase, minHeight: '160px', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', padding: '40px 24px',
          }}>
            <div style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.5)' }}>
              Aucune candidature dans cette catégorie.
            </div>
          </div>
        ) : (
          <motion.div
            initial="hidden" animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {visible.map(c => (
              <CandidatureCard
                key={c.swipe_id}
                c={c}
                busy={busyId === c.swipe_id}
                onContact={() => handleContact(c)}
                onIgnore={() => handleIgnore(c)}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default function CandidaturesPage() {
  return (
    <Suspense fallback={null}>
      <CandidaturesContent />
    </Suspense>
  )
}
