import type { SupabaseClient } from '@supabase/supabase-js'

export interface ReliabilityResult {
  score: number
  responseRate: number | null       // % de messages répondus < 24h (30 derniers jours)
  avgResponseHours: number | null   // temps de réponse moyen en heures
  avgRating: number | null          // note moyenne /5
  reviewCount: number
  monthsOnPlatform: number
  certified: boolean                // cert_level >= 2
}

/**
 * Score de fiabilité loueur 0-100 :
 * - Taux de réponse < 24h sur 30 jours : 40 pts
 * - Note moyenne des avis : 30 pts (note/5 × 30)
 * - Ancienneté : 15 pts (plafonné à 12 mois)
 * - Dossier vérifié (cert_level >= 2) : 15 pts
 */
export async function computeReliabilityScore(
  supabase: SupabaseClient,
  ownerId: string
): Promise<ReliabilityResult | null> {
  const [{ data: profile }, { data: reviews }, { data: convs }] = await Promise.all([
    supabase.from('profiles').select('created_at, cert_level').eq('id', ownerId).single(),
    supabase.from('user_reviews').select('rating').eq('reviewed_id', ownerId),
    supabase.from('conversations').select('id').or(`user1_id.eq.${ownerId},user2_id.eq.${ownerId}`).limit(30),
  ])

  if (!profile) return null

  // ── Taux de réponse (40 pts) ──
  let responseRate: number | null = null
  let avgResponseHours: number | null = null
  if (convs && convs.length > 0) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: msgs } = await supabase
      .from('messages')
      .select('conversation_id, sender_id, created_at')
      .in('conversation_id', convs.map(c => c.id))
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(500)

    if (msgs && msgs.length > 0) {
      const byConv = new Map<string, typeof msgs>()
      for (const m of msgs) {
        const list = byConv.get(m.conversation_id) ?? []
        list.push(m)
        byConv.set(m.conversation_id, list)
      }
      let incoming = 0
      let answered = 0
      const delays: number[] = []
      for (const list of Array.from(byConv.values())) {
        for (let i = 0; i < list.length; i++) {
          if (list[i].sender_id === ownerId) continue
          // Message entrant : le loueur a-t-il répondu ensuite ?
          incoming++
          const reply = list.slice(i + 1).find(m => m.sender_id === ownerId)
          if (reply) {
            const delta = new Date(reply.created_at).getTime() - new Date(list[i].created_at).getTime()
            delays.push(delta / 3600000)
            if (delta <= 24 * 3600000) answered++
          }
        }
      }
      if (incoming > 0) {
        responseRate = Math.round((answered / incoming) * 100)
        if (delays.length > 0) {
          avgResponseHours = Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10
        }
      }
    }
  }

  // ── Avis (30 pts) ──
  const reviewCount = reviews?.length ?? 0
  const avgRating = reviewCount > 0
    ? Math.round((reviews!.reduce((a, r) => a + (r.rating as number), 0) / reviewCount) * 10) / 10
    : null

  // ── Ancienneté (15 pts, plafond 12 mois) ──
  const monthsOnPlatform = Math.floor(
    (Date.now() - new Date(profile.created_at as string).getTime()) / (30.44 * 24 * 3600000)
  )

  // ── Certification (15 pts) ──
  const certified = ((profile.cert_level as number) ?? 0) >= 2

  const score = Math.round(
    ((responseRate ?? 50) / 100) * 40 +           // sans historique : neutre à 50%
    ((avgRating ?? 3.5) / 5) * 30 +               // sans avis : neutre à 3.5/5
    (Math.min(monthsOnPlatform, 12) / 12) * 15 +
    (certified ? 15 : 0)
  )

  return {
    score: Math.max(0, Math.min(100, score)),
    responseRate,
    avgResponseHours,
    avgRating,
    reviewCount,
    monthsOnPlatform,
    certified,
  }
}
