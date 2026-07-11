import { NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-auth'

/**
 * PATCH : enregistre une vue d'annonce (1 / user / annonce / jour via
 * UNIQUE(viewer_id, listing_id, viewed_on)).
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('listing_views')
    .insert({ viewer_id: user.id, listing_id: params.id })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ ok: true, counted: false })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.rpc('increment_listing_views', { target_id: params.id })
  return NextResponse.json({ ok: true, counted: true })
}
