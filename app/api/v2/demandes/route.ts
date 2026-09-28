import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantRequests } from '@/lib/v2/tenant'
import { isSwiperPlusActive } from '@/lib/swipeQuota'

export const dynamic = 'force-dynamic'

/** Demandes envoyées par le locataire, avec leur frise et ses visites. */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('matching_data, swiper_plus_active, swiper_plus_expires_at')
    .eq('id', user.id)
    .maybeSingle()
  const plus = isSwiperPlusActive(profile as { swiper_plus_active?: boolean | null; swiper_plus_expires_at?: string | null } | null)
  const requests = await getTenantRequests(supabase, user.id, profile?.matching_data ?? null, plus).catch(() => [])
  return NextResponse.json({ requests, plus })
}

/**
 * Annuler une demande encore en attente : la candidature est retirée (le
 * swipe reste enregistré, l'annonce ne revient pas dans la pile).
 */
export async function DELETE(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const { data: row } = await supabase
    .from('swipes')
    .select('id, swiper_id, candidature_status')
    .eq('id', id)
    .maybeSingle()
  if (!row || row.swiper_id !== user.id) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  if (row.candidature_status && row.candidature_status !== 'pending') {
    return NextResponse.json({ error: 'La coloc a déjà répondu à cette demande.' }, { status: 409 })
  }

  const { error } = await supabase
    .from('swipes')
    .update({ applied_at: null, candidature_status: null })
    .eq('id', id)
    .eq('swiper_id', user.id)
  if (error) {
    console.error('[v2/demandes] annulation', error)
    return NextResponse.json({ error: 'La demande n’a pas pu être annulée.' }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
