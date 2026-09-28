import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findActiveAgency, getAgency, getListingManagement } from '@/lib/managementMode'

export const dynamic = 'force-dynamic'

/**
 * Parcours d'un logement, pour son bailleur : mode actuel, agence partenaire
 * active dans sa ville (pour griser ou non l'option agence), agence en charge.
 */
export async function GET(_req: Request, { params }: { params: { listingId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: listing } = await supabase
    .from('listings')
    .select('id, owner_id, city')
    .eq('id', params.listingId)
    .maybeSingle()
  if (!listing || listing.owner_id !== user.id) {
    return NextResponse.json({ error: 'Logement introuvable' }, { status: 404 })
  }

  const m = await getListingManagement(supabase, listing.id)
  const [available, agency] = await Promise.all([
    findActiveAgency(supabase, listing.city as string | null),
    getAgency(supabase, m.agencyId),
  ])
  return NextResponse.json({ mode: m.mode, delegatedAt: m.delegatedAt, agency, availableAgency: available, persisted: m.persisted })
}
