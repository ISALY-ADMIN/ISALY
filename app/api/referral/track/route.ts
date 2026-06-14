import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  // Verify the caller is authenticated
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let ref: string
  try {
    ;({ ref } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!ref || typeof ref !== 'string') {
    return NextResponse.json({ error: 'Missing ref' }, { status: 400 })
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Check the user hasn't already been referred
  const { data: userProfile } = await service
    .from('profiles')
    .select('referred_by')
    .eq('id', user.id)
    .single()

  if (userProfile?.referred_by) {
    return NextResponse.json({ success: true, skipped: true })
  }

  // Find the referrer by code (must not be self-referral)
  const { data: referrer } = await service
    .from('profiles')
    .select('id, referral_count')
    .eq('referral_code', ref.toUpperCase())
    .neq('id', user.id)
    .single()

  if (!referrer) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
  }

  // Mark this user as referred
  await service
    .from('profiles')
    .update({ referred_by: ref.toUpperCase() })
    .eq('id', user.id)

  // Increment referrer's count
  await service
    .from('profiles')
    .update({ referral_count: (referrer.referral_count ?? 0) + 1 })
    .eq('id', referrer.id)

  return NextResponse.json({ success: true })
}
