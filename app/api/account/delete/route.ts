import { NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-auth'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function DELETE(request: Request) {
  const { supabase, user } = await createApiClient(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase.from('profiles').delete().eq('id', user.id)
  await admin.auth.admin.deleteUser(user.id)

  return NextResponse.json({ ok: true })
}
