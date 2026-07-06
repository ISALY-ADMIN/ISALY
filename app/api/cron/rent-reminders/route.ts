import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Rappel automatique d'échéance de loyer (J-3) — notification in-app au locataire.
 * Échéance = due_date du paiement, sinon le 5 du mois concerné.
 */
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const target = new Date()
  target.setDate(target.getDate() + 3)
  const targetKey = target.toISOString().slice(0, 10)

  const { data: payments } = await supabase
    .from('rent_payments')
    .select('id, tenant_id, amount, month, due_date, status')
    .in('status', ['pending', 'late'])

  let sent = 0
  for (const p of payments ?? []) {
    if (!p.tenant_id) continue
    const due = (p.due_date as string | null)
      ?? new Date(new Date(p.month as string).getFullYear(), new Date(p.month as string).getMonth(), 5).toISOString()
    if (due.slice(0, 10) !== targetKey) continue

    const monthLabel = new Date(p.month as string).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    const body = `Loyer de ${monthLabel} (${p.amount} €) — échéance dans 3 jours.`

    // Idempotence : une seule notification J-3 par paiement
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', p.tenant_id)
      .eq('type', 'rent_reminder')
      .eq('body', body)
    if ((count ?? 0) > 0) continue

    await supabase.from('notifications').insert({
      user_id: p.tenant_id,
      type: 'rent_reminder',
      title: 'Échéance de loyer dans 3 jours 📅',
      body,
      link: '/app/loyers',
      read: false,
    })
    sent++
  }

  return NextResponse.json({ ok: true, sent })
}
