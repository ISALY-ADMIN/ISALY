import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subscription = await req.json()

  await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    subscription: JSON.stringify(subscription),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  return NextResponse.json({ ok: true })
}
