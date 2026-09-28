import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/admin/serviceClient'
import { findActiveAgency, getListingManagement } from '@/lib/managementMode'
import { isMissingSchema } from '@/lib/schemaFallback'
import { resend, FROM_EMAIL } from '@/lib/resend'
import { agencyDelegationTemplate } from '@/lib/email-templates'

export const dynamic = 'force-dynamic'

const NEEDS_MIGRATION =
  'La délégation à une agence partenaire sera disponible après la mise à jour de la base de données.'

/**
 * Le bailleur confie son logement à une agence partenaire.
 *
 * Conditions : l'utilisateur est le bailleur du logement, le logement n'a
 * pas encore de parcours, et une agence partenaire active existe dans sa
 * ville. Effets : ligne delegations (commission_status 'a_facturer'), logement
 * en 'delegue' avec partner_agency_id et delegated_at, e-mail de notification
 * à l'agence (sans pièce jointe).
 */
export async function POST(req: Request, { params }: { params: { listingId: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { tenant_id?: string; candidature_id?: string }

  const { data: listing } = await supabase
    .from('listings')
    .select('id, owner_id, city, title, neighborhood')
    .eq('id', params.listingId)
    .maybeSingle()
  if (!listing || listing.owner_id !== user.id) {
    return NextResponse.json({ error: 'Logement introuvable' }, { status: 404 })
  }

  const current = await getListingManagement(supabase, listing.id)
  if (!current.persisted) return NextResponse.json({ error: NEEDS_MIGRATION }, { status: 503 })
  if (current.mode) {
    return NextResponse.json({ error: 'Le parcours de ce logement est déjà choisi.' }, { status: 409 })
  }

  const agency = await findActiveAgency(supabase, listing.city as string | null)
  if (!agency) {
    return NextResponse.json({ error: 'Aucune agence partenaire n’est active dans la ville de ce logement.' }, { status: 409 })
  }

  // Candidat dont le dossier est validé : on vérifie qu'il a bien candidaté ici.
  let tenantId: string | null = null
  if (body.tenant_id) {
    const { data: cand } = await supabase
      .from('swipes')
      .select('swiper_id')
      .eq('listing_id', listing.id)
      .eq('swiper_id', body.tenant_id)
      .maybeSingle()
    tenantId = (cand?.swiper_id as string | undefined) ?? null
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { error: delErr } = await admin.from('delegations').insert({
    listing_id: listing.id,
    tenant_id: tenantId,
    agency_id: agency.id,
    transmitted_at: now,
    commission_status: 'a_facturer',
  })
  if (delErr) {
    if (isMissingSchema(delErr)) return NextResponse.json({ error: NEEDS_MIGRATION }, { status: 503 })
    console.error('[gestion/delegation] insertion', delErr)
    return NextResponse.json({ error: 'La transmission n’a pas pu être enregistrée.' }, { status: 502 })
  }

  const { error: upErr } = await admin
    .from('listings')
    .update({ management_mode: 'delegue', partner_agency_id: agency.id, delegated_at: now })
    .eq('id', listing.id)
    .is('management_mode', null)
  if (upErr) {
    if (isMissingSchema(upErr)) return NextResponse.json({ error: NEEDS_MIGRATION }, { status: 503 })
    console.error('[gestion/delegation] logement', upErr)
    return NextResponse.json({ error: 'La transmission n’a pas pu être enregistrée.' }, { status: 502 })
  }

  // Candidature du dossier transmis : acceptée (le candidat suit sa demande).
  if (tenantId) {
    await admin
      .from('swipes')
      .update({ candidature_status: 'accepted', decided_at: now })
      .eq('listing_id', listing.id)
      .eq('swiper_id', tenantId)
      .then(() => undefined, () => undefined)
  }

  // E-mail de notification à l'agence (Resend existant), sans pièce jointe.
  let emailSent = false
  if (agency.email && process.env.RESEND_API_KEY) {
    try {
      const [{ data: owner }, { data: tenant }] = await Promise.all([
        admin.from('profiles').select('first_name, last_name, phone').eq('id', user.id).maybeSingle(),
        tenantId
          ? admin.from('profiles').select('first_name, last_name').eq('id', tenantId).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      await resend.emails.send({
        from: FROM_EMAIL,
        to: agency.email,
        subject: 'Un logement ISALY vous est confié',
        html: agencyDelegationTemplate({
          agencyName: agency.name,
          address: (listing.title as string | null) || (listing.neighborhood as string | null) || 'Logement en colocation',
          city: (listing.city as string | null) ?? agency.city,
          ownerName: `${owner?.first_name ?? ''} ${owner?.last_name ?? ''}`.trim() || 'Bailleur ISALY',
          ownerEmail: user.email ?? '',
          ownerPhone: (owner?.phone as string | null) ?? null,
          tenantName: tenant ? `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim() || null : null,
        }),
      })
      emailSent = true
    } catch (err) {
      console.error('[gestion/delegation] e-mail agence', err)
    }
  }

  return NextResponse.json({ ok: true, agency: { id: agency.id, name: agency.name }, emailSent })
}
