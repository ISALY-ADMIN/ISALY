import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getCoordsForCity, jitterCoords } from '@/lib/geo'
import { listingOccupancy, isAvailableNow } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * Recherche PUBLIQUE de la page d'accueil (visiteur non connecté).
 *
 * Pourquoi une route à part et non /api/recherche : cette dernière répond 401
 * sans session (elle a besoin du profil pour calculer la compatibilité). La
 * page d'accueil s'adresse justement à un visiteur sans compte. On reprend
 * donc ici la MÊME source (`listings`, is_active), les MÊMES filtres stricts
 * (ville, budget max) et le MÊME traitement de position (lib/geo), en retirant
 * le seul bloc qui exige une session : le score de compatibilité.
 *
 * Confidentialité : jamais la latitude/longitude exacte. On applique
 * jitterCoords (~±500 m, déterministe par annonce), exactement comme
 * /api/recherche et /app/annonce/[id] — l'adresse précise n'est partagée
 * qu'après validation du dossier.
 */
export interface HomeSearchResult {
  id: string
  title: string
  city: string
  neighborhood: string | null
  rent: number
  surface: number | null
  rooms: number
  photos: string[]
  occupancy: { current: number; total: number }
  /** Position APPROXIMATIVE (jitter ~500 m) — jamais l'adresse exacte. */
  coords: [number, number] | null
  meuble: boolean | null
  availableFrom: string | null
  createdAt: string
}

export interface HomeSearchResponse {
  results: HomeSearchResult[]
  total: number
  city: string
}

export async function GET(req: Request) {
  const supabase = createClient()
  const p = new URL(req.url).searchParams
  const city      = (p.get('city') ?? '').trim()
  const budgetMax = Number(p.get('budget_max')) || 0
  const dispo     = p.get('dispo') === '1'
  const limit     = Math.min(Number(p.get('limit')) || 24, 60)
  // Date d'arrivée souhaitée, 'YYYY-MM-DD'. Vide = pas de contrainte.
  const fromRaw   = (p.get('from') ?? '').trim()
  const from      = /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) ? fromRaw : ''

  // Mêmes filtres STRICTS que /api/recherche : ville et budget max.
  let query = supabase.from('listings').select('*').eq('is_active', true).limit(200)
  if (city)          query = query.ilike('city', `%${city}%`)
  if (budgetMax > 0) query = query.lte('rent', budgetMax)

  const { data: rows, error } = await query
  if (error) {
    return NextResponse.json<HomeSearchResponse>({ results: [], total: 0, city }, { status: 200 })
  }

  // « Dès que possible » : filtre strict, comme le `dispo` de /api/recherche.
  // Non renseignée = disponible (isAvailableNow), donc dégrade proprement tant
  // que la migration 41 n'est pas exécutée.
  const all = rows ?? []
  let listings = dispo
    ? all.filter(l => isAvailableNow(l.available_from as string | null | undefined))
    : all

  // Date d'arrivée : le logement doit être libre AU PLUS TARD à cette date.
  // Les dates ISO 'YYYY-MM-DD' se comparent en lexicographique, pas besoin de
  // parser. Date inconnue = on n'exclut pas, même raisonnement que
  // isAvailableNow : l'absence d'information n'est pas une indisponibilité
  // (et la colonne n'existe pas tant que la migration 41 n'est pas passée).
  if (from) {
    listings = listings.filter(l => {
      const af = l.available_from as string | null | undefined
      if (!af) return true
      return af.slice(0, 10) <= from
    })
  }

  const results: HomeSearchResult[] = listings.map(l => {
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
      occupancy: listingOccupancy(l),
      coords: exact ? jitterCoords(exact, l.id as string) : null,
      meuble: (l.meuble as boolean | null) ?? null,
      availableFrom: (l.available_from as string | null) ?? null,
      createdAt: (l.created_at as string) ?? '',
    }
  })

  // Boost puis fraîcheur : pas de score de compatibilité sans profil.
  const rank = (t: unknown) => (t === 'priority' ? 2 : t === 'featured' ? 1 : 0)
  results.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const boostOf = new Map(listings.map(l => [l.id as string, rank(l.boost_tier ?? l.boost_type)]))
  results.sort((a, b) => (boostOf.get(b.id) ?? 0) - (boostOf.get(a.id) ?? 0))

  return NextResponse.json<HomeSearchResponse>({
    results: results.slice(0, limit),
    total: results.length,
    city,
  })
}
