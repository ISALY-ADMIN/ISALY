import type { SupabaseClient } from '@supabase/supabase-js'
import { computeProfileCompletion } from './profileCompletion'
import { computeResponseStats } from './reliabilityScore'

export interface IsalyScoreResult {
  score: number
  completion: number          // % complétion dossier
  certLevel: number           // 0-3
  avgRating: number | null    // note moyenne /5
  reviewCount: number
  responseRate: number | null // % répondu < 24h (30 j)
  avgResponseHours: number | null
}

/**
 * ISALY Score 0-100 (pur, testable) :
 * - Complétion du dossier : 30 pts
 * - Niveau de vérification (cert_level × 10) : 30 pts
 * - Note moyenne des avis : 25 pts (note/5 × 25)
 * - Taux de réponse < 24h sur 30 jours : 15 pts
 * Sans avis ou sans historique de messages, le critère est retiré du
 * dénominateur (score partiel renormalisé — jamais pénalisant).
 */
export function computeIsalyScore(input: {
  completion: number
  certLevel: number
  avgRating: number | null
  responseRate: number | null
}): number {
  let pts = 0
  let max = 0

  pts += (input.completion / 100) * 30
  max += 30

  pts += Math.min(Math.max(input.certLevel, 0), 3) * 10
  max += 30

  if (input.avgRating != null) {
    pts += (input.avgRating / 5) * 25
    max += 25
  }

  if (input.responseRate != null) {
    pts += (input.responseRate / 100) * 15
    max += 15
  }

  return Math.max(0, Math.min(100, Math.round((pts / max) * 100)))
}

/** Récupère les données et calcule l'ISALY Score d'un utilisateur. */
export async function fetchIsalyScore(
  supabase: SupabaseClient,
  userId: string
): Promise<IsalyScoreResult | null> {
  const [{ data: profile }, { data: reviews }, { responseRate, avgResponseHours }] = await Promise.all([
    supabase.from('profiles')
      .select('avatar_url, first_name, last_name, city, bio, budget_max, matching_data, cert_level')
      .eq('id', userId).single(),
    supabase.from('user_reviews').select('rating').eq('reviewed_id', userId),
    computeResponseStats(supabase, userId),
  ])

  if (!profile) return null

  const completion = computeProfileCompletion({
    avatarUrl: profile.avatar_url,
    firstName: profile.first_name,
    lastName: profile.last_name,
    city: profile.city,
    bio: profile.bio,
    budgetMax: profile.budget_max,
    matchingData: profile.matching_data as Record<string, unknown> | null,
    certLevel: profile.cert_level,
  })

  const certLevel = (profile.cert_level as number) ?? 0
  const reviewCount = reviews?.length ?? 0
  const avgRating = reviewCount > 0
    ? Math.round((reviews!.reduce((a, r) => a + (r.rating as number), 0) / reviewCount) * 10) / 10
    : null

  return {
    score: computeIsalyScore({ completion, certLevel, avgRating, responseRate }),
    completion,
    certLevel,
    avgRating,
    reviewCount,
    responseRate,
    avgResponseHours,
  }
}
