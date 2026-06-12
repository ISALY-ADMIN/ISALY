import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()

  // Verify caller is admin
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

  let userId: string, suspend: boolean
  try {
    ;({ userId, suspend } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!userId || typeof suspend !== 'boolean') {
    return NextResponse.json({ error: 'Missing userId or suspend' }, { status: 400 })
  }

  // Prevent admin from suspending themselves or other admins
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()

  if (targetProfile?.is_admin) {
    return NextResponse.json({ error: 'Cannot suspend an admin account' }, { status: 403 })
  }

  // Update suspended flag
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ suspended: suspend })
    .eq('id', userId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Log admin action
  await supabase.from('admin_actions').insert({
    admin_id: user.id,
    action: suspend ? 'suspend_user' : 'unsuspend_user',
    target_type: 'profile',
    target_id: userId,
    details: { suspend },
  })

  return NextResponse.json({ success: true })
}
