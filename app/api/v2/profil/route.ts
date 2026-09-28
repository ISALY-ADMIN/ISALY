import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchIsalyScore } from '@/lib/isalyScore'
import { DIMENSIONS, DIMENSION_LABELS, hasCompletedTest } from '@/lib/matching'
import { myDimensions } from '@/lib/v2/tenant'
import { computeProfileCompletion } from '@/lib/profileCompletion'

export const dynamic = 'force-dynamic'

/** Mon profil (dashboard v2), pour les deux modes. */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: p }, { data: docs }, score, { data: listings }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('user_documents').select('*').eq('user_id', user.id),
    fetchIsalyScore(supabase, user.id).catch(() => null),
    supabase.from('listings').select('id, city').eq('owner_id', user.id),
  ])
  const profile = (p ?? {}) as Record<string, unknown>
  const matching = profile.matching_data ?? null
  const urgentActive = !!profile.urgent_search_active &&
    (!profile.urgent_search_expires_at || new Date(profile.urgent_search_expires_at as string) > new Date())

  return NextResponse.json({
    id: user.id,
    email: user.email ?? '',
    firstName: (profile.first_name as string | null) ?? '',
    lastName: (profile.last_name as string | null) ?? '',
    bio: (profile.bio as string | null) ?? '',
    phone: (profile.phone as string | null) ?? '',
    city: (profile.city as string | null) ?? '',
    budgetMax: (profile.budget_max as number | null) ?? null,
    avatarUrl: (profile.avatar_url as string | null) ?? null,
    certLevel: (profile.cert_level as number | null) ?? 0,
    testDone: hasCompletedTest(matching),
    dims: myDimensions(matching),
    dimLabels: DIMENSIONS.map(d => DIMENSION_LABELS[d]),
    completion: computeProfileCompletion({
      avatarUrl: profile.avatar_url as string | null, firstName: profile.first_name as string | null,
      lastName: profile.last_name as string | null, city: profile.city as string | null, bio: profile.bio as string | null,
      budgetMax: profile.budget_max as number | null, matchingData: matching as Record<string, unknown> | null,
      certLevel: profile.cert_level as number | null,
    }),
    docs: (docs ?? []).map(d => ({ type: d.type as string, status: d.status as string })),
    score,
    urgent: {
      active: urgentActive,
      availableFrom: (profile.urgent_search_available_from as string | null) ?? '',
      expiresAt: (profile.urgent_search_expires_at as string | null) ?? null,
    },
    listingsCount: (listings ?? []).length,
    listingCities: Array.from(new Set((listings ?? []).map(l => l.city as string).filter(Boolean))),
  })
}
