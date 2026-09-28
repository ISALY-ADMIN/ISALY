import { createApiClient } from '@/lib/supabase/api-auth'
import { NextResponse } from 'next/server'
import { profilesCompatibility } from '@/lib/matching'
import { computeProfileCompletion } from '@/lib/profileCompletion'
import type { Profile } from '@/types/database'
import { getSwipeQuota } from '@/lib/swipeQuota'

export async function POST(request: Request) {
  const { supabase, user } = await createApiClient(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { swipedId, direction, listing_id } = await request.json()

  // Dashboard v2 : offre gratuite limitée à 10 swipes par jour, sans limite
  // avec Swiper Plus. Revenir sur une carte déjà swipée ne consomme rien.
  const alreadyQ = supabase.from('swipes').select('id').eq('swiper_id', user.id)
  const { data: alreadyRows } = typeof listing_id === 'string' && listing_id
    ? await alreadyQ.eq('listing_id', listing_id).limit(1)
    : await alreadyQ.eq('swiped_id', swipedId).limit(1)
  const already = (alreadyRows ?? [])[0] ?? null
  if (!already) {
    const quota = await getSwipeQuota(supabase, user.id)
    if (!quota.plus && quota.used >= quota.limit) {
      return NextResponse.json(
        { error: 'Tu as utilisé tes 10 swipes du jour. Ils reviennent demain.', code: 'daily_limit', quota },
        { status: 429 },
      )
    }
  }

  // Record the swipe (listing_id optionnel : cible l'annonce qui a déclenché le swipe)
  const swipePayload: {
    swiper_id: string
    swiped_id: string
    direction: string
    listing_id?: string
  } = { swiper_id: user.id, swiped_id: swipedId, direction }
  if (typeof listing_id === 'string' && listing_id) {
    swipePayload.listing_id = listing_id
  }

  // Dashboard v2 : une carte déjà swipée pour cette annonce est mise à jour
  // (index unique swiper_id + listing_id, migration 35) au lieu d'échouer.
  const { error: swipeError } = already && swipePayload.listing_id
    ? await supabase.from('swipes').update({ direction }).eq('id', already.id)
    : await supabase
    .from('swipes')
    .upsert(swipePayload)

  if (swipeError) {
    return NextResponse.json({ error: swipeError.message }, { status: 500 })
  }

  // Check for mutual like → create match
  let matched = false
  let compatibility: ReturnType<typeof profilesCompatibility> = null
  if (direction === 'right' || direction === 'super') {
    const { data: mutualSwipe } = await supabase
      .from('swipes')
      .select('id')
      .eq('swiper_id', swipedId)
      .eq('swiped_id', user.id)
      .in('direction', ['right', 'super'])
      .single()

    if (mutualSwipe) {
      // Create match
      const { data: match } = await supabase
        .from('matches')
        .insert({ user1_id: user.id, user2_id: swipedId })
        .select()
        .single()

      if (match) {
        await supabase.from('conversations').insert({ match_id: match.id })
        matched = true

        // Score de compatibilité réel entre les deux profils (null si test non complété)
        const { data: pair } = await supabase
          .from('profiles')
          .select('id, budget_max, matching_data')
          .in('id', [user.id, swipedId])
        if (pair && pair.length === 2) {
          compatibility = profilesCompatibility(pair[0] as Profile, pair[1] as Profile)
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://isaly.fr'
        await fetch(`${appUrl}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: swipedId,
            title: 'Nouveau match ! ❤️',
            body: "Quelqu'un a liké ton profil en retour. Va lui écrire !",
            url: '/app/messages',
          }),
        }).catch(() => {})

        await fetch(`${appUrl}/api/notifications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: swipedId,
            type: 'match',
            title: 'Nouveau match !',
            body: 'Vous vous êtes likés mutuellement.',
            link: '/app/swipe',
          }),
        }).catch(() => {})
      }
    }
  }

  // Swipe droit sans match : nudge la cible si son profil est < 70% complété
  // (« X a swipé ton profil — complète ton dossier pour matcher »)
  if ((direction === 'right' || direction === 'super') && !matched) {
    ;(async () => {
      const [{ data: target }, { data: swiper }] = await Promise.all([
        supabase.from('profiles')
          .select('avatar_url, first_name, last_name, city, bio, budget_max, matching_data, cert_level')
          .eq('id', swipedId).single(),
        supabase.from('profiles').select('first_name').eq('id', user.id).single(),
      ])
      if (!target) return
      const completion = computeProfileCompletion({
        avatarUrl: target.avatar_url, firstName: target.first_name, lastName: target.last_name,
        city: target.city, bio: target.bio, budgetMax: target.budget_max,
        matchingData: target.matching_data as Record<string, unknown> | null, certLevel: target.cert_level,
      })
      if (completion >= 70) return
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://isaly.fr'
      await fetch(`${appUrl}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: swipedId,
          type: 'match',
          title: `${swiper?.first_name ?? 'Quelqu’un'} a swipé ton profil 💚`,
          body: `Complète ton dossier (${completion}%) pour maximiser tes chances de matcher.`,
          link: '/app/swipe',
        }),
      }).catch(() => {})
    })().catch(() => {})
  }

  return NextResponse.json({ success: true, matched, compatibility })
}
