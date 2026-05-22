import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

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
        // Create conversation for the match
        await supabase.from('conversations').insert({ match_id: match.id })
        matched = true
      }
    }
  }

  return NextResponse.json({ success: true, matched })
}
