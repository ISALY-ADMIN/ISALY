import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { generateAndDeliverQuittance, type QuittanceLease } from '@/lib/documents/quittanceAuto'

export const runtime = 'nodejs'

/**
 * Mission 17 — génération manuelle d'une quittance par le bailleur
 * (utile si le loyer est payé en cours de mois, sans attendre le cron).
 * Body : { lease_id: string, month?: 'YYYY-MM' } — défaut : mois en cours.
 */
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { lease_id?: string; month?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }
  if (!body.lease_id) return NextResponse.json({ error: 'lease_id requis' }, { status: 400 })

  // Le demandeur doit être le bailleur du bail (vérifié via sa propre session RLS)
  const { data: lease } = await supabase
    .from('leases')
    .select('id, tenant_id, owner_id, address, city, monthly_rent, charges_amount')
    .eq('id', body.lease_id)
    .single()
  if (!lease) return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })
  if (lease.owner_id !== user.id) {
    return NextResponse.json({ error: 'Seul le bailleur peut générer la quittance' }, { status: 403 })
  }

  const monthDate = body.month && /^\d{4}-\d{2}$/.test(body.month)
    ? new Date(Number(body.month.slice(0, 4)), Number(body.month.slice(5, 7)) - 1, 1)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  // Service role : dépôt dans le coffre du locataire + notification cross-user
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const result = await generateAndDeliverQuittance(admin, lease as QuittanceLease, monthDate)
  if (result === 'error') return NextResponse.json({ error: 'Échec de la génération' }, { status: 500 })
  return NextResponse.json({ result })
}
