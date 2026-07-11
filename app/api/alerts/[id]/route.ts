import { NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-auth'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { is_active?: boolean }
  if (typeof body.is_active !== 'boolean') {
    return NextResponse.json({ error: 'is_active required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('search_alerts')
    .update({ is_active: body.is_active })
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('search_alerts')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
