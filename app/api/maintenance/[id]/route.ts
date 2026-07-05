import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    status?: 'sent' | 'received' | 'in_progress' | 'resolved'
    bailleur_comment?: string
    resolved_photo_url?: string | null
  }

  const { data: request } = await supabase.from('maintenance_requests').select('id, lease_id, tenant_id, title, status').eq('id', params.id).maybeSingle()
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: lease } = await supabase.from('leases').select('owner_id').eq('id', request.lease_id).maybeSingle()
  if (!lease || lease.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const update: Record<string, unknown> = {}
  if (body.status) {
    update.status = body.status
    if (body.status === 'resolved') update.resolved_at = new Date().toISOString()
  }
  if (body.bailleur_comment !== undefined) update.bailleur_comment = body.bailleur_comment
  if (body.resolved_photo_url !== undefined) update.resolved_photo_url = body.resolved_photo_url

  const { data, error } = await supabase
    .from('maintenance_requests')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifier le locataire quand le statut change
  if (body.status && body.status !== request.status && request.tenant_id) {
    const STATUS_LABEL: Record<string, string> = {
      sent: 'Ouvert', received: 'Reçu', in_progress: 'En cours', resolved: 'Résolu ✅',
    }
    await supabase.from('notifications').insert({
      user_id: request.tenant_id,
      type: 'maintenance',
      title: 'Signalement mis à jour',
      body: `${request.title} · ${STATUS_LABEL[body.status] ?? body.status}`,
      link: '/app/declarer-probleme',
      read: false,
    })
  }

  return NextResponse.json({ request: data })
}
