import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/lib/webpush'

export async function POST(req: Request) {
  const supabase = createClient()
  const { user_id, title, body, url } = await req.json()

  const { data } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', user_id)
    .single()

  if (!data?.subscription) return NextResponse.json({ ok: false })

  const sub = JSON.parse(data.subscription)
  await sendPushNotification(sub, { title, body, url })

  return NextResponse.json({ ok: true })
}
