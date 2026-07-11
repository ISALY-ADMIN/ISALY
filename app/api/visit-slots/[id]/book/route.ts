import { NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-auth'

/**
 * POST : réserve un créneau de visite.
 * - Marque le slot réservé (RLS "visit_slots_book" : slot libre uniquement)
 * - Envoie un message type='visite' dans la conversation avec le loueur
 * - Notification in-app au loueur
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: slot } = await supabase
    .from('visit_slots')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!slot) return NextResponse.json({ error: 'Créneau introuvable' }, { status: 404 })
  if (slot.is_booked) return NextResponse.json({ error: 'Créneau déjà réservé' }, { status: 409 })
  if (slot.owner_id === user.id) return NextResponse.json({ error: 'Impossible de réserver son propre créneau' }, { status: 400 })

  const { data: updated, error: bookError } = await supabase
    .from('visit_slots')
    .update({ is_booked: true, booked_by: user.id })
    .eq('id', params.id)
    .eq('is_booked', false)
    .select()
  if (bookError) return NextResponse.json({ error: bookError.message }, { status: 500 })
  if (!updated?.length) return NextResponse.json({ error: 'Créneau déjà réservé' }, { status: 409 })

  // ── Conversation avec le loueur (trouve ou crée) ──
  let convId: string | null = null
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .or(`and(user1_id.eq.${user.id},user2_id.eq.${slot.owner_id}),and(user1_id.eq.${slot.owner_id},user2_id.eq.${user.id})`)
    .limit(1)
    .maybeSingle()

  if (existing) {
    convId = existing.id
  } else {
    let { data: newConv } = await supabase
      .from('conversations')
      .insert({ user1_id: user.id, user2_id: slot.owner_id, ...(slot.listing_id ? { listing_id: slot.listing_id } : {}) })
      .select('id')
      .single()
    if (!newConv) {
      ;({ data: newConv } = await supabase
        .from('conversations')
        .insert({ user1_id: user.id, user2_id: slot.owner_id })
        .select('id')
        .single())
    }
    convId = newConv?.id ?? null
  }

  // ── Message riche "visite" dans la conversation ──
  const dateLabel = new Date(`${slot.slot_date}T${slot.slot_time}`).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const timeLabel = String(slot.slot_time).slice(0, 5)

  if (convId) {
    await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: user.id,
      content: `📅 Visite réservée le ${dateLabel} à ${timeLabel}`,
      type: 'visite',
      payload: {
        date: slot.slot_date,
        time: timeLabel,
        type: 'physique',
        status: 'accepted',
        listing_id: slot.listing_id,
        slot_id: slot.id,
      },
      read: false,
    })
  }

  // ── Notification in-app au loueur ──
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://isaly.fr'
  await fetch(`${appUrl}/api/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: slot.owner_id,
      type: 'alert',
      title: 'Nouvelle visite réservée 📅',
      body: `Un locataire a réservé le ${dateLabel} à ${timeLabel}.`,
      link: '/app/messages?agenda=1',
    }),
  }).catch(() => {})

  return NextResponse.json({ ok: true, conversationId: convId })
}

/** DELETE : annule une réservation (locataire qui a réservé, ou loueur). */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: slot } = await supabase
    .from('visit_slots')
    .select('id, owner_id, booked_by')
    .eq('id', params.id)
    .single()

  if (!slot) return NextResponse.json({ error: 'Créneau introuvable' }, { status: 404 })
  if (slot.owner_id !== user.id && slot.booked_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('visit_slots')
    .update({ is_booked: false, booked_by: null })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
