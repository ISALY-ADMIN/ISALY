import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET — récupère un signalement + son bail + les identités des parties.
 * Retourne 404 si l'user n'est ni tenant ni owner (RLS bloquerait de toute façon).
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: request, error: reqErr } = await supabase
    .from('maintenance_requests')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  if (reqErr) console.error('[GET /api/maintenance/[id]] request error:', reqErr)
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: lease } = await supabase
    .from('leases')
    .select('id, owner_id, tenant_id, address, city')
    .eq('id', request.lease_id)
    .maybeSingle()

  const isOwner = lease?.owner_id === user.id
  const isTenant = request.tenant_id === user.id
  if (!isOwner && !isTenant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const partyIds = [lease?.owner_id, lease?.tenant_id].filter(Boolean) as string[]
  const { data: profiles } = partyIds.length > 0
    ? await supabase.from('profiles').select('id, first_name, last_name, avatar_url').in('id', partyIds)
    : { data: [] as { id: string; first_name: string | null; last_name: string | null; avatar_url: string | null }[] }

  const owner = (profiles ?? []).find(p => p.id === lease?.owner_id) ?? null
  const tenant = (profiles ?? []).find(p => p.id === lease?.tenant_id) ?? null

  return NextResponse.json({ request, lease, owner, tenant, viewerRole: isOwner ? 'owner' : 'tenant' })
}

/**
 * PATCH — loueur uniquement.
 * Notifie le locataire à chaque changement significatif :
 *  - status change (déjà en place)
 *  - nouveau ou modification du bailleur_comment
 *  - ajout ou changement de la photo de résolution
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    status?: 'sent' | 'received' | 'in_progress' | 'resolved'
    bailleur_comment?: string
    resolved_photo_url?: string | null
  }

  const { data: request } = await supabase
    .from('maintenance_requests')
    .select('id, lease_id, tenant_id, title, status, bailleur_comment, resolved_photo_url')
    .eq('id', params.id)
    .maybeSingle()
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

  // Notifications locataire — signal chaque événement distinct côté propriétaire
  if (request.tenant_id) {
    const notifs: { user_id: string; type: string; title: string; body: string; link: string; read: boolean }[] = []
    const link = `/app/signalement/${params.id}`

    if (body.status && body.status !== request.status) {
      const STATUS_LABEL: Record<string, string> = {
        sent: 'Ouvert', received: 'Reçu', in_progress: 'En cours', resolved: 'Résolu ✅',
      }
      notifs.push({
        user_id: request.tenant_id, type: 'maintenance',
        title: 'Signalement mis à jour',
        body: `${request.title} · ${STATUS_LABEL[body.status] ?? body.status}`,
        link, read: false,
      })
    }
    if (
      body.bailleur_comment !== undefined &&
      body.bailleur_comment.trim().length > 0 &&
      body.bailleur_comment !== (request.bailleur_comment ?? '')
    ) {
      notifs.push({
        user_id: request.tenant_id, type: 'maintenance',
        title: 'Votre propriétaire a répondu',
        body: `${request.title}`,
        link, read: false,
      })
    }
    if (
      body.resolved_photo_url !== undefined &&
      body.resolved_photo_url &&
      body.resolved_photo_url !== (request.resolved_photo_url ?? '')
    ) {
      notifs.push({
        user_id: request.tenant_id, type: 'maintenance',
        title: 'Photo de résolution ajoutée',
        body: `${request.title}`,
        link, read: false,
      })
    }

    if (notifs.length > 0) {
      const { error: notifErr } = await supabase.from('notifications').insert(notifs)
      if (notifErr) console.error('[PATCH /api/maintenance/[id]] notifications error:', notifErr)
    }
  }

  return NextResponse.json({ request: data })
}
