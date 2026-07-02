import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await supabase.from('profiles').delete().eq('id', user.id)
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
