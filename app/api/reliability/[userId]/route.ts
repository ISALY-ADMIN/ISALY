import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { computeReliabilityScore } from '@/lib/reliabilityScore'

export const runtime = 'nodejs'

/**
 * Score de fiabilité d'un loueur.
 * Service client : le calcul lit les messages du loueur, hors du périmètre
 * RLS du demandeur. Réponse cachée 1h (CDN) — le score bouge lentement.
 */
export async function GET(req: Request, { params }: { params: { userId: string } }) {
  // Auth requise (pas de scraping anonyme)
  const authClient = createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const result = await computeReliabilityScore(supabase, params.userId)
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, max-age=3600' },
  })
}
