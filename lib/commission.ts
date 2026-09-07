/**
 * Commission de gestion ISALY (2,5 % du loyer / mois) — logique d'arrêt.
 *
 * Structure : UNE ligne `lease_commissions` PAR LOCATAIRE (migration 39), pas
 * une par bail. Conséquence directe : dans une colocation, le départ d'un seul
 * colocataire n'arrête que SA part ; les autres continuent d'être redevables.
 *
 * Coupe-circuit : tant que `BILLING_ENABLED` vaut `false` (lib/billing.ts),
 * « arrêter la commission » ne touche à AUCUN abonnement Stripe — la fonction
 * se contente de basculer le statut interne `commission_active`. Le chemin
 * d'annulation réelle est déjà écrit ci-dessous : il s'activera tout seul le
 * jour où le drapeau repassera à `true` et où les abonnements porteront un
 * `stripe_subscription_id`.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { BILLING_ENABLED } from '@/lib/billing'

/** Taux de la commission de gestion, figé sur chaque ligne à sa création. */
export const COMMISSION_RATE = 0.025

export type StopReason = 'lease_end' | 'preavis' | 'lease_ended_status' | 'manual'

export interface LeaseCommissionRow {
  id: string
  lease_id: string
  tenant_id: string
  rate: number
  share_rent: number | null
  commission_active: boolean
  started_at: string
  stopped_at: string | null
  stop_reason: StopReason | null
  stripe_subscription_id: string | null
  created_at: string
}

export interface StopResult {
  stopped: boolean
  /** `true` si l'abonnement Stripe réel a effectivement été annulé. */
  stripeCancelled: boolean
  reason?: string
}

/** Libellés d'audit — repris tels quels dans les logs et `admin_actions.details`. */
const REASON_LABEL: Record<StopReason, string> = {
  lease_end:          'fin normale du bail (date de fin atteinte)',
  lease_ended_status: 'bail passé au statut « terminé »',
  preavis:            'préavis du locataire (date de fin effective atteinte)',
  manual:             'arrêt manuel (administration)',
}

/**
 * Liste des locataires d'un bail : le titulaire (`leases.tenant_id`) plus les
 * colocataires déclarés (`lease_roommates`), dédoublonnés.
 */
export async function getLeaseTenantIds(
  supabase: SupabaseClient,
  leaseId: string,
  tenantId?: string | null,
): Promise<string[]> {
  const ids = new Set<string>()
  if (tenantId) ids.add(tenantId)

  const { data: roommates } = await supabase
    .from('lease_roommates')
    .select('profile_id')
    .eq('lease_id', leaseId)

  for (const r of (roommates ?? []) as { profile_id: string | null }[]) {
    if (r.profile_id) ids.add(r.profile_id)
  }
  return Array.from(ids)
}

/**
 * Crée les lignes de commission manquantes pour un bail — une par locataire.
 *
 * `share_rent` est figée à la création (loyer / nombre de locataires) : le
 * départ d'un colocataire ne doit PAS renchérir la part des autres, qui ont
 * accepté un montant à la signature.
 *
 * Ne réactive jamais une ligne arrêtée : un locataire parti qui reviendrait
 * doit repasser par un nouveau bail.
 */
export async function ensureLeaseCommissions(
  supabase: SupabaseClient,
  lease: { id: string; tenant_id: string | null; monthly_rent: number | null },
): Promise<number> {
  const tenantIds = await getLeaseTenantIds(supabase, lease.id, lease.tenant_id)
  if (tenantIds.length === 0) return 0

  const { data: existing } = await supabase
    .from('lease_commissions')
    .select('tenant_id')
    .eq('lease_id', lease.id)

  const known = new Set(((existing ?? []) as { tenant_id: string }[]).map(r => r.tenant_id))
  const missing = tenantIds.filter(id => !known.has(id))
  if (missing.length === 0) return 0

  const shareRent = lease.monthly_rent != null
    ? Math.round((lease.monthly_rent / tenantIds.length) * 100) / 100
    : null

  const { error } = await supabase.from('lease_commissions').insert(
    missing.map(tenantId => ({
      lease_id:          lease.id,
      tenant_id:         tenantId,
      rate:              COMMISSION_RATE,
      share_rent:        shareRent,
      commission_active: true,
    })),
  )
  if (error) {
    console.error('[commission] création des parts impossible', { leaseId: lease.id, error: error.message })
    return 0
  }
  return missing.length
}

/**
 * Arrête la part de commission d'UN locataire sur UN bail.
 *
 * Idempotent : une part déjà arrêtée n'est ni réécrite ni re-loguée, pour que
 * le cron quotidien puisse repasser sur les mêmes baux sans polluer l'audit.
 *
 * @param supabase client service role (le RLS interdit l'écriture côté user)
 */
export async function stopCommissionForTenant(
  supabase: SupabaseClient,
  leaseId: string,
  tenantId: string,
  reason: StopReason,
  details: Record<string, unknown> = {},
): Promise<StopResult> {
  const { data: row } = await supabase
    .from('lease_commissions')
    .select('id, commission_active, stripe_subscription_id, share_rent, rate')
    .eq('lease_id', leaseId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!row) return { stopped: false, stripeCancelled: false, reason: 'no_commission_record' }
  if (row.commission_active === false) return { stopped: false, stripeCancelled: false, reason: 'already_stopped' }

  // ── Abonnement Stripe réel ────────────────────────────────────
  // Rien n'est appelé tant que le coupe-circuit est fermé : la facturation
  // n'est pas branchée, aucun abonnement « commission » n'existe encore.
  let stripeCancelled = false
  const subscriptionId = row.stripe_subscription_id as string | null
  if (BILLING_ENABLED && subscriptionId) {
    try {
      const { stripe } = await import('@/lib/stripe')
      await stripe.subscriptions.cancel(subscriptionId)
      stripeCancelled = true
    } catch (err) {
      // L'annulation Stripe échoue → on arrête quand même le statut interne et
      // on le trace : mieux vaut une ligne à rapprocher qu'une commission qui
      // continue de courir côté ISALY.
      console.error('[commission] annulation Stripe impossible', { leaseId, tenantId, subscriptionId, err })
    }
  }

  const stoppedAt = new Date().toISOString()
  const { error } = await supabase
    .from('lease_commissions')
    .update({ commission_active: false, stopped_at: stoppedAt, stop_reason: reason })
    .eq('id', row.id)

  if (error) {
    console.error('[commission] arrêt impossible', { leaseId, tenantId, error: error.message })
    return { stopped: false, stripeCancelled, reason: error.message }
  }

  // ── Audit ─────────────────────────────────────────────────────
  // Qui, quand, pourquoi — relisible tel quel une fois la facturation
  // réactivée. Trace en base (admin_actions) + trace serveur.
  const auditDetails = {
    lease_id:          leaseId,
    tenant_id:         tenantId,
    commission_id:     row.id,
    reason,
    reason_label:      REASON_LABEL[reason],
    share_rent:        row.share_rent,
    rate:              row.rate,
    stopped_at:        stoppedAt,
    stripe_cancelled:  stripeCancelled,
    billing_enabled:   BILLING_ENABLED,
    ...details,
  }

  console.log('[commission] arrêt', JSON.stringify(auditDetails))

  try {
    await supabase.from('admin_actions').insert({
      action:      'commission_stopped',
      target_type: 'lease_commission',
      target_id:   row.id,
      details:     auditDetails,
    })
  } catch (err) {
    console.error('[commission] log admin_actions impossible', err)
  }

  return { stopped: true, stripeCancelled }
}
