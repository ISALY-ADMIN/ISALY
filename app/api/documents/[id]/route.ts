import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: doc } = await supabase.from('lease_documents').select('*').eq('id', params.id).maybeSingle()
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: lease } = await supabase.from('leases').select('owner_id, tenant_id').eq('id', doc.lease_id).maybeSingle()
  const { data: roommate } = await supabase
    .from('lease_roommates')
    .select('profile_id')
    .eq('lease_id', doc.lease_id)
    .eq('profile_id', user.id)
    .maybeSingle()

  const allowed = lease && (lease.owner_id === user.id || lease.tenant_id === user.id || !!roommate)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!doc.file_url) return NextResponse.json({ error: 'No file' }, { status: 404 })

  const { data: signed, error } = await supabase.storage.from('documents-bailleur').createSignedUrl(doc.file_url, 3600)
  if (error || !signed) return NextResponse.json({ error: error?.message ?? 'Signed URL failed' }, { status: 500 })

  return NextResponse.json({ url: signed.signedUrl })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: doc } = await supabase.from('lease_documents').select('*').eq('id', params.id).maybeSingle()
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: lease } = await supabase.from('leases').select('owner_id').eq('id', doc.lease_id).maybeSingle()
  if (!lease || lease.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (doc.file_url) await supabase.storage.from('documents-bailleur').remove([doc.file_url])
  const { error } = await supabase.from('lease_documents').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
