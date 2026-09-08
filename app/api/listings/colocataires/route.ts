import { createApiClient } from '@/lib/supabase/api-auth'
import { NextResponse } from 'next/server'
import { computeCompatibility, type DimensionScores } from '@/lib/matching'
import { aggregateColocScores } from '@/lib/colocMatching'

/**
 * Colocataires déjà en place d'un lot d'annonces + score de compatibilité.
 *
 * Alimente la carte « Trouver » (swipe de logements) : pour chaque annonce, la
 * liste des colocataires du bail actif et la MOYENNE du score du visiteur avec
 * chacun d'eux. Un logement sans colocataire identifié n'a pas de score — il
 * n'a pas d'algorithme du tout, on y candidate directement.
 *
 * `matching_data` est lu ici mais ne sort JAMAIS de la route : seuls des scores
 * agrégés (global + par dimension) partent vers le navigateur, jamais les
 * réponses au quiz d'un colocataire.
 *
 * Dépend de la fonction SQL `listing_roommates` (migration 40). Tant que la
 * migration n'est pas exécutée, la route répond `available: false` au lieu
 * d'échouer : la page bascule alors toutes les cartes en état « colocataires
 * inconnus », sans score et sans jamais afficher un faux pourcentage.
 */

interface RoommateRow {
  listing_id: string
  profile_id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  matching_data: unknown
}

export interface RoommateScore {
  id: string
  /** « Prénom N. » — même forme que partout ailleurs dans l'app. */
  name: string
  avatarUrl: string | null
  /** null = l'un des deux tests de compatibilité n'est pas complété. */
  score: number | null
  dimensions: DimensionScores | null
}

export interface ListingColocataires {
  roommates: RoommateScore[]
  /** Moyenne des scores calculables ; null si aucun ne l'est. */
  averageScore: number | null
  /** Moyenne par dimension, sur les mêmes colocataires. */
  averageDimensions: DimensionScores | null
  /** Colocataires en place mais sans score possible (test non complété). */
  unscoredCount: number
}

export async function POST(request: Request) {
  const { supabase, user } = await createApiClient(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const listingIds: string[] = Array.isArray(body?.listingIds)
    ? (body.listingIds as unknown[]).filter((v): v is string => typeof v === 'string' && v.length > 0)
    : []

  if (listingIds.length === 0) {
    return NextResponse.json({ available: true, listings: {} })
  }

  const [{ data: rows, error }, { data: myProfile }] = await Promise.all([
    supabase.rpc('listing_roommates', { l_ids: listingIds }),
    supabase.from('profiles').select('matching_data').eq('id', user.id).single(),
  ])

  if (error) {
    // Migration 40 pas encore exécutée (42883 : function does not exist) : on ne
    // casse pas la page, on la prive de scores. Toute autre erreur est loguée
    // pour ne pas passer silencieusement pour une absence de colocataires.
    console.error('[listings/colocataires] listing_roommates indisponible', {
      code: error.code,
      message: error.message,
    })
    return NextResponse.json({ available: false, listings: {} })
  }

  const myMatching = myProfile?.matching_data ?? null

  const listings: Record<string, ListingColocataires> = {}

  for (const row of (rows ?? []) as RoommateRow[]) {
    const entry = listings[row.listing_id] ?? {
      roommates: [],
      averageScore: null,
      averageDimensions: null,
      unscoredCount: 0,
    }

    const compat = computeCompatibility(myMatching, row.matching_data)
    const first = row.first_name ?? ''
    const lastInitial = row.last_name?.[0] ? `${row.last_name[0]}.` : ''

    entry.roommates.push({
      id: row.profile_id,
      name: `${first} ${lastInitial}`.trim() || 'Colocataire',
      avatarUrl: row.avatar_url,
      score: compat?.score ?? null,
      dimensions: compat?.dimensions ?? null,
    })

    listings[row.listing_id] = entry
  }

  for (const entry of Object.values(listings)) {
    const aggregate = aggregateColocScores(entry.roommates)
    entry.averageScore = aggregate.averageScore
    entry.averageDimensions = aggregate.averageDimensions
    entry.unscoredCount = aggregate.unscoredCount
    // Meilleure compatibilité en tête : c'est le colocataire que le visiteur
    // veut voir en premier. Les non calculables ferment la liste.
    entry.roommates.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  }

  return NextResponse.json({ available: true, listings })
}
