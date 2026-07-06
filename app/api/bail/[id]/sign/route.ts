import { NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-auth'
import { resend, FROM_EMAIL, APP_URL } from '@/lib/resend'
import { bailSignatureRequestTemplate, bailActiveTemplate } from '@/lib/email-templates'
import type { Lease, LeaseSignature } from '@/types/database'

/**
 * Signature électronique simple (eIDAS) d'un bail par la partie connectée.
 * Ordre imposé : le loueur signe d'abord, puis le locataire.
 * Quand les deux ont signé → status 'active' + notifications + emails récapitulatifs.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { signature, consent } = await req.json().catch(() => ({})) as { signature?: string; consent?: boolean }
  if (!signature || !signature.startsWith('data:image/png')) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }
  if (!consent) {
    return NextResponse.json({ error: 'Vous devez accepter les termes du bail' }, { status: 400 })
  }

  const { data } = await supabase.from('leases').select('*').eq('id', params.id).maybeSingle()
  const lease = data as Lease | null
  if (!lease) return NextResponse.json({ error: 'Bail introuvable' }, { status: 404 })

  const isOwner = lease.owner_id === user.id
  const isTenant = lease.tenant_id === user.id
  if (!isOwner && !isTenant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (lease.status !== 'pending_signature' && lease.status !== 'draft') {
    return NextResponse.json({ error: 'Ce bail n’est plus en attente de signature' }, { status: 400 })
  }
  if (isOwner && lease.owner_signature) return NextResponse.json({ error: 'Vous avez déjà signé ce bail' }, { status: 400 })
  if (isTenant && lease.tenant_signature) return NextResponse.json({ error: 'Vous avez déjà signé ce bail' }, { status: 400 })
  if (isTenant && !lease.owner_signature) {
    return NextResponse.json({ error: 'Le loueur doit signer le bail en premier' }, { status: 400 })
  }

  const sig: LeaseSignature = {
    signed_at: new Date().toISOString(),
    signature_data: signature,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? null,
    consent: true,
  }

  const bothSigned = isTenant // le locataire signe toujours en dernier
  const update: Record<string, unknown> = isOwner ? { owner_signature: sig } : { tenant_signature: sig }
  if (bothSigned) update.status = 'active'
  else update.status = 'pending_signature'

  const { error } = await supabase.from('leases').update(update).eq('id', lease.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const link = `/app/bail/${lease.id}`
  const label = `${lease.address ?? 'Votre logement'} · ${lease.monthly_rent ?? 0} €/mois`
  const ids = [lease.owner_id, lease.tenant_id].filter(Boolean) as string[]
  const { data: profiles } = await supabase.from('profiles').select('id, email, first_name').in('id', ids)
  const owner = (profiles ?? []).find(p => p.id === lease.owner_id)
  const tenant = (profiles ?? []).find(p => p.id === lease.tenant_id)

  if (bothSigned) {
    // Bail actif → notifier les DEUX parties + email récapitulatif
    await supabase.from('notifications').insert(ids.map(uid => ({
      user_id: uid,
      type: 'bail',
      title: 'Bail signé par les deux parties 🎉',
      body: `${label} — le bail est maintenant actif.`,
      link,
      read: false,
    })))
    for (const p of [owner, tenant]) {
      if (!p?.email) continue
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: p.email as string,
          subject: 'Votre bail est signé et actif — ISALY',
          html: bailActiveTemplate((p.first_name as string) ?? '', lease.address ?? '', lease.monthly_rent ?? 0, `${APP_URL}${link}`),
        })
      } catch {}
    }
  } else if (isOwner && lease.tenant_id) {
    // Le loueur vient de signer → au tour du locataire
    await supabase.from('notifications').insert({
      user_id: lease.tenant_id,
      type: 'bail',
      title: 'Votre bail est prêt à signer ✍️',
      body: label,
      link,
      read: false,
    })
    if (tenant?.email) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: tenant.email as string,
          subject: 'Votre bail est prêt à signer — ISALY',
          html: bailSignatureRequestTemplate((tenant.first_name as string) ?? '', `${APP_URL}${link}`),
        })
      } catch {}
    }
  }

  return NextResponse.json({ ok: true, status: bothSigned ? 'active' : 'pending_signature' })
}
