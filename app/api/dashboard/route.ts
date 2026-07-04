import { createApiClient } from '@/lib/supabase/api-auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Réponse agrégée du dashboard — un seul appel côté client. */
export interface DashboardData {
  mode: 'locataire' | 'loueur'
  profile: {
    firstName: string
    avatarUrl: string | null
    completion: number
    referralCode: string
    referralCount: number
  }
  unread: { count: number; preview: string | null }
  matches: { count: number; latest: { name: string; avatarUrl: string | null }[] }
  notifications: { title: string; body: string | null; link: string | null; type: string; createdAt: string }[]
  // Locataire
  swipe?: {
    newListings: number
    preview: { id: string; title: string; city: string; rent: number; photo: string | null }[]
  }
  lease?: { monthlyRent: number; nextDue: string | null; paymentStatus: 'paid' | 'pending' | 'late' } | null
  favorites?: { count: number; photos: string[] }
  // Loueur
  listings?: {
    total: number
    items: {
      id: string; title: string; city: string; isActive: boolean
      current: number; total: number; boostTier: string
    }[]
  }
  likesReceived?: { count: number }
  performance?: { days: { label: string; likes: number }[] }
  boost?: { tier: 'standard' | 'featured' | 'priority'; expiresAt: string | null }
  reviews?: { count: number; average: number | null }
}

function completionPct(p: Record<string, unknown>, certLevel: number): number {
  const md = p.matching_data as Record<string, unknown> | null
  const steps = [
    !!(p.first_name && p.last_name),
    !!p.avatar_url,
    !!p.city,
    !!(typeof p.bio === 'string' && p.bio.length > 20),
    !!(typeof p.budget_max === 'number' && p.budget_max > 0),
    !!(md && typeof md.completed_at === 'string'),
    certLevel >= 1,
  ]
  return Math.round((steps.filter(Boolean).length / steps.length) * 100)
}

export async function GET(request: Request) {
  // Auth cookies (site) OU Bearer (app mobile), comme /api/swipe.
  const { supabase, user } = await createApiClient(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, avatar_url, city, bio, budget_max, matching_data, role, referral_code, referral_count')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // role est LA colonne de référence du mode (NULL = locataire) — active_mode
  // est supprimée par la migration 27.
  const mode: 'locataire' | 'loueur' = profile.role === 'loueur' ? 'loueur' : 'locataire'

  // ── Commun : certification, matchs, messages non lus, notifications ──
  const [certRes, matchRes, unreadRes, lastUnreadRes, notifRes] = await Promise.all([
    supabase.from('user_certifications').select('level').eq('user_id', user.id).eq('status', 'verified'),
    supabase.from('matches')
      .select('user1_id, user2_id, created_at')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('created_at', { ascending: false }),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('read', false).neq('sender_id', user.id),
    supabase.from('messages').select('content').eq('read', false).neq('sender_id', user.id)
      .order('created_at', { ascending: false }).limit(1),
    supabase.from('notifications')
      .select('title, body, link, type, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  const certLevel = Math.max(0, ...(certRes.data ?? []).map(c => c.level as number))
  const allMatches = matchRes.data ?? []
  const partnerIds = allMatches
    .map(m => (m.user1_id === user.id ? m.user2_id : m.user1_id))
    .filter(Boolean) as string[]

  let latestPartners: { name: string; avatarUrl: string | null }[] = []
  if (partnerIds.length > 0) {
    const { data: partners } = await supabase
      .from('profiles')
      .select('id, first_name, avatar_url')
      .in('id', partnerIds.slice(0, 3))
    latestPartners = (partners ?? []).map(p => ({
      name: (p.first_name as string) ?? '',
      avatarUrl: (p.avatar_url as string) ?? null,
    }))
  }

  const base: DashboardData = {
    mode,
    profile: {
      firstName: (profile.first_name as string) ?? '',
      avatarUrl: (profile.avatar_url as string) ?? null,
      completion: completionPct(profile as Record<string, unknown>, certLevel),
      referralCode: (profile.referral_code as string) ?? '',
      referralCount: (profile.referral_count as number) ?? 0,
    },
    unread: {
      count: unreadRes.count ?? 0,
      preview: lastUnreadRes.data?.[0]?.content ?? null,
    },
    matches: { count: allMatches.length, latest: latestPartners },
    notifications: (notifRes.data ?? []).map(n => ({
      title: n.title as string,
      body: (n.body as string) ?? null,
      link: (n.link as string) ?? null,
      type: (n.type as string) ?? 'system',
      createdAt: n.created_at as string,
    })),
  }

  if (mode === 'locataire') {
    const [swipedRes, listingsRes, leaseRes, favRes] = await Promise.all([
      supabase.from('swipes').select('swiped_id').eq('swiper_id', user.id),
      supabase.from('listings')
        .select('id, title, city, rent, photos, owner_id')
        .eq('is_active', true)
        .neq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('leases').select('id, monthly_rent').eq('tenant_id', user.id).eq('status', 'active').limit(1),
      supabase.from('favorites').select('target_id, target_type').eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ])

    const swipedIds = new Set((swipedRes.data ?? []).map(s => s.swiped_id as string))
    const fresh = (listingsRes.data ?? []).filter(l => !swipedIds.has(l.owner_id as string))
    base.swipe = {
      newListings: fresh.length,
      preview: fresh.slice(0, 3).map(l => ({
        id: l.id as string,
        title: (l.title as string) || `Colocation à ${l.city}`,
        city: (l.city as string) ?? '',
        rent: (l.rent as number) ?? 0,
        photo: (l.photos as string[] | null)?.[0] ?? null,
      })),
    }

    const lease = leaseRes.data?.[0] ?? null
    if (lease) {
      const { data: nextPayment } = await supabase
        .from('rent_payments')
        .select('month, status')
        .eq('lease_id', lease.id)
        .in('status', ['pending', 'late'])
        .order('month', { ascending: true })
        .limit(1)
      const due = nextPayment?.[0] ?? null
      base.lease = {
        monthlyRent: (lease.monthly_rent as number) ?? 0,
        nextDue: (due?.month as string) ?? null,
        paymentStatus: due ? (due.status as 'pending' | 'late') : 'paid',
      }
    } else {
      base.lease = null
    }

    const favs = favRes.data ?? []
    const favListingIds = favs.filter(f => f.target_type === 'listing').map(f => f.target_id as string).slice(0, 4)
    let favPhotos: string[] = []
    if (favListingIds.length > 0) {
      const { data: favListings } = await supabase.from('listings').select('photos').in('id', favListingIds)
      favPhotos = (favListings ?? [])
        .map(l => (l.photos as string[] | null)?.[0])
        .filter((p): p is string => !!p)
        .slice(0, 2)
    }
    base.favorites = { count: favs.length, photos: favPhotos }
  } else {
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    const [myListingsRes, likesRes, recentLikesRes, reviewsRes] = await Promise.all([
      supabase.from('listings')
        .select('id, title, city, is_active, rooms_available, occupants_current, capacity_total, boost_tier, boost_expires_at', { count: 'exact' })
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('swipes').select('id', { count: 'exact', head: true })
        .eq('swiped_id', user.id).in('direction', ['right', 'super']),
      supabase.from('swipes').select('created_at')
        .eq('swiped_id', user.id).in('direction', ['right', 'super'])
        .gte('created_at', since).limit(1000),
      supabase.from('user_reviews').select('rating').eq('reviewed_id', user.id),
    ])

    const items = (myListingsRes.data ?? []).map(l => {
      const current = (l.occupants_current as number | null) ?? 1
      const total = (l.capacity_total as number | null) ?? Math.max(current + ((l.rooms_available as number | null) ?? 1), current)
      return {
        id: l.id as string,
        title: (l.title as string) || `Colocation à ${l.city}`,
        city: (l.city as string) ?? '',
        isActive: !!l.is_active,
        current,
        total,
        boostTier: (l.boost_tier as string) ?? 'standard',
      }
    })
    base.listings = { total: myListingsRes.count ?? items.length, items }
    base.likesReceived = { count: likesRes.count ?? 0 }

    // 7 jours glissants, du plus ancien au plus récent
    const buckets: { label: string; likes: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000)
      buckets.push({ label: d.toLocaleDateString('fr-FR', { weekday: 'narrow' }), likes: 0 })
    }
    for (const s of recentLikesRes.data ?? []) {
      const idx = 6 - Math.floor((Date.now() - new Date(s.created_at as string).getTime()) / (24 * 3600 * 1000))
      if (idx >= 0 && idx <= 6) buckets[idx].likes++
    }
    base.performance = { days: buckets }

    const now = Date.now()
    const boosted = (myListingsRes.data ?? []).find(l =>
      l.boost_tier !== 'standard' && (!l.boost_expires_at || new Date(l.boost_expires_at as string).getTime() > now)
    )
    base.boost = {
      tier: ((boosted?.boost_tier as 'featured' | 'priority' | undefined) ?? 'standard'),
      expiresAt: (boosted?.boost_expires_at as string) ?? null,
    }

    const ratings = (reviewsRes.data ?? []).map(r => r.rating as number)
    base.reviews = {
      count: ratings.length,
      average: ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    }
  }

  return NextResponse.json(base)
}
