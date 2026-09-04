import { NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-auth'
import { safeCityFromSlug } from '@/lib/cities'
import { ensureCityAlert } from '@/lib/searchAlerts'

/**
 * Crée l'alerte géographique d'un utilisateur qui vient de s'inscrire depuis
 * `/auth/register?ville=<slug>`. Appelée quand la session est immédiate
 * (confirmation email désactivée) ; sinon `/auth/callback` s'en charge.
 */
export async function POST(req: Request) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { ville?: string }
  const city = safeCityFromSlug(body.ville)
  if (!city) return NextResponse.json({ error: 'Ville invalide' }, { status: 400 })

  const { created } = await ensureCityAlert(supabase, user.id, city)
  return NextResponse.json({ ok: true, city, created })
}
