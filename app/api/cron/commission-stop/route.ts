import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { BILLING_ENABLED } from '@/lib/billing'
import { getLeaseTenantIds, stopCommissionForTenant } from '@/lib/commission'
import { toDateKey } from '@/lib/preavis'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * Arrêt automatique de la commission de gestion (C3) — passage quotidien.
 *
 * Trois déclencheurs, du plus large au plus fin :
 *   1. `leases.end_date` atteinte      → arrêt pour TOUS les locataires du bail.
 *   2. `leases.status = 'ended'`       → rattrapage des parts encore actives
 *      sur un bail clos sans date de fin renseignée (elle est nullable :
 *      beaucoup de baux sont en tacite reconduction).
 *   3. `preavis.date_fin_effective` atteinte → arrêt de la SEULE part du
 *      locataire qui a déclaré son préavis. Les autres colocataires du même
 *      bail continuent — c'est tout l'intérêt de la structure par personne.
 *
 * Rien n'est supprimé : les lignes passent à `commission_active = false` avec
 * leur horodatage et leur motif. `stopCommissionForTenant` est idempotent, le
 * cron peut donc repasser sur les mêmes baux sans dupliquer les journaux.
 *
 * Tant que `BILLING_ENABLED` vaut `false`, aucun appel Stripe n'est émis.
 */
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const today = toDateKey(new Date())
  let stoppedLeaseEnd = 0
  let stoppedPreavis = 0
  let preavisApplied = 0

  // ── 1 & 2. Fin de bail ────────────────────────────────────────
  const { data: endedLeases } = await supabase
    .from('leases')
    .select('id, tenant_id, end_date, status')
    // `end_date.lte` écarte déjà les baux sans date de fin (NULL non comparable).
    .or(`end_date.lte.${today},status.eq.ended`)

  for (const lease of (endedLeases ?? []) as { id: string; tenant_id: string | null; end_date: string | null; status: string }[]) {
    const reason = lease.status === 'ended' && !(lease.end_date && lease.end_date <= today)
      ? 'lease_ended_status' as const
      : 'lease_end' as const

    const tenantIds = await getLeaseTenantIds(supabase, lease.id, lease.tenant_id)
    for (const tenantId of tenantIds) {
      const result = await stopCommissionForTenant(supabase, lease.id, tenantId, reason, {
        lease_end_date: lease.end_date,
        lease_status: lease.status,
        triggered_by: 'cron/commission-stop',
      })
      if (result.stopped) stoppedLeaseEnd++
    }
  }

  // ── 3. Préavis échus ──────────────────────────────────────────
  const { data: duePreavis } = await supabase
    .from('preavis')
    .select('id, lease_id, tenant_id, date_fin_effective, type_logement, delai_mois, date_declaration')
    .eq('status', 'active')
    .lte('date_fin_effective', today)

  for (const p of (duePreavis ?? []) as {
    id: string; lease_id: string; tenant_id: string; date_fin_effective: string
    type_logement: string; delai_mois: number; date_declaration: string
  }[]) {
    const result = await stopCommissionForTenant(supabase, p.lease_id, p.tenant_id, 'preavis', {
      preavis_id: p.id,
      date_declaration: p.date_declaration,
      date_fin_effective: p.date_fin_effective,
      type_logement: p.type_logement,
      delai_mois: p.delai_mois,
      triggered_by: 'cron/commission-stop',
    })
    if (result.stopped) stoppedPreavis++

    // Le préavis est marqué appliqué même si aucune part n'était à arrêter
    // (bail sans commission enregistrée) : sa date d'effet est passée, il ne
    // doit plus être rétractable ni repassé demain.
    const { error } = await supabase
      .from('preavis')
      .update({ status: 'applied', applied_at: new Date().toISOString() })
      .eq('id', p.id)
      .eq('status', 'active')

    if (!error) preavisApplied++

    // Le locataire est prévenu que son départ a pris effet ; le loueur l'avait
    // déjà été au dépôt (app/api/preavis/route.ts).
    try {
      await supabase.from('notifications').insert({
        user_id: p.tenant_id,
        type:    'bail',
        title:   'Votre préavis a pris effet',
        body:    'Votre départ est effectif : la commission ISALY liée à ce bail ne vous est plus prélevée.',
        link:    '/app/preavis',
        read:    false,
      })
    } catch {}
  }

  const summary = {
    date: today,
    billing_enabled: BILLING_ENABLED,
    stopped_lease_end: stoppedLeaseEnd,
    stopped_preavis: stoppedPreavis,
    preavis_applied: preavisApplied,
  }
  console.log('[cron/commission-stop]', JSON.stringify(summary))

  return NextResponse.json(summary)
}
