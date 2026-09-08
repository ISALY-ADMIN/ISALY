import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createApiClient } from '@/lib/supabase/api-auth'
import { resend, FROM_EMAIL, APP_URL } from '@/lib/resend'
import { preavisDeposeTemplate, preavisAnnuleTemplate } from '@/lib/email-templates'
import { ensureLeaseCommissions } from '@/lib/commission'
import {
  DELAI_PREAVIS_MOIS,
  TYPE_LOGEMENT_LABEL,
  computeDateFinEffective,
  formatDateFr,
  resolveTypeLogement,
  toDateKey,
  type TypeLogement,
} from '@/lib/preavis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Préavis de départ du locataire (C2).
 *
 *   GET    → bail en cours + délai applicable + date de fin calculée (aperçu
 *            affiché AVANT confirmation) + préavis déjà déposé le cas échéant.
 *   POST   → dépose le préavis, horodaté serveur, et prévient le loueur.
 *   DELETE → rétractation, autorisée tant que la date de fin effective n'est
 *            pas atteinte (voir la note « Rétractation » plus bas).
 *
 * La date de déclaration n'est jamais lue depuis le corps de la requête : elle
 * est posée par le serveur, sinon un locataire pourrait antidater son départ.
 */

interface LeaseForPreavis {
  id: string
  address: string | null
  city: string | null
  monthly_rent: number | null
  end_date: string | null
  owner_id: string | null
  tenant_id: string | null
  meuble: boolean | null
  listing_id: string | null
  status: string
}

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

/**
 * Bail actif du locataire connecté — titulaire (`leases.tenant_id`) ou
 * colocataire déclaré (`lease_roommates`). Le RLS de la migration 30 rend déjà
 * les deux cas lisibles ; on interroge les deux chemins pour ne pas rater un
 * colocataire qui n'est pas le titulaire.
 */
async function findActiveLease(
  supabase: Awaited<ReturnType<typeof createApiClient>>['supabase'],
  userId: string,
  leaseId?: string | null,
): Promise<LeaseForPreavis | null> {
  const columns = 'id, address, city, monthly_rent, end_date, owner_id, tenant_id, meuble, listing_id, status'

  if (leaseId) {
    const { data } = await supabase.from('leases').select(columns).eq('id', leaseId).maybeSingle()
    return (data as LeaseForPreavis | null) ?? null
  }

  const { data: own } = await supabase
    .from('leases')
    .select(columns)
    .eq('tenant_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)

  if (own && own.length > 0) return own[0] as LeaseForPreavis

  const { data: memberships } = await supabase
    .from('lease_roommates')
    .select('lease_id')
    .eq('profile_id', userId)

  const ids = ((memberships ?? []) as { lease_id: string }[]).map(m => m.lease_id)
  if (ids.length === 0) return null

  const { data: shared } = await supabase
    .from('leases')
    .select(columns)
    .in('id', ids)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)

  return (shared && shared.length > 0 ? (shared[0] as LeaseForPreavis) : null)
}

/** Régime du bail, avec repli sur l'annonce liée quand `leases.meuble` est vide. */
async function typeLogementForLease(
  supabase: Awaited<ReturnType<typeof createApiClient>>['supabase'],
  lease: LeaseForPreavis,
): Promise<TypeLogement | null> {
  if (lease.meuble !== null && lease.meuble !== undefined) {
    return resolveTypeLogement(lease.meuble)
  }
  if (!lease.listing_id) return null
  const { data: listing } = await supabase
    .from('listings')
    .select('meuble')
    .eq('id', lease.listing_id)
    .maybeSingle()
  return resolveTypeLogement(null, (listing?.meuble as boolean | null) ?? null)
}

// ═══════════════════════════════════════════════════════════════
// GET — état courant + aperçu de la date de fin
// ═══════════════════════════════════════════════════════════════

export async function GET(req: Request) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leaseId = new URL(req.url).searchParams.get('lease_id')
  const lease = await findActiveLease(supabase, user.id, leaseId)
  if (!lease) return NextResponse.json({ lease: null, preavis: null })

  const typeLogement = await typeLogementForLease(supabase, lease)

  const { data: existing } = await supabase
    .from('preavis')
    .select('*')
    .eq('lease_id', lease.id)
    .eq('tenant_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  // Aperçu : ce que donnerait une déclaration faite maintenant. Recalculé à
  // chaque appel — la date affichée doit être celle du jour de la confirmation.
  const now = new Date()
  const preview = typeLogement
    ? {
        type_logement: typeLogement,
        delai_mois: DELAI_PREAVIS_MOIS[typeLogement],
        date_fin_effective: toDateKey(computeDateFinEffective(now, typeLogement)),
      }
    : null

  return NextResponse.json({
    lease: {
      id: lease.id,
      address: lease.address,
      city: lease.city,
      monthly_rent: lease.monthly_rent,
      end_date: lease.end_date,
    },
    /** `null` = régime inconnu : le locataire doit le déclarer lui-même. */
    type_logement: typeLogement,
    preview,
    preavis: existing ?? null,
  })
}

// ═══════════════════════════════════════════════════════════════
// POST — dépôt du préavis
// ═══════════════════════════════════════════════════════════════

export async function POST(req: Request) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    lease_id?: string
    /** Uniquement quand le régime n'est pas connu du bail ni de l'annonce. */
    type_logement?: TypeLogement
    /** Garde-fou : le client confirme avoir affiché la date calculée. */
    confirm?: boolean
  }

  if (body.confirm !== true) {
    return NextResponse.json({ error: 'Confirmation explicite requise' }, { status: 400 })
  }

  const lease = await findActiveLease(supabase, user.id, body.lease_id ?? null)
  if (!lease) return NextResponse.json({ error: 'Aucun bail actif à votre nom' }, { status: 404 })
  if (lease.status !== 'active') {
    return NextResponse.json({ error: 'Ce bail n’est pas actif' }, { status: 400 })
  }

  // Régime : le bail (ou l'annonce) fait foi ; le locataire ne le déclare que
  // si aucun des deux ne le porte — sinon il pourrait choisir 1 mois sur un
  // logement non meublé.
  const known = await typeLogementForLease(supabase, lease)
  const typeLogement = known ?? body.type_logement ?? null
  if (!typeLogement || (typeLogement !== 'meuble' && typeLogement !== 'non_meuble')) {
    return NextResponse.json(
      { error: 'Type de logement inconnu : précisez si le logement est meublé ou non.' },
      { status: 400 },
    )
  }

  const { data: already } = await supabase
    .from('preavis')
    .select('id, date_fin_effective')
    .eq('lease_id', lease.id)
    .eq('tenant_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (already) {
    return NextResponse.json(
      { error: 'Un préavis est déjà en cours pour ce bail.', preavis: already },
      { status: 409 },
    )
  }

  const dateDeclaration = new Date()
  const dateFinEffective = computeDateFinEffective(dateDeclaration, typeLogement)

  const { data: created, error } = await supabase
    .from('preavis')
    .insert({
      lease_id:           lease.id,
      tenant_id:          user.id,
      date_declaration:   dateDeclaration.toISOString(),
      date_fin_effective: toDateKey(dateFinEffective),
      type_logement:      typeLogement,
      delai_mois:         DELAI_PREAVIS_MOIS[typeLogement],
      status:             'active',
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const admin = serviceClient()

  // Le régime appliqué est figé sur le bail : la même déclaration donnera le
  // même délai demain, même si l'annonce est modifiée entre-temps.
  if (lease.meuble === null || lease.meuble === undefined) {
    await admin.from('leases').update({ meuble: typeLogement === 'meuble' }).eq('id', lease.id)
  }

  // Les parts de commission peuvent ne pas exister encore (la facturation n'a
  // jamais tourné) : on les crée ici pour que l'arrêt automatique ait une ligne
  // à basculer le jour venu.
  await ensureLeaseCommissions(admin, {
    id: lease.id,
    tenant_id: lease.tenant_id,
    monthly_rent: lease.monthly_rent,
  })

  await notifyOwner(admin, lease, user.id, {
    kind: 'depose',
    typeLogement,
    dateFinEffective: toDateKey(dateFinEffective),
  })

  return NextResponse.json({ preavis: created })
}

// ═══════════════════════════════════════════════════════════════
// DELETE — rétractation
// ═══════════════════════════════════════════════════════════════

/**
 * Rétractation. Règle retenue : autorisée tant que la date de fin effective
 * n'est PAS atteinte, et uniquement par l'auteur du préavis.
 *
 * Passé cette date, la part de commission a été arrêtée et le loueur a pu
 * relouer : la rétractation devient un accord entre les parties, pas un geste
 * unilatéral depuis l'application. Le préavis passe en `cancelled` (aucune
 * suppression) et le loueur est prévenu.
 */
export async function DELETE(req: Request) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { id?: string }

  let query = supabase
    .from('preavis')
    .select('*')
    .eq('tenant_id', user.id)
    .eq('status', 'active')
  if (body.id) query = query.eq('id', body.id)

  const { data: rows } = await query.order('created_at', { ascending: false }).limit(1)
  const preavis = rows && rows.length > 0 ? rows[0] : null
  if (!preavis) return NextResponse.json({ error: 'Aucun préavis en cours' }, { status: 404 })

  // Comparaison à la journée : un préavis qui échoit aujourd'hui reste
  // rétractable jusqu'à ce que le cron l'applique.
  if (String(preavis.date_fin_effective) < toDateKey(new Date())) {
    return NextResponse.json(
      { error: 'La date de fin est dépassée : ce préavis ne peut plus être annulé depuis l’application.' },
      { status: 409 },
    )
  }

  const { error } = await supabase
    .from('preavis')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', preavis.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const admin = serviceClient()
  const { data: lease } = await admin
    .from('leases')
    .select('id, address, city, owner_id, tenant_id, monthly_rent, end_date, meuble, listing_id, status')
    .eq('id', preavis.lease_id)
    .maybeSingle()

  if (lease) {
    await notifyOwner(admin, lease as LeaseForPreavis, user.id, {
      kind: 'annule',
      typeLogement: preavis.type_logement as TypeLogement,
      dateFinEffective: String(preavis.date_fin_effective),
    })
  }

  console.log('[preavis] rétractation', JSON.stringify({
    preavis_id: preavis.id,
    lease_id: preavis.lease_id,
    tenant_id: user.id,
    date_fin_effective: preavis.date_fin_effective,
    cancelled_at: new Date().toISOString(),
  }))

  return NextResponse.json({ cancelled: true })
}

// ═══════════════════════════════════════════════════════════════
// Notification du loueur (in-app + email Resend)
// ═══════════════════════════════════════════════════════════════

async function notifyOwner(
  admin: ReturnType<typeof serviceClient>,
  lease: LeaseForPreavis,
  tenantId: string,
  info: { kind: 'depose' | 'annule'; typeLogement: TypeLogement; dateFinEffective: string },
) {
  if (!lease.owner_id) return

  const [{ data: owner }, { data: tenant }] = await Promise.all([
    admin.from('profiles').select('email, first_name').eq('id', lease.owner_id).maybeSingle(),
    admin.from('profiles').select('first_name, last_name').eq('id', tenantId).maybeSingle(),
  ])

  const tenantName = `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim() || 'Votre locataire'
  const address = `${lease.address ?? 'Votre logement'}${lease.city ? `, ${lease.city}` : ''}`
  const dateLabel = formatDateFr(info.dateFinEffective)
  const leaseUrl = `${APP_URL}/app/bail/${lease.id}`

  const title = info.kind === 'depose' ? 'Préavis déposé par votre locataire' : 'Préavis retiré'
  const notifBody = info.kind === 'depose'
    ? `${tenantName} quittera le logement le ${dateLabel} (préavis ${TYPE_LOGEMENT_LABEL[info.typeLogement]} de ${DELAI_PREAVIS_MOIS[info.typeLogement]} mois).`
    : `${tenantName} a annulé son préavis. Le départ prévu le ${dateLabel} n'aura pas lieu.`

  try {
    await admin.from('notifications').insert({
      user_id: lease.owner_id,
      type:    'bail',
      title,
      body:    notifBody,
      link:    `/app/bail/${lease.id}`,
      read:    false,
    })
  } catch (err) {
    console.error('[preavis] notification in-app impossible', err)
  }

  if (!owner?.email) return
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: owner.email,
      subject: info.kind === 'depose'
        ? `Préavis déposé — départ le ${dateLabel} — ISALY`
        : `Préavis retiré — ISALY`,
      html: info.kind === 'depose'
        ? preavisDeposeTemplate(
            owner.first_name ?? '',
            tenantName,
            address,
            TYPE_LOGEMENT_LABEL[info.typeLogement],
            DELAI_PREAVIS_MOIS[info.typeLogement],
            dateLabel,
            leaseUrl,
          )
        : preavisAnnuleTemplate(owner.first_name ?? '', tenantName, address, dateLabel, leaseUrl),
    })
  } catch (err) {
    console.error('[preavis] email Resend impossible', err)
  }
}
