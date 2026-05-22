import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { matchingEngine, profileToVector } from '@/lib/matching'
import type { Profile } from '@/types/database'
import type { MatchingData } from '@/lib/matching'

type ProfileWithMatchingData = Profile & { matching_data?: MatchingData }

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!myProfile) {
    return NextResponse.json({ profiles: [] })
  }

  const { data: swiped } = await supabase
    .from('swipes')
    .select('swiped_id')
    .eq('swiper_id', user.id)

  const swipedIds = (swiped as Array<{ swiped_id: string }> | null)?.map(s => s.swiped_id) ?? []

  const query = supabase
    .from('profiles')
    .select('*')
    .neq('id', user.id)
    .eq('is_visible', true)
    .limit(50)

  const { data: candidates } = swipedIds.length > 0
    ? await query.not('id', 'in', `(${swipedIds.join(',')})`)
    : await query

  if (!candidates) {
    return NextResponse.json({ profiles: [] })
  }

  const myVector = profileToVector(myProfile as ProfileWithMatchingData)

  const scored = (candidates as ProfileWithMatchingData[]).map(profile => {
    const candidateVector = profileToVector(profile)
    const matchResult = matchingEngine.computeMatchScore(myVector, candidateVector)

    return {
      ...profile,
      compatibilityScore: matchResult.score,
      matchBreakdown: matchResult.breakdown,
      strengths: matchResult.strengths,
      risks: matchResult.risks,
      hard_filtered: matchResult.hard_filtered,
    }
  })

  const ranked = scored
    .filter(p => !p.hard_filtered)
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, 20)

  return NextResponse.json({ profiles: ranked })
}
