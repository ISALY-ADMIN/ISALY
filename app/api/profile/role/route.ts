import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Réponse à la question de rôle de l'onboarding.
 *
 * Distincte de /api/profile/mode (bascule de confort du compte à double vue) :
 * celle-ci horodate `role_confirmed_at`, ce qui lève définitivement la garde
 * bloquante posée sur /app/* pour les comptes qui n'ont jamais répondu.
 */
export async function POST(request: Request) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let role: unknown
  try {
    ;({ role } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (role !== 'locataire' && role !== 'loueur') {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role, role_confirmed_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, role })
}
