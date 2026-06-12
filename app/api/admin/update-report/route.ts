import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['open', 'reviewing', 'resolved', 'dismissed'] as const

export async function POST(request: Request) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!adminProfile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let reportId: string, status: string
  try {
    ;({ reportId, status } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = { status }
  if (status === 'resolved' || status === 'dismissed') {
    updateData.resolved_by = user.id
    updateData.resolved_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('reports')
    .update(updateData)
    .eq('id', reportId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('admin_actions').insert({
    admin_id: user.id,
    action: status === 'resolved' ? 'resolve_report' : status === 'dismissed' ? 'dismiss_report' : 'update_report',
    target_type: 'report',
    target_id: reportId,
    details: { status },
  })

  return NextResponse.json({ success: true })
}
