import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { generateAndDeliverQuittance, type QuittanceLease } from '@/lib/documents/quittanceAuto'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * Mission 17 — cron mensuel (1er du mois, 8h) : pour chaque bail actif dont le
 * loyer du mois précédent est payé, génère la quittance PDF, la dépose dans le
 * coffre-fort du locataire et du bailleur, envoie l'email + la notification.
 *
 * On quittance le MOIS PRÉCÉDENT : au 1er du mois, c'est la dernière période
 * complète dont le paiement peut être constaté.
 */
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Mois précédent (période quittancée)
  const now = new Date()
  const monthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-01`

  const { data: leases } = await admin
    .from('leases')
    .select('id, tenant_id, owner_id, address, city, monthly_rent, charges_amount')
    .eq('status', 'active')

  let created = 0
  let skipped = 0
  let unpaid = 0
  let errors = 0

  for (const lease of (leases ?? []) as QuittanceLease[]) {
    if (!lease.tenant_id || !lease.owner_id) continue

    const { data: payment } = await admin
      .from('rent_payments')
      .select('id')
      .eq('lease_id', lease.id)
      .eq('month', monthStr)
      .eq('status', 'paid')
      .limit(1)

    if (!payment || payment.length === 0) { unpaid++; continue }

    const result = await generateAndDeliverQuittance(admin, lease, monthDate)
    if (result === 'created') created++
    else if (result === 'skipped') skipped++
    else errors++
  }

  return NextResponse.json({ month: monthStr, created, skipped, unpaid, errors })
}
