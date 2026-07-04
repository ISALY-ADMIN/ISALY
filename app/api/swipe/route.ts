import { createApiClient } from '@/lib/supabase/api-auth'
import { NextResponse } from 'next/server'
import { profilesCompatibility } from '@/lib/matching'
import type { Profile } from '@/types/database'

export async function POST(request: Request) {
  const { supabase, user } = await createApiClient(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { swipedId, direction } = await request.json()

  // Record the swipe
  const { error: swipeError } = await supabase
    .from('swipes')
    .upsert({ swiper_id: user.id, swiped_id: swipedId, direction })

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

  return NextResponse.json({ success: true, matched, compatibility })
}
