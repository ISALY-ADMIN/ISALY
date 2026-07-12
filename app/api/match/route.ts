import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { profilesCompatibility, hasCompletedTest } from '@/lib/matching'
import type { Profile } from '@/types/database'

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

  const scored = (candidates as Profile[]).map(profile => {
    const compat = profilesCompatibility(myProfile as Profile, profile)
    return {
      ...profile,
      // null = test non complété (le mien ou le sien) — jamais de faux %
      compatibilityScore: compat?.score ?? null,
      matchBreakdown: compat?.breakdown ?? null,
      dimensions: compat?.dimensions ?? null,
      conflicts: compat?.conflicts ?? [],
      testCompleted: hasCompletedTest(profile.matching_data),
    }
  })

  // Mission 15 : recherche urgente non expirée = priorité absolue,
  // puis scores réels (décroissant), tests non complétés à la fin
  const now = Date.now()
  const urgentBoost = (p: Profile & { urgent_search_active?: boolean; urgent_search_expires_at?: string | null }) =>
    p.urgent_search_active && p.urgent_search_expires_at && new Date(p.urgent_search_expires_at).getTime() > now ? 1 : 0
  const ranked = scored
    .sort((a, b) =>
      urgentBoost(b) - urgentBoost(a) ||
      (b.compatibilityScore ?? -1) - (a.compatibilityScore ?? -1))
    .slice(0, 20)

  return NextResponse.json({
    profiles: ranked,
    myTestCompleted: hasCompletedTest((myProfile as Profile).matching_data),
  })
}
