import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resend, FROM_EMAIL } from '@/lib/resend'
import { rentReminderTemplate } from '@/lib/email-templates'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lease_id, tenant_id, month, amount } = await req.json().catch(() => ({})) as {
    lease_id?: string; tenant_id?: string; month?: string; amount?: number
  }
  if (!lease_id || !tenant_id || !month) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data: lease } = await supabase.from('leases').select('owner_id').eq('id', lease_id).maybeSingle()
  if (!lease || lease.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: tenant } = await supabase.from('profiles').select('email, first_name').eq('id', tenant_id).maybeSingle()
  if (!tenant?.email) return NextResponse.json({ error: 'Tenant email not found' }, { status: 404 })

  const monthLabel = new Date(month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: tenant.email,
      subject: `Rappel : votre loyer de ${monthLabel} est en attente`,
      html: rentReminderTemplate(tenant.first_name ?? '', monthLabel, amount ?? 0),
    })
  } catch (e) {
    return NextResponse.json({ error: 'Email send failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
