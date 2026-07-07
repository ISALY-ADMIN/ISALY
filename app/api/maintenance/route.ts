import { NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-auth'
import { resend, FROM_EMAIL, APP_URL } from '@/lib/resend'
import { maintenanceRequestTemplate } from '@/lib/email-templates'

/**
 * GET — signalements côté loueur.
 * Passe par la même auth serveur (cookies SSR ou Bearer mobile) que le POST,
 * ce qui élimine toute divergence de session entre l'écriture et la lecture.
 * Retourne { requests: [{ ...maintenance_requests, lease: {id, address, city, status} }] }
 * pour TOUS les baux dont le user est owner (tous statuts sauf 'draft').
 */
export async function GET(req: Request) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: leases, error: leaseErr } = await supabase
    .from('leases')
    .select('id, address, city, status')
    .eq('owner_id', user.id)
    .in('status', ['active', 'pending_signature', 'ended'])
    .order('created_at', { ascending: false })

  if (leaseErr) {
    console.error('[GET /api/maintenance] leases error:', leaseErr)
    return NextResponse.json({ error: leaseErr.message, requests: [], leases: [] }, { status: 500 })
  }

  const leaseRows = (leases ?? []) as { id: string; address: string | null; city: string | null; status: string }[]
  if (leaseRows.length === 0) {
    return NextResponse.json({ requests: [], leases: [] })
  }

  const leaseIds = leaseRows.map(l => l.id)
  const { data: requests, error: reqErr } = await supabase
    .from('maintenance_requests')
    .select('*')
    .in('lease_id', leaseIds)
    .order('created_at', { ascending: false })

  if (reqErr) {
    console.error('[GET /api/maintenance] requests error:', reqErr)
    return NextResponse.json({ error: reqErr.message, requests: [], leases: leaseRows }, { status: 500 })
  }

  console.log(`[GET /api/maintenance] user=${user.id} leases=${leaseRows.length} requests=${(requests ?? []).length}`)

  return NextResponse.json({ requests: requests ?? [], leases: leaseRows })
}

export async function POST(req: Request) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    category?: string
    title?: string
    description?: string
    urgency?: 'low' | 'normal' | 'urgent'
    photos?: string[]
  }
  if (!body.category || !body.title || !body.description) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }
  const urgency = ['low', 'normal', 'urgent'].includes(body.urgency ?? '') ? body.urgency! : 'normal'

  const { data: lease } = await supabase
    .from('leases')
    .select('id, owner_id')
    .eq('tenant_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (!lease) return NextResponse.json({ error: 'Aucun bail actif' }, { status: 400 })

  const photos = (body.photos ?? []).slice(0, 3)

  const { data: request, error } = await supabase
    .from('maintenance_requests')
    .insert({
      lease_id: lease.id,
      tenant_id: user.id,
      category: body.category,
      title: body.title,
      description: body.description,
      urgency,
      status: 'sent',
      photo_url: photos[0] ?? null,
      photos,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notification in-app au loueur
  const urgencyLabel = urgency === 'urgent' ? '🔴 Urgent' : urgency === 'low' ? 'Basse' : 'Moyenne'
  await supabase.from('notifications').insert({
    user_id: lease.owner_id,
    type: 'maintenance',
    title: 'Nouveau signalement',
    body: `${body.title} · ${urgencyLabel}`,
    link: '/app/maintenance',
    read: false,
  })

  const { data: owner } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', lease.owner_id)
    .maybeSingle()

  if (owner?.email) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: owner.email,
        subject: `Nouveau signalement : ${body.title}`,
        html: maintenanceRequestTemplate(body.title, body.category, body.description, `${APP_URL}/app/maintenance`),
      })
    } catch {}
  }

  return NextResponse.json({ request })
}
