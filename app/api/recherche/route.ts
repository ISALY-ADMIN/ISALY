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
  /** Score de pertinence (critères cochés + compat + texte libre). */
  score: number
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  /** Nombre d'annonces qui matchent la recherche libre (badge « X résultats pour "…" »). */
  textMatches: number
  favoriteIds: string[]
  myTestCompleted: boolean
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

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
  const ppr        = Number(p.get('ppr')) || 0 // personnes par chambre : 1 | 2 | 3 (3 = 3+)
  const sort       = p.get('sort') ?? 'pertinence'

  // ── Seuls ville et budget max sont des filtres STRICTS.
  // Tout le reste est du TRI : les annonces matchantes remontent, rien n'est exclu.
  let query = supabase.from('listings').select('*').eq('is_active', true).limit(200)
  if (city)          query = query.ilike('city', `%${city}%`)
  if (budgetMax > 0) query = query.lte('rent', budgetMax)

  const [{ data: rows, error: listErr }, { data: myProfile }, { data: favs }] = await Promise.all([
    query,
    supabase.from('profiles').select('budget_max, matching_data').eq('id', user.id).single(),
    supabase.from('favorites').select('target_id').eq('user_id', user.id).eq('target_type', 'listing'),
  ])

  console.log(`[recherche] user=${user.id.slice(0, 8)} rows=${rows?.length ?? 0} err=${listErr?.message ?? 'none'} filters={city:'${city}', budget:${budgetMax}, q:'${q}'}`)

  const listings = rows ?? []

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

  const keywords = q ? norm(q).split(/\s+/).filter(w => w.length >= 2) : []
  let textMatches = 0

  const results: SearchResult[] = listings.map(l => {
    const owner = l.owner_id ? ownerById.get(l.owner_id as string) : undefined
    const c = myProfile && owner ? profilesCompatibility(myProfile, owner) : null
    const occupancy = listingOccupancy(l)
    const remaining = occupancy.total - occupancy.current
    const boostTier = ((l.boost_tier ?? l.boost_type ?? 'standard') as SearchResult['boostTier'])
    const roomCount = (l.rooms_available as number) ?? 0
    const exact = l.latitude != null && l.longitude != null
      ? [Number(l.latitude), Number(l.longitude)] as [number, number]
      : getCoordsForCity((l.city as string) ?? '')

    // ── Score de pertinence ──
    let score = c?.score ?? 0                                     // compatibilité (0-100)
    if (boostTier === 'priority') score += 25                     // bonus boost permanent
    else if (boostTier === 'featured') score += 15

    // Critères cochés : +points si l'annonce matche (tri, pas exclusion)
    if (boostOnly && boostTier !== 'standard') score += 50
    if (meuble && l.meuble === true) score += 20
    if (animaux && l.animaux_ok === true) score += 20
    if (nonFumeur && l.non_fumeur === true) score += 20
    if (dispo && remaining > 0) score += 20
    if (compatOnly && c) score += 20
    if (rooms > 0 && roomCount >= rooms) score += 20
    if ((surfaceMin > 0 || surfaceMax > 0) && l.surface != null) {
      const okMin = surfaceMin === 0 || (l.surface as number) >= surfaceMin
      const okMax = surfaceMax === 0 || (l.surface as number) <= surfaceMax
      if (okMin && okMax) score += 20
    }
    if (ppr > 0) {
      const ratio = occupancy.total / Math.max(1, roomCount)
      const match = ppr === 1 ? ratio <= 1 : ppr === 2 ? ratio <= 2 : ratio >= 3
      if (match) score += 20
    }

    // Recherche libre : titre +30, ville +20, description +10 par mot-clé trouvé
    if (keywords.length > 0) {
      const title = norm((l.title as string) ?? '')
      const cityN = norm(`${l.city ?? ''} ${l.neighborhood ?? ''}`)
      const desc = norm((l.description as string) ?? '')
      let textScore = 0
      for (const w of keywords) {
        if (title.includes(w)) textScore += 30
        if (cityN.includes(w)) textScore += 20
        if (desc.includes(w)) textScore += 10
      }
      if (textScore > 0) textMatches++
      score += textScore
    }

    return {
      id: l.id as string,
      title: (l.title as string) || `Colocation à ${l.city}`,
      city: (l.city as string) ?? '',
      neighborhood: (l.neighborhood as string) ?? null,
      rent: (l.rent as number) ?? 0,
      surface: (l.surface as number) ?? null,
      rooms: roomCount,
      photos: (l.photos as string[] | null) ?? [],
      description: (l.description as string) ?? '',
      ownerId: (l.owner_id as string) ?? null,
      boostTier,
      occupancy,
      compat: c ? { score: c.score, breakdown: c.breakdown } : null,
      // Position approximative (jitter ~500 m), jamais l'adresse exacte
      coords: exact ? jitterCoords(exact, l.id as string) : null,
      meuble: (l.meuble as boolean | null) ?? null,
      animauxOk: (l.animaux_ok as boolean | null) ?? null,
      nonFumeur: (l.non_fumeur as boolean | null) ?? null,
      createdAt: (l.created_at as string) ?? '',
      score,
    }
  })

  switch (sort) {
    case 'price_asc':  results.sort((a, b) => a.rent - b.rent); break
    case 'price_desc': results.sort((a, b) => b.rent - a.rent); break
    case 'recent':     results.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break
    case 'places':     results.sort((a, b) => (b.occupancy.total - b.occupancy.current) - (a.occupancy.total - a.occupancy.current)); break
    default: // pertinence : score décroissant, fraîcheur en tiebreak
      results.sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt))
  }

  console.log(`[recherche] results=${results.length} textMatches=${textMatches} topScore=${results[0]?.score ?? '-'}`)

  const response: SearchResponse = {
    results,
    total: results.length,
    textMatches,
    favoriteIds: (favs ?? []).map(f => f.target_id as string),
    myTestCompleted: !!myProfile?.matching_data,
  }
  return NextResponse.json(response)
}
