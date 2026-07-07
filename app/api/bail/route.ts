import { NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-auth'
import { resend, FROM_EMAIL, APP_URL } from '@/lib/resend'
import { bailSignatureRequestTemplate } from '@/lib/email-templates'
import type { LeaseSignature } from '@/types/database'

function clientIp(req: Request): string | null {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? null
}

/** Création d'un bail par le loueur → statut pending_signature (signature loueur optionnelle immédiate). */
export async function POST(req: Request) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    tenant_id?: string
    listing_id?: string | null
    address?: string
    city?: string | null
    rent?: number
    charges?: number | null
    deposit?: number | null
    start_date?: string
    end_date?: string | null
    house_rules?: string | null
    signature?: string | null
    consent?: boolean
  }

  if (!body.tenant_id || !body.address || !body.rent || !body.start_date) {
    return NextResponse.json({ error: 'Champs manquants (locataire, adresse, loyer, date de début)' }, { status: 400 })
  }
  if (body.tenant_id === user.id) {
    return NextResponse.json({ error: 'Le locataire doit être différent du loueur' }, { status: 400 })
  }

  const ownerSignature: LeaseSignature | null = body.signature && body.consent
    ? { signed_at: new Date().toISOString(), signature_data: body.signature, ip: clientIp(req), consent: true }
    : null

  const { data: lease, error } = await supabase
    .from('leases')
    .insert({
      owner_id: user.id,
      tenant_id: body.tenant_id,
      listing_id: body.listing_id ?? null,
      bail_data: (body as { bail_data?: Record<string, unknown> }).bail_data ?? null,
      address: body.address,
      city: body.city ?? null,
      monthly_rent: body.rent,
      charges_amount: body.charges ?? null,
      deposit_amount: body.deposit ?? null,
      start_date: body.start_date,
      end_date: body.end_date ?? null,
      house_rules: body.house_rules ?? null,
      owner_signature: ownerSignature,
      status: 'pending_signature',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifications in-app : bail créé (loueur) + à signer (locataire)
  await supabase.from('notifications').insert([
    {
      user_id: body.tenant_id,
      type: 'bail',
      title: ownerSignature ? 'Votre bail est prêt à signer ✍️' : 'Un bail a été créé pour vous',
      body: `${body.address} · ${body.rent} €/mois`,
      link: `/app/bail/${lease.id}`,
      read: false,
    },
    {
      user_id: user.id,
      type: 'bail',
      title: 'Bail créé — en attente de signature',
      body: `${body.address} · ${body.rent} €/mois`,
      link: `/app/bail/${lease.id}`,
      read: false,
    },
  ])

  // Email au locataire
  const { data: tenant } = await supabase.from('profiles').select('email, first_name').eq('id', body.tenant_id).maybeSingle()
  if (tenant?.email) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: tenant.email,
        subject: 'Votre bail est prêt à signer — ISALY',
        html: bailSignatureRequestTemplate(tenant.first_name ?? '', `${APP_URL}/app/bail/${lease.id}`),
      })
    } catch {}
  }

  return NextResponse.json({ id: lease.id })
}
