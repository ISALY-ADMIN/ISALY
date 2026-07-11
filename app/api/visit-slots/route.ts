import { NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-auth'

export interface VisitSlot {
  id: string
  owner_id: string
  listing_id: string | null
  slot_date: string
  slot_time: string
  duration_minutes: number
  is_booked: boolean
  booked_by: string | null
}

/**
 * GET ?listing_id=X  → créneaux d'une annonce (réservation locataire)
 * GET ?mine=1        → agenda : mes créneaux réservés (loueur) + mes visites (locataire)
 */
export async function GET(req: Request) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const p = new URL(req.url).searchParams
  const listingId = p.get('listing_id')
  const mine = p.get('mine') === '1'

  const today = new Date().toISOString().slice(0, 10)

  if (mine) {
    // Agenda unifié : visites réservées où je suis loueur OU locataire
    const { data, error } = await supabase
      .from('visit_slots')
      .select('*')
      .eq('is_booked', true)
      .or(`owner_id.eq.${user.id},booked_by.eq.${user.id}`)
      .gte('slot_date', today)
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const slots = data ?? []
    // Enrichir : titre annonce + nom de l'autre partie
    const listingIds = Array.from(new Set(slots.map(s => s.listing_id).filter(Boolean))) as string[]
    const otherIds = Array.from(new Set(slots.map(s => s.owner_id === user.id ? s.booked_by : s.owner_id).filter(Boolean))) as string[]

    const [{ data: listings }, { data: people }] = await Promise.all([
      listingIds.length ? supabase.from('listings').select('id, title, city').in('id', listingIds) : Promise.resolve({ data: [] as { id: string; title: string | null; city: string | null }[] }),
      otherIds.length ? supabase.from('profiles').select('id, first_name, last_name, avatar_url').in('id', otherIds) : Promise.resolve({ data: [] as { id: string; first_name: string | null; last_name: string | null; avatar_url: string | null }[] }),
    ])

    const listingById = new Map((listings ?? []).map(l => [l.id, l]))
    const personById = new Map((people ?? []).map(p2 => [p2.id, p2]))

    return NextResponse.json({
      visits: slots.map(s => {
        const otherId = s.owner_id === user.id ? s.booked_by : s.owner_id
        const other = otherId ? personById.get(otherId) : null
        const listing = s.listing_id ? listingById.get(s.listing_id) : null
        return {
          ...s,
          role: s.owner_id === user.id ? 'loueur' : 'locataire',
          otherName: other ? `${other.first_name ?? ''} ${(other.last_name ?? '')[0] ?? ''}.`.trim() : null,
          otherAvatar: other?.avatar_url ?? null,
          otherId: otherId ?? null,
          listingTitle: listing?.title ?? null,
          listingCity: listing?.city ?? null,
        }
      }),
    })
  }

  if (listingId) {
    const { data, error } = await supabase
      .from('visit_slots')
      .select('id, listing_id, owner_id, slot_date, slot_time, duration_minutes, is_booked')
      .eq('listing_id', listingId)
      .gte('slot_date', today)
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ slots: data ?? [] })
  }

  return NextResponse.json({ error: 'listing_id or mine required' }, { status: 400 })
}

/**
 * POST : le loueur remplace ses disponibilités pour une annonce.
 * Body : { listing_id, slots: [{ slot_date, slot_time }] }
 * Les créneaux réservés ne sont jamais supprimés.
 */
export async function POST(req: Request) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    listing_id?: string
    slots?: { slot_date: string; slot_time: string }[]
  }
  if (!body.listing_id || !Array.isArray(body.slots)) {
    return NextResponse.json({ error: 'listing_id and slots required' }, { status: 400 })
  }

  // Vérifie la propriété de l'annonce
  const { data: listing } = await supabase
    .from('listings')
    .select('id, owner_id')
    .eq('id', body.listing_id)
    .single()
  if (!listing || listing.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Supprime les créneaux libres existants puis insère les nouveaux
  const { error: delError } = await supabase
    .from('visit_slots')
    .delete()
    .eq('listing_id', body.listing_id)
    .eq('owner_id', user.id)
    .eq('is_booked', false)
  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

  if (body.slots.length > 0) {
    const rows = body.slots
      .filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s.slot_date) && /^\d{2}:\d{2}$/.test(s.slot_time))
      .map(s => ({
        owner_id: user.id,
        listing_id: body.listing_id,
        slot_date: s.slot_date,
        slot_time: s.slot_time,
      }))
    if (rows.length > 0) {
      // upsert : ignore les doublons avec un créneau réservé conservé
      const { error: insError } = await supabase
        .from('visit_slots')
        .upsert(rows, { onConflict: 'owner_id,listing_id,slot_date,slot_time', ignoreDuplicates: true })
      if (insError) return NextResponse.json({ error: insError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
