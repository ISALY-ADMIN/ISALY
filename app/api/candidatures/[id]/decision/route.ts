import { createApiClient } from '@/lib/supabase/api-auth'
import { NextResponse } from 'next/server'
import { statusNotification } from '@/lib/candidatures'
import type { CandidatureStatus } from '@/types/database'

const ALLOWED: CandidatureStatus[] = ['pending', 'accepted', 'rejected', 'waitlisted', 'visit_proposed']

/**
 * PATCH /api/candidatures/[id]/decision
 * Le loueur (cible du swipe) change le statut d'une candidature et notifie
 * le locataire. RLS : le loueur est swiped_id → même politique d'update que
 * ignored_by_target, déjà utilisée par /app/candidatures.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user } = await createApiClient(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status } = await request.json().catch(() => ({})) as { status?: string }

  if (!status || !ALLOWED.includes(status as CandidatureStatus)) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  }

  // Vérifie que la candidature cible bien ce loueur
  const { data: swipe } = await supabase
    .from('swipes')
    .select('id, swiper_id, swiped_id, listing_id')
    .eq('id', id)
    .maybeSingle()

  if (!swipe || swipe.swiped_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('swipes')
    .update({ candidature_status: status, decided_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifie le locataire
  if (swipe.swiper_id) {
    const { title, body } = statusNotification(status as CandidatureStatus)
    const link = status === 'visit_proposed' && swipe.listing_id
      ? `/app/annonce/${swipe.listing_id}`
      : '/app/candidatures'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://isaly.fr'
    fetch(`${appUrl}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: swipe.swiper_id, type: 'match', title, body, link }),
    }).catch(() => {})
    fetch(`${appUrl}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: swipe.swiper_id, title, body, url: link }),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true, status })
}
