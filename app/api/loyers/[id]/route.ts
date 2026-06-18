import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { lease_id, tenant_id, month, amount } = body as {
    lease_id?: string; tenant_id?: string; month?: string; amount?: number
  }

  if (params.id === 'new') {
    if (!lease_id || !month || amount == null) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    const { data: lease } = await supabase.from('leases').select('owner_id').eq('id', lease_id).maybeSingle()
    if (!lease || lease.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('rent_payments')
      .insert({
        lease_id,
        tenant_id: tenant_id ?? null,
        amount,
        month,
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ payment: data })
  }

  const { data: payment } = await supabase
    .from('rent_payments')
    .select('id, lease_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: lease } = await supabase.from('leases').select('owner_id').eq('id', payment.lease_id).maybeSingle()
  if (!lease || lease.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('rent_payments')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ payment: data })
}
