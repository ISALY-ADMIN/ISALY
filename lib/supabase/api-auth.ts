import { createClient as createBearerClient } from '@supabase/supabase-js'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from './server'

/**
 * Client Supabase pour les routes API appelées à la fois par le site
 * (session en cookies) et par l'app mobile (header Authorization: Bearer).
 * Les requêtes DB passent sous l'identité de l'utilisateur (RLS) dans les deux cas.
 */
export async function createApiClient(
  request: Request
): Promise<{ supabase: SupabaseClient; user: User | null }> {
  const authHeader = request.headers.get('authorization')

  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const supabase = createBearerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    )
    const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7))
    return { supabase, user }
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}
