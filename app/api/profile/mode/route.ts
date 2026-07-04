import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { mode } = body as { mode: unknown }

  if (mode !== 'locataire' && mode !== 'loueur') {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  await supabase
    .from('profiles')
    .update({ role: mode })
    .eq('id', user.id)

  return NextResponse.json({ success: true })
}
