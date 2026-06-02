import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabase.from('favorites').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  return NextResponse.json({ favorites: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { target_id, target_type } = await req.json()
  const { data: existing } = await supabase.from('favorites').select('id').eq('user_id', user.id).eq('target_id', target_id).single()
  if (existing) {
    await supabase.from('favorites').delete().eq('id', existing.id)
    return NextResponse.json({ saved: false })
  }
  await supabase.from('favorites').insert({ user_id: user.id, target_id, target_type })
  return NextResponse.json({ saved: true })
}
