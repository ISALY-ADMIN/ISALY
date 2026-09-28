import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOwnerHomes } from '@/lib/v2/owner'
import { getAutogestionState } from '@/lib/autogestion'

export const dynamic = 'force-dynamic'

/** Baux (dashboard v2) : un logement à la fois, ses colocataires, loyers, documents et départs. */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [homes, autogestion, { data: leases }] = await Promise.all([
    getOwnerHomes(supabase, user.id).catch(() => []),
    getAutogestionState(supabase, user.id),
    supabase.from('leases').select('id, listing_id, tenant_id, status, start_date, owner_signature, tenant_signature, document_url, address').eq('owner_id', user.id).order('created_at', { ascending: false }),
  ])
  const L = (leases ?? []) as Record<string, unknown>[]
  const ids = Array.from(new Set(L.map(l => l.tenant_id as string).filter(Boolean)))
  const { data: people } = ids.length ? await supabase.from('profiles').select('id, first_name').in('id', ids) : { data: [] as { id: string; first_name: string | null }[] }
  const name = new Map((people ?? []).map(p => [p.id as string, (p.first_name as string | null) || 'Locataire']))

  return NextResponse.json({
    homes,
    autogestion,
    documents: L.map(l => ({
      id: l.id as string,
      homeId: (l.listing_id as string | null) ?? `lease-${l.id as string}`,
      tenantName: name.get(l.tenant_id as string) ?? 'Locataire',
      status: l.status as string,
      ownerSigned: !!l.owner_signature,
      tenantSigned: !!l.tenant_signature,
      hasPdf: !!l.document_url,
    })),
  })
}
