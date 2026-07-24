import { createApiClient } from '@/lib/supabase/api-auth'
import { NextResponse } from 'next/server'
import type { CandidatureStatus, EmploiSituation } from '@/types/database'

const EMPLOIS: EmploiSituation[] = ['salarie', 'etudiant', 'independant', 'autre']

/**
 * POST /api/candidatures
 * Le locataire postule à une annonce (ou met à jour sa candidature).
 * Une candidature = un swipe (direction 'right') ciblant le loueur, avec
 * listing_id + critères. Réutilise la contrainte d'unicité (swiper, swiped)
 * de la table swipes : on met à jour la ligne existante ou on l'insère.
 */
export async function POST(request: Request) {
  const { supabase, user } = await createApiClient(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    listing_id?: string
    motivation_message?: string
    move_in_date?: string | null
    lease_duration?: string | null
    emploi_situation?: string | null
    has_garant?: boolean | null
    colocataires_count?: number | null
  }

  if (!body.listing_id || typeof body.listing_id !== 'string') {
    return NextResponse.json({ error: 'listing_id required' }, { status: 400 })
  }

  // Récupère le propriétaire de l'annonce (= cible de la candidature)
  const { data: listing } = await supabase
    .from('listings')
    .select('id, owner_id, title, city')
    .eq('id', body.listing_id)
    .single()

  if (!listing || !listing.owner_id) {
    return NextResponse.json({ error: 'Listing introuvable' }, { status: 404 })
  }
  if (listing.owner_id === user.id) {
    return NextResponse.json({ error: 'Vous ne pouvez pas postuler à votre propre annonce' }, { status: 400 })
  }

  // Normalisation des critères
  const emploi = typeof body.emploi_situation === 'string' && EMPLOIS.includes(body.emploi_situation as EmploiSituation)
    ? (body.emploi_situation as EmploiSituation) : null
  const moveIn = typeof body.move_in_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.move_in_date)
    ? body.move_in_date : null
  const coloc = typeof body.colocataires_count === 'number' && body.colocataires_count >= 0
    ? Math.min(Math.round(body.colocataires_count), 20) : null

  const criteria = {
    listing_id: listing.id,
    direction: 'right' as const,
    motivation_message: (body.motivation_message ?? '').toString().slice(0, 1000).trim() || null,
    move_in_date: moveIn,
    lease_duration: typeof body.lease_duration === 'string' ? body.lease_duration.slice(0, 20) : null,
    emploi_situation: emploi,
    has_garant: typeof body.has_garant === 'boolean' ? body.has_garant : null,
    colocataires_count: coloc,
    applied_at: new Date().toISOString(),
  }

  // Ligne swipe existante (swiper, swiped) ?
  const { data: existing } = await supabase
    .from('swipes')
    .select('id, candidature_status')
    .eq('swiper_id', user.id)
    .eq('swiped_id', listing.owner_id)
    .maybeSingle()

  if (existing?.id) {
    const patch: Record<string, unknown> = { ...criteria }
    // On ne réinitialise pas un statut déjà décidé → repasse en 'pending'
    // seulement si aucune décision n'existait.
    if (!existing.candidature_status || existing.candidature_status === 'pending') {
      patch.candidature_status = 'pending'
    }
    const { error } = await supabase.from('swipes').update(patch).eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('swipes').insert({
      swiper_id: user.id,
      swiped_id: listing.owner_id,
      candidature_status: 'pending',
      ...criteria,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notifie le loueur
  const { data: me } = await supabase.from('profiles').select('first_name').eq('id', user.id).single()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://isaly.fr'
  const listingTitle = listing.title || (listing.city ? `Colocation à ${listing.city}` : 'votre annonce')
  fetch(`${appUrl}/api/notifications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: listing.owner_id,
      type: 'match',
      title: 'Nouvelle candidature 📩',
      body: `${me?.first_name ?? 'Un candidat'} a postulé à « ${listingTitle} ».`,
      link: `/app/mes-annonces/${listing.id}/candidatures`,
    }),
  }).catch(() => {})

  fetch(`${appUrl}/api/push/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: listing.owner_id,
      title: 'Nouvelle candidature 📩',
      body: `${me?.first_name ?? 'Un candidat'} a postulé à « ${listingTitle} ».`,
      url: `/app/mes-annonces/${listing.id}/candidatures`,
    }),
  }).catch(() => {})

  return NextResponse.json({ ok: true, status: 'pending' as CandidatureStatus })
}
