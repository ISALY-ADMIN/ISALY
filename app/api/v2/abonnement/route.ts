import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAutogestionState } from '@/lib/autogestion'
import { findActiveAgency, getListingsManagement, getAgency } from '@/lib/managementMode'
import { activeBoostTier } from '@/lib/boost'

export const dynamic = 'force-dynamic'

/** Abonnement et options du bailleur (dashboard v2). */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [sub, { data: rows }] = await Promise.all([
    getAutogestionState(supabase, user.id),
    supabase.from('listings').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
  ])
  const L = (rows ?? []) as Record<string, unknown>[]
  const mgmt = await getListingsManagement(supabase, L.map(l => l.id as string))

  const cities = Array.from(new Set(L.map(l => ((l.city as string | null) ?? '').trim()).filter(Boolean)))
  const agencies = await Promise.all(cities.map(async c => ({ city: c, agency: (await findActiveAgency(supabase, c))?.name ?? null })))

  const delegated = await Promise.all(
    L.filter(l => mgmt[l.id as string]?.mode === 'delegue').map(async l => ({
      id: l.id as string,
      title: (l.title as string | null) || 'Logement',
      since: mgmt[l.id as string]?.delegatedAt ?? null,
      agency: (await getAgency(supabase, mgmt[l.id as string]?.agencyId))?.name ?? null,
    })),
  )

  const boosted = L.filter(l => activeBoostTier(l) !== 'standard').map(l => ({
    id: l.id as string,
    title: (l.title as string | null) || 'Annonce',
    place: [l.neighborhood, l.city].filter(Boolean).join(', '),
    expiresAt: (l.boost_expires_at as string | null) ?? null,
  }))
  const boostable = L.find(l => l.is_active === true && activeBoostTier(l) === 'standard' && mgmt[l.id as string]?.mode !== 'delegue')

  return NextResponse.json({
    autogestion: sub,
    agencies,
    delegated,
    boosted,
    boostable: boostable ? { id: boostable.id as string, label: `${(boostable.title as string | null) || 'Annonce'}, ${[boostable.neighborhood, boostable.city].filter(Boolean).join(', ')}` } : null,
  })
}
