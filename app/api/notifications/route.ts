import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  return NextResponse.json({ notifications: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { user_id, type, title, body, link } = await req.json()
  if (!user_id || !title) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  await supabase.from('notifications').insert({ user_id, type, title, body, link, read: false })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (id === 'all') {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id)
  } else {
    await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', user.id)
  }
  return NextResponse.json({ ok: true })
}
