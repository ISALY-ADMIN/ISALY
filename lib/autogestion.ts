import type { SupabaseClient } from '@supabase/supabase-js'
import { isMissingSchema } from '@/lib/schemaFallback'

/**
 * Abonnement autogestion du bailleur et parcours du logement (dashboard v2).
 *
 * Parcours d'un logement : 'autogestion' (géré avec ISALY), 'delegue'
 * (confié à une agence partenaire) ou null (pas encore choisi).
 *
 * Tant que STRIPE_PRICE_AUTOGESTION n'est pas défini, aucun verrouillage :
 * tout le monde est considéré comme abonné (période de transition).
 */
export type ManagementMode = 'autogestion' | 'delegue' | null

export interface AutogestionState {
  /** L'abonnement est-il exigé (prix Stripe configuré) ? */
  required: boolean
  /** Le bailleur peut-il gérer ses logements en autogestion ? */
  active: boolean
  status: string | null
  periodEnd: string | null
  subscriptionId: string | null
}

export function autogestionRequired(): boolean {
  return !!process.env.STRIPE_PRICE_AUTOGESTION
}

export function isAutogestionStatusActive(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing'
}

export async function getAutogestionState(supabase: SupabaseClient, userId: string): Promise<AutogestionState> {
  const required = autogestionRequired()
  const { data, error } = await supabase
    .from('profiles')
    .select('autogestion_status, autogestion_period_end, autogestion_subscription_id')
    .eq('id', userId)
    .maybeSingle()
  if (error && !isMissingSchema(error)) {
    console.error('[autogestion] lecture du statut', error)
  }
  const row = (error ? null : data) as {
    autogestion_status?: string | null
    autogestion_period_end?: string | null
    autogestion_subscription_id?: string | null
  } | null
  const status = row?.autogestion_status ?? null
  return {
    required,
    active: !required || isAutogestionStatusActive(status),
    status,
    periodEnd: row?.autogestion_period_end ?? null,
    subscriptionId: row?.autogestion_subscription_id ?? null,
  }
}
