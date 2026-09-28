import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Limite quotidienne de swipes (offre gratuite) : 10 par jour, remise à zéro
 * à minuit heure de Paris. Swiper Plus lève la limite.
 */
export const FREE_DAILY_SWIPES = 10

export interface SwipeQuota {
  used: number
  limit: number
  remaining: number
  /** Swiper Plus actif : pas de limite. */
  plus: boolean
}

/** Minuit, heure de Paris, pour la date du jour, en ISO UTC. */
export function startOfParisDay(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '01'
  const ymd = `${get('year')}-${get('month')}-${get('day')}`
  // Décalage de Paris à cet instant (UTC+1 ou UTC+2).
  const tzName = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'shortOffset' })
    .formatToParts(now).find(p => p.type === 'timeZoneName')?.value ?? 'GMT+1'
  const m = tzName.match(/GMT([+-]\d+)/)
  const offset = m ? Number(m[1]) : 1
  const sign = offset >= 0 ? '+' : '-'
  return new Date(`${ymd}T00:00:00${sign}${String(Math.abs(offset)).padStart(2, '0')}:00`).toISOString()
}

/** Swiper Plus actif : drapeau posé par le webhook, et pas encore expiré. */
export function isSwiperPlusActive(profile: { swiper_plus_active?: boolean | null; swiper_plus_expires_at?: string | null } | null | undefined): boolean {
  if (!profile?.swiper_plus_active) return false
  if (!profile.swiper_plus_expires_at) return true
  return new Date(profile.swiper_plus_expires_at).getTime() > Date.now()
}

export async function getSwipeQuota(supabase: SupabaseClient, userId: string): Promise<SwipeQuota> {
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from('profiles').select('swiper_plus_active, swiper_plus_expires_at').eq('id', userId).maybeSingle(),
    supabase
      .from('swipes')
      .select('id', { count: 'exact', head: true })
      .eq('swiper_id', userId)
      .gte('created_at', startOfParisDay()),
  ])
  const plus = isSwiperPlusActive(profile as { swiper_plus_active?: boolean | null; swiper_plus_expires_at?: string | null } | null)
  const used = count ?? 0
  return {
    used,
    limit: FREE_DAILY_SWIPES,
    remaining: plus ? Number.POSITIVE_INFINITY : Math.max(0, FREE_DAILY_SWIPES - used),
    plus,
  }
}
