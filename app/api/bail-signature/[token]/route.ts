import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const supabase = admin()
  const { data: doc } = await supabase
    .from('lease_documents')
    .select('id, status, bail_data, owner_signature, owner_signed_at, tenant_signed_at, created_at')
    .eq('token', params.token)
    .maybeSingle()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ document: doc })
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const supabase = admin()
  const { signature } = await req.json().catch(() => ({})) as { signature?: string }
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const { data: doc } = await supabase
    .from('lease_documents')
    .select('id, status')
    .eq('token', params.token)
    .maybeSingle()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (doc.status !== 'pending_signature') return NextResponse.json({ error: 'Already signed' }, { status: 400 })

  const { error } = await supabase
    .from('lease_documents')
    .update({ tenant_signature: signature, tenant_signed_at: new Date().toISOString(), status: 'signed' })
    .eq('id', doc.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
