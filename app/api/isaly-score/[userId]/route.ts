import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { fetchIsalyScore } from '@/lib/isalyScore'

export const runtime = 'nodejs'

/**
 * ISALY Score d'un utilisateur. Service client : le taux de réponse lit
 * des messages hors du périmètre RLS du demandeur. Cache privé 1h.
 */
export async function GET(req: Request, { params }: { params: { userId: string } }) {
  const authClient = createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const result = await fetchIsalyScore(supabase, params.userId)
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=3600' },
  })
}
