import { NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-auth'

/**
 * PATCH : enregistre une vue de profil.
 * Rate-limit naturel : UNIQUE(viewer_id, viewed_id, viewed_on) → 1 vue
 * par utilisateur, par profil, par jour. L'incrément du compteur passe
 * par la fonction SECURITY DEFINER increment_profile_views.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.id === params.id) return NextResponse.json({ ok: true, self: true })

  const { error } = await supabase
    .from('profile_views')
    .insert({ viewer_id: user.id, viewed_id: params.id })

  // 23505 = doublon (déjà vu aujourd'hui) → pas d'incrément
  if (error) {
    if (error.code === '23505') return NextResponse.json({ ok: true, counted: false })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.rpc('increment_profile_views', { target_id: params.id })
  return NextResponse.json({ ok: true, counted: true })
}
