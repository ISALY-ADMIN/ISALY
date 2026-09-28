import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getListingManagement } from '@/lib/managementMode'
import { isMissingSchema } from '@/lib/schemaFallback'

export const dynamic = 'force-dynamic'

/** Le bailleur choisit de gérer le logement avec ISALY (autogestion). */
export async function POST(_req: Request, { params }: { params: { listingId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: listing } = await supabase
    .from('listings')
    .select('id, owner_id')
    .eq('id', params.listingId)
    .maybeSingle()
  if (!listing || listing.owner_id !== user.id) {
    return NextResponse.json({ error: 'Logement introuvable' }, { status: 404 })
  }

  const current = await getListingManagement(supabase, listing.id)
  if (current.mode === 'delegue') {
    return NextResponse.json({ error: 'Ce logement est confié à une agence partenaire.' }, { status: 409 })
  }
  if (current.mode === 'autogestion' && current.persisted) return NextResponse.json({ ok: true, mode: 'autogestion' })

  const { error } = await supabase.from('listings').update({ management_mode: 'autogestion' }).eq('id', listing.id)
  if (error) {
    // Colonne absente (migration 42 non exécutée) : le logement sera considéré
    // en autogestion dès son premier bail actif, rien n'est perdu.
    if (isMissingSchema(error)) return NextResponse.json({ ok: true, mode: 'autogestion', persisted: false })
    console.error('[gestion/autogestion]', error)
    return NextResponse.json({ error: 'Le choix n’a pas pu être enregistré.' }, { status: 502 })
  }
  return NextResponse.json({ ok: true, mode: 'autogestion', persisted: true })
}
