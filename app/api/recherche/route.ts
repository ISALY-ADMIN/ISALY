import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { profilesCompatibility, type UiBreakdown } from '@/lib/matching'
import { getCoordsForCity, jitterCoords } from '@/lib/geo'
import { listingOccupancy } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export interface SearchResult {
  id: string
  title: string
  city: string
  neighborhood: string | null
  rent: number
  surface: number | null
  rooms: number
  photos: string[]
  description: string
  ownerId: string | null
  boostTier: 'standard' | 'featured' | 'priority'
  occupancy: { current: number; total: number }
  compat: { score: number; breakdown: UiBreakdown } | null
  coords: [number, number] | null
  meuble: boolean | null
  animauxOk: boolean | null
  nonFumeur: boolean | null
  createdAt: string
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  favoriteIds: string[]
  myTestCompleted: boolean
}

export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const p = new URL(req.url).searchParams
  const q          = (p.get('q') ?? '').trim()
  const city       = (p.get('city') ?? '').trim()
  const budgetMax  = Number(p.get('budget_max')) || 0
  const rooms      = Number(p.get('rooms')) || 0
  const surfaceMin = Number(p.get('surface_min')) || 0
  const surfaceMax = Number(p.get('surface_max')) || 0
  const meuble     = p.get('meuble') === '1'
  const animaux    = p.get('animaux') === '1'
  const nonFumeur  = p.get('non_fumeur') === '1'
  const dispo      = p.get('dispo') === '1'
  const boostOnly  = p.get('boost_only') === '1'
  const compatOnly = p.get('compat_only') === '1'
  const sort       = p.get('sort') ?? 'pertinence'

  // select('*') : tolère les colonnes de la migration 28 pas encore déployées
  let query = supabase.from('listings').select('*').eq('is_active', true).neq('owner_id', user.id).limit(200)
  if (city)           query = query.ilike('city', `%${city}%`)
  if (budgetMax > 0)  query = query.lte('rent', budgetMax)
  if (rooms > 0)      query = query.gte('rooms_available', rooms)
  if (surfaceMin > 0) query = query.gte('surface', surfaceMin)
  if (surfaceMax > 0) query = query.lte('surface', surfaceMax)
  if (q) query = query.or(`title.ilike.%${q}%,city.ilike.%${q}%,neighborhood.ilike.%${q}%,description.ilike.%${q}%`)

  const [{ data: rows }, { data: myProfile }, { data: favs }] = await Promise.all([
    query,
    supabase.from('profiles').select('budget_max, matching_data').eq('id', user.id).single(),
    supabase.from('favorites').select('target_id').eq('user_id', user.id).eq('target_type', 'listing'),
  ])

  let listings = rows ?? []
  // Filtres sur colonnes potentiellement absentes → appliqués en JS, ne matchent que true explicite
  if (meuble)    listings = listings.filter(l => l.meuble === true)
  if (animaux)   listings = listings.filter(l => l.animaux_ok === true)
  if (nonFumeur) listings = listings.filter(l => l.non_fumeur === true)
  if (boostOnly) listings = listings.filter(l => (l.boost_tier ?? l.boost_type) && (l.boost_tier ?? l.boost_type) !== 'standard')

  // Compatibilité réelle avec le loueur de chaque annonce
  const ownerIds = Array.from(new Set(listings.map(l => l.owner_id).filter(Boolean))) as string[]
  const ownerById = new Map<string, { budget_max: number | null; matching_data: unknown }>()
  if (myProfile && ownerIds.length > 0) {
    const { data: owners } = await supabase
      .from('profiles')
      .select('id, budget_max, matching_data')
      .in('id', ownerIds)
    for (const o of owners ?? []) ownerById.set(o.id as string, o)
  }

  let results: SearchResult[] = listings.map(l => {
    const owner = l.owner_id ? ownerById.get(l.owner_id as string) : undefined
    const c = myProfile && owner ? profilesCompatibility(myProfile, owner) : null
    const occupancy = listingOccupancy(l)
    const exact = l.latitude != null && l.longitude != null
      ? [Number(l.latitude), Number(l.longitude)] as [number, number]
      : getCoordsForCity((l.city as string) ?? '')
    return {
      id: l.id as string,
      title: (l.title as string) || `Colocation à ${l.city}`,
      city: (l.city as string) ?? '',
      neighborhood: (l.neighborhood as string) ?? null,
      rent: (l.rent as number) ?? 0,
      surface: (l.surface as number) ?? null,
      rooms: (l.rooms_available as number) ?? 0,
      photos: (l.photos as string[] | null) ?? [],
      description: (l.description as string) ?? '',
      ownerId: (l.owner_id as string) ?? null,
      boostTier: ((l.boost_tier ?? l.boost_type ?? 'standard') as SearchResult['boostTier']),
      occupancy,
      compat: c ? { score: c.score, breakdown: c.breakdown } : null,
      // Position approximative (jitter ~500 m), jamais l'adresse exacte
      coords: exact ? jitterCoords(exact, l.id as string) : null,
      meuble: (l.meuble as boolean | null) ?? null,
      animauxOk: (l.animaux_ok as boolean | null) ?? null,
      nonFumeur: (l.non_fumeur as boolean | null) ?? null,
      createdAt: (l.created_at as string) ?? '',
    }
  })

  if (dispo)      results = results.filter(r => r.occupancy.total - r.occupancy.current > 0)
  if (compatOnly) results = results.filter(r => r.compat !== null)

  const boostRank = (r: SearchResult) => (r.boostTier === 'priority' ? 2 : r.boostTier === 'featured' ? 1 : 0)
  switch (sort) {
    case 'price_asc':  results.sort((a, b) => a.rent - b.rent); break
    case 'price_desc': results.sort((a, b) => b.rent - a.rent); break
    case 'recent':     results.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break
    case 'places':     results.sort((a, b) => (b.occupancy.total - b.occupancy.current) - (a.occupancy.total - a.occupancy.current)); break
    default: // pertinence : boost > compatibilité > fraîcheur
      results.sort((a, b) =>
        boostRank(b) - boostRank(a) ||
        (b.compat?.score ?? -1) - (a.compat?.score ?? -1) ||
        b.createdAt.localeCompare(a.createdAt))
  }

  const response: SearchResponse = {
    results,
    total: results.length,
    favoriteIds: (favs ?? []).map(f => f.target_id as string),
    myTestCompleted: !!myProfile?.matching_data,
  }
  return NextResponse.json(response)
}
