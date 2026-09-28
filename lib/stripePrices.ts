import 'server-only'
import { stripe } from '@/lib/stripe'

/**
 * Prix Stripe du dashboard v2 : uniquement des identifiants de prix lus dans
 * les variables d'environnement, aucun montant codé en dur. Les montants
 * affichés sont ceux de Stripe (price.unit_amount).
 */
export const PRICE_ENV = {
  autogestion: 'STRIPE_PRICE_AUTOGESTION',
  boost1: 'STRIPE_PRICE_BOOST_1D',
  boost3: 'STRIPE_PRICE_BOOST_3D',
  boost7: 'STRIPE_PRICE_BOOST_7D',
  swiperPlus: 'STRIPE_PRICE_SWIPER_PLUS',
} as const

export type PriceKey = keyof typeof PRICE_ENV

export const BOOST_DAYS = [1, 3, 7] as const
export type BoostDays = (typeof BOOST_DAYS)[number]

export function boostPriceId(days: BoostDays): string | undefined {
  return process.env[`STRIPE_PRICE_BOOST_${days}D`] || undefined
}

export function priceId(key: PriceKey): string | undefined {
  return process.env[PRICE_ENV[key]] || undefined
}

/**
 * Un paiement n'est proposé que si le prix existe ET que le webhook peut le
 * réconcilier (STRIPE_WEBHOOK_SECRET) : sans webhook, un client serait débité
 * sans que sa mise en avant ou son abonnement ne s'active (cf. lib/billing.ts).
 */
export function checkoutReady(id: string | undefined): id is string {
  return !!id && !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET
}

export interface PriceInfo {
  /** Montant en centimes, tel que défini dans Stripe. */
  amount: number | null
  currency: string | null
  interval: string | null
  /** Paiement possible (prix et webhook configurés). */
  available: boolean
}

const cache = new Map<string, { at: number; info: PriceInfo }>()

export async function readPrice(id: string | undefined): Promise<PriceInfo> {
  if (!id) return { amount: null, currency: null, interval: null, available: false }
  const hit = cache.get(id)
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.info
  try {
    const p = await stripe.prices.retrieve(id)
    const info: PriceInfo = {
      amount: p.unit_amount ?? null,
      currency: p.currency ?? null,
      interval: p.recurring?.interval ?? null,
      available: checkoutReady(id),
    }
    cache.set(id, { at: Date.now(), info })
    return info
  } catch (err) {
    console.error('[stripePrices] lecture du prix', err)
    return { amount: null, currency: null, interval: null, available: false }
  }
}
