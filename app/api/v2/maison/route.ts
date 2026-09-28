import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveTenantLease } from '@/lib/v2/tenant'

export const dynamic = 'force-dynamic'

/**
 * Ma maison (dashboard v2) : bail du locataire, parcours du logement (qui le
 * gère), loyers et quittances, signalements, préavis en cours.
 */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const lease = await resolveTenantLease(supabase, user.id).catch(() => null)
  if (!lease) return NextResponse.json({ lease: null })

  const [pays, reqs, preavis] = await Promise.all([
    supabase.from('rent_payments').select('id, month, amount, status, paid_at, receipt_url, due_date')
      .eq('lease_id', lease.id).order('month', { ascending: false }).limit(24),
    supabase.from('maintenance_requests').select('id, title, category, description, status, created_at, bailleur_comment, resolved_at')
      .eq('lease_id', lease.id).eq('tenant_id', user.id).order('created_at', { ascending: false }),
    supabase.from('preavis').select('id, date_declaration, date_fin_effective, delai_mois, status')
      .eq('lease_id', lease.id).eq('tenant_id', user.id).eq('status', 'active').maybeSingle(),
  ])

  // due_date (migration 15) peut manquer : on relit sans elle plutôt que d'échouer.
  let payments = pays.data ?? []
  if (pays.error) {
    const { data } = await supabase.from('rent_payments').select('id, month, amount, status, paid_at, receipt_url')
      .eq('lease_id', lease.id).order('month', { ascending: false }).limit(24)
    payments = (data ?? []).map(p => ({ ...p, due_date: null }))
  }

  return NextResponse.json({
    lease,
    payments,
    requests: reqs.data ?? [],
    preavis: preavis.error ? null : preavis.data ?? null,
  })
}
