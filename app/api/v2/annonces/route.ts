import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getListingsManagement } from '@/lib/managementMode'
import { activeBoostTier } from '@/lib/boost'

export const dynamic = 'force-dynamic'

/** Annonces du bailleur (dashboard v2) avec vues, swipes à droite, demandes et mise en avant. */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rows } = await supabase.from('listings').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
  const list = (rows ?? []) as Record<string, unknown>[]
  const ids = list.map(l => l.id as string)
  const [mgmt, { data: swipes }] = await Promise.all([
    getListingsManagement(supabase, ids),
    ids.length
      ? supabase.from('swipes').select('listing_id, direction, applied_at').in('listing_id', ids)
      : Promise.resolve({ data: [] as { listing_id: string; direction: string; applied_at: string | null }[] }),
  ])
  const sw = (swipes ?? []) as { listing_id: string; direction: string; applied_at: string | null }[]

  return NextResponse.json({
    listings: list.map(l => {
      const id = l.id as string
      const boosted = activeBoostTier(l) !== 'standard'
      return {
        id,
        title: (l.title as string | null) || 'Annonce',
        city: (l.city as string | null) ?? '',
        neighborhood: (l.neighborhood as string | null) ?? null,
        rent: Number(l.rent ?? 0),
        charges: Number(l.charges ?? 0),
        surface: (l.surface as number | null) ?? null,
        photo: ((l.photos as string[] | null) ?? []).filter(Boolean)[0] ?? null,
        isActive: l.is_active === true,
        availableFrom: (l.available_from as string | null) ?? (l.disponible_le as string | null) ?? null,
        views: Number(l.views_count ?? 0),
        likes: sw.filter(s => s.listing_id === id && (s.direction === 'right' || s.direction === 'super')).length,
        requests: sw.filter(s => s.listing_id === id && s.applied_at).length,
        boostExpiresAt: boosted ? ((l.boost_expires_at as string | null) ?? null) : null,
        boosted,
        mode: mgmt[id]?.mode ?? null,
        createdAt: (l.created_at as string | null) ?? null,
      }
    }),
  })
}
