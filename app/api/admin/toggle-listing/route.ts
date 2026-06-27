import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  // Auth check via regular client (subject to RLS — fine for reads)
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

  let listingId: string, active: boolean
  try {
    ;({ listingId, active } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!listingId || typeof active !== 'boolean') {
    return NextResponse.json({ error: 'Missing listingId or active' }, { status: 400 })
  }

  // Service role client bypasses RLS — required for admin to update any listing
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await adminClient
    .from('listings')
    .update({ is_active: active })
    .eq('id', listingId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await adminClient.from('admin_actions').insert({
    admin_id: user.id,
    action: active ? 'enable_listing' : 'disable_listing',
    target_type: 'listing',
    target_id: listingId,
    details: { active },
  })

  return NextResponse.json({ success: true })
}
