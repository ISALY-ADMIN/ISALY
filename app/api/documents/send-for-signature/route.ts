import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { resend, FROM_EMAIL, APP_URL } from '@/lib/resend'
import { bailSignatureRequestTemplate } from '@/lib/email-templates'
import type { BailFormData } from '@/lib/bailPdf'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lease_id, tenant_id, bail_data, owner_signature } = await req.json().catch(() => ({})) as {
    lease_id?: string; tenant_id?: string; bail_data?: BailFormData; owner_signature?: string | null
  }
  if (!lease_id || !tenant_id || !bail_data) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data: lease } = await supabase.from('leases').select('owner_id').eq('id', lease_id).maybeSingle()
  if (!lease || lease.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: tenant } = await supabase.from('profiles').select('email, first_name').eq('id', tenant_id).maybeSingle()
  if (!tenant?.email) return NextResponse.json({ error: 'Tenant email not found' }, { status: 404 })

  const token = randomUUID()

  const { data: doc, error } = await supabase
    .from('lease_documents')
    .insert({
      lease_id,
      uploaded_by: user.id,
      document_type: 'bail_genere',
      file_name: 'Contrat de bail',
      status: 'pending_signature',
      token,
      bail_data,
      owner_signature: owner_signature ?? null,
      owner_signed_at: owner_signature ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const signUrl = `${APP_URL}/bail/${token}`

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: tenant.email,
      subject: 'Votre bail est prêt à signer — ISALY',
      html: bailSignatureRequestTemplate(tenant.first_name ?? '', signUrl),
    })
  } catch {}

  return NextResponse.json({ success: true, token, documentId: doc.id })
}
