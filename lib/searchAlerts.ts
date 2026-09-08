import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Crée (une seule fois) l'alerte de recherche géographique associée à une
 * inscription venue de `/auth/register?ville=<slug>`.
 *
 * L'alerte est ensuite consommée par le cron `/api/cron/search-alerts`, qui
 * envoie la notification in-app + l'email dès qu'une annonce est publiée dans
 * cette ville.
 *
 * Idempotent : réappelée pour la même ville, elle ne duplique rien.
 */
export async function ensureCityAlert(
  supabase: SupabaseClient,
  userId: string,
  cityName: string
): Promise<{ created: boolean }> {
  const city = cityName.trim()
  if (!city) return { created: false }

  const { data: existing } = await supabase
    .from('search_alerts')
    .select('id')
    .eq('user_id', userId)
    .ilike('city', city)
    .limit(1)

  if (existing?.length) return { created: false }

  const { error } = await supabase.from('search_alerts').insert({
    user_id: userId,
    name: `Colocation à ${city}`,
    city,
    notify_email: true,
    notify_push: true,
    is_active: true,
  })

  return { created: !error }
}
