/**
 * Mise en avant réellement active d'une annonce (dashboard v2).
 *
 * Les mises en avant de 1, 3 ou 7 jours posent boost_tier et
 * boost_expires_at ; rien ne remet boost_tier à 'standard' à l'échéance.
 * Une date d'expiration dépassée vaut donc « pas de mise en avant ».
 */
export type BoostTier = 'standard' | 'featured' | 'priority'

export function activeBoostTier(l: { boost_tier?: unknown; boost_type?: unknown; boost_expires_at?: unknown }): BoostTier {
  const raw = (l.boost_tier ?? l.boost_type ?? 'standard') as string
  const tier: BoostTier = raw === 'priority' || raw === 'featured' ? raw : 'standard'
  if (tier === 'standard') return tier
  const exp = l.boost_expires_at as string | null | undefined
  if (exp && new Date(exp).getTime() <= Date.now()) return 'standard'
  return tier
}
