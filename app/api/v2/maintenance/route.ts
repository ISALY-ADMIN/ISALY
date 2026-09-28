import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOwnerHomes } from '@/lib/v2/owner'
import { getAutogestionState } from '@/lib/autogestion'

export const dynamic = 'force-dynamic'

/**
 * Maintenance (dashboard v2) : signalements des logements en autogestion
 * uniquement. Un logement confié à une agence partenaire n'apparaît pas :
 * l'agence traite ses signalements.
 */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [homes, sub] = await Promise.all([getOwnerHomes(supabase, user.id).catch(() => []), getAutogestionState(supabase, user.id)])
  const auto = homes.filter(h => h.mode === 'autogestion')
  const leaseHome = new Map<string, string>()
  for (const h of auto) for (const r of h.rooms) if (r.leaseId) leaseHome.set(r.leaseId, h.address)
  const leaseIds = Array.from(leaseHome.keys())
  if (!leaseIds.length) return NextResponse.json({ requests: [], autogestionActive: sub.active })

  const { data } = await supabase
    .from('maintenance_requests')
    .select('*')
    .in('lease_id', leaseIds)
    .order('created_at', { ascending: false })
  const rows = (data ?? []) as Record<string, unknown>[]
  const ids = Array.from(new Set(rows.map(r => r.tenant_id as string).filter(Boolean)))
  const { data: people } = ids.length ? await supabase.from('profiles').select('id, first_name, avatar_url').in('id', ids) : { data: [] as Record<string, unknown>[] }
  const P = new Map(((people ?? []) as Record<string, unknown>[]).map(p => [p.id as string, p]))

  return NextResponse.json({
    autogestionActive: sub.active,
    requests: rows.map(r => {
      const p = P.get(r.tenant_id as string)
      return {
        id: r.id as string,
        title: r.title as string,
        category: (r.category as string) ?? 'autre',
        description: (r.description as string | null) ?? '',
        status: r.status as string,
        urgency: (r.urgency as string | null) ?? 'normal',
        createdAt: r.created_at as string,
        comment: (r.bailleur_comment as string | null) ?? '',
        photos: ((r.photos as string[] | null) ?? []).filter(Boolean),
        resolvedPhoto: (r.resolved_photo_url as string | null) ?? null,
        address: leaseHome.get(r.lease_id as string) ?? '',
        by: { id: (r.tenant_id as string) ?? '', firstName: ((p?.first_name as string | null) ?? '').trim() || 'Locataire', avatarUrl: (p?.avatar_url as string | null) ?? null },
      }
    }),
  })
}
