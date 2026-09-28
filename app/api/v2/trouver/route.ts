import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSwipeQuota } from '@/lib/swipeQuota'
import { listingScores } from '@/lib/v2/tenant'
import { listingOccupancy } from '@/lib/utils'
import { getCoordsForCity } from '@/lib/geo'
import { activeBoostTier } from '@/lib/boost'
import { DIMENSIONS, DIMENSION_LABELS } from '@/lib/matching'

export const dynamic = 'force-dynamic'

/**
 * Écran Trouver (dashboard v2) : annonces actives avec la compatibilité de
 * l'utilisateur avec chaque colocataire en place, favoris, demandes déjà
 * envoyées, annonces déjà swipées (exclues de la pile) et limite du jour.
 * Les mises en avant actives passent devant, puis la compatibilité.
 */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: profile }, { data: rows }, { data: swipes }, { data: favs }, quota] = await Promise.all([
    supabase.from('profiles').select('city, budget_max, matching_data').eq('id', user.id).maybeSingle(),
    // `*` volontaire, comme l'ancienne page : nommer available_from viderait
    // la liste tant que la migration 41 n'est pas exécutée.
    supabase.from('listings').select('*').eq('is_active', true).neq('owner_id', user.id).order('created_at', { ascending: false }).limit(200),
    supabase.from('swipes').select('listing_id, applied_at').eq('swiper_id', user.id).not('listing_id', 'is', null),
    supabase.from('favorites').select('target_id').eq('user_id', user.id).eq('target_type', 'listing'),
    getSwipeQuota(supabase, user.id).catch(() => ({ used: 0, limit: 10, remaining: 10, plus: false })),
  ])

  const list = (rows ?? []) as Record<string, unknown>[]
  const scores = await listingScores(supabase, profile?.matching_data ?? null, list.map(l => l.id as string))

  const listings = list.map(l => {
    const id = l.id as string
    const sc = scores[id]
    const exact = l.latitude != null && l.longitude != null ? [Number(l.latitude), Number(l.longitude)] as [number, number] : null
    return {
      id,
      ownerId: (l.owner_id as string | null) ?? null,
      title: (l.title as string | null) || `Colocation à ${l.city ?? ''}`.trim(),
      city: (l.city as string) ?? '',
      neighborhood: (l.neighborhood as string | null) ?? null,
      description: (l.description as string | null) ?? '',
      rent: Number(l.rent ?? 0),
      charges: Number(l.charges ?? 0),
      surface: (l.surface as number | null) ?? null,
      photo: ((l.photos as string[] | null) ?? []).filter(Boolean)[0] ?? null,
      photos: ((l.photos as string[] | null) ?? []).filter(Boolean),
      availableFrom: (l.available_from as string | null) ?? null,
      meuble: (l.meuble as boolean | null) ?? null,
      occupancy: listingOccupancy(l),
      coords: exact ?? getCoordsForCity((l.city as string) ?? ''),
      boosted: activeBoostTier(l) !== 'standard',
      score: sc?.score ?? null,
      dimensions: sc?.dimensions ? DIMENSIONS.map(d => sc.dimensions![d]) : null,
      colocs: (sc?.colocs ?? []).map(c => ({ id: c.id, firstName: c.firstName, avatarUrl: c.avatarUrl, score: c.score })),
    }
  })
  listings.sort((a, b) => Number(b.boosted) - Number(a.boosted) || (b.score ?? -1) - (a.score ?? -1))

  return NextResponse.json({
    listings,
    swiped: (swipes ?? []).map(s => s.listing_id as string),
    requested: (swipes ?? []).filter(s => s.applied_at).map(s => s.listing_id as string),
    favorites: (favs ?? []).map(f => f.target_id as string),
    quota: { used: quota.used, limit: quota.limit, plus: quota.plus },
    criteria: { city: (profile?.city as string | null) ?? null, budgetMax: (profile?.budget_max as number | null) ?? null },
    dimLabels: DIMENSIONS.map(d => DIMENSION_LABELS[d]),
  })
}
