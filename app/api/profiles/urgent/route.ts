import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendPushNotification } from '@/lib/webpush'

const URGENT_DURATION_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Mission 15 — active/désactive le mode recherche urgente (7 jours).
 * À l'activation : notifie les loueurs ayant une annonce active dans la ville.
 */
export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { active?: boolean; available_from?: string; city?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  if (body.active === false) {
    const { error } = await supabase.from('profiles').update({
      urgent_search_active: false,
      urgent_search_expires_at: null,
    }).eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ active: false })
  }

  const city = (body.city ?? '').trim()
  if (!city || !body.available_from) {
    return NextResponse.json({ error: 'Ville et date de disponibilité requises' }, { status: 400 })
  }

  const expiresAt = new Date(Date.now() + URGENT_DURATION_MS).toISOString()
  const { error } = await supabase.from('profiles').update({
    urgent_search_active: true,
    urgent_search_expires_at: expiresAt,
    urgent_search_available_from: body.available_from,
  }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notification aux loueurs compatibles (annonce active dans la ville) — service
  // role : insertion de notifications pour d'autres utilisateurs (RLS).
  try {
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: listings } = await admin
      .from('listings')
      .select('owner_id')
      .eq('is_active', true)
      .ilike('city', `%${city}%`)
      .limit(200)

    const ownerIds = Array.from(new Set((listings ?? []).map(l => l.owner_id).filter((id): id is string => !!id && id !== user.id))).slice(0, 50)

    for (const ownerId of ownerIds) {
      await admin.from('notifications').insert({
        user_id: ownerId,
        type: 'alert',
        title: 'Un locataire cherche activement dans votre ville 🔥',
        body: `Recherche urgente à ${city} — disponible dès le ${new Date(body.available_from).toLocaleDateString('fr-FR')}.`,
        link: '/app/swipe',
      })
    }

    if (ownerIds.length > 0) {
      const { data: subs } = await admin
        .from('push_subscriptions')
        .select('user_id, subscription')
        .in('user_id', ownerIds)
      for (const s of subs ?? []) {
        if (s.subscription) {
          await sendPushNotification(s.subscription, {
            title: 'Un locataire cherche activement dans votre ville 🔥',
            body: `Recherche urgente à ${city} — découvrez son profil dans le swipe.`,
            url: '/app/swipe',
          })
        }
      }
    }
  } catch (err) {
    console.error('Urgent search notify error:', err)
  }

  return NextResponse.json({ active: true, expires_at: expiresAt })
}
