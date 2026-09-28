import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { BILLING_ENABLED, BILLING_DISABLED_MESSAGE } from '@/lib/billing'
import { BOOST_DAYS, boostPriceId, checkoutReady, type BoostDays } from '@/lib/stripePrices'
import { guardListingWrite } from '@/lib/managementMode'

/**
 * Mise en avant d'une annonce pendant 1, 3 ou 7 jours : paiement unique
 * (Stripe Checkout en mode payment), prix STRIPE_PRICE_BOOST_1D, _3D ou _7D.
 * Le webhook pose boost_tier et boost_expires_at = maintenant + durée.
 * Prix absent : 503 clair, l'interface affiche « Bientôt disponible ».
 */
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { listing_id?: string; days?: number } | null
  const listingId = body?.listing_id
  const days = Number(body?.days) as BoostDays
  if (!listingId || !(BOOST_DAYS as readonly number[]).includes(days)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  const price = boostPriceId(days)
  if (!checkoutReady(price)) {
    return NextResponse.json(
      { error: 'La mise en avant sera bientôt disponible.', code: 'price_missing' },
      { status: 503 },
    )
  }

  const { data: listing } = await supabase
    .from('listings')
    .select('id, owner_id')
    .eq('id', listingId)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!listing) return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 })

  const blocked = await guardListingWrite(supabase, user.id, listing.id)
  if (blocked) return blocked

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://isaly.fr'
  const meta = { user_id: user.id, plan: 'listing_boost_days', listing_id: listing.id, days: String(days) }
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    metadata: meta,
    payment_intent_data: { metadata: meta },
    line_items: [{ price, quantity: 1 }],
    success_url: `${baseUrl}/app/mes-annonces?mise_en_avant=ok`,
    cancel_url: `${baseUrl}/app/mes-annonces?mise_en_avant=annulee`,
  })
  return NextResponse.json({ url: session.url })
}


/**
 * [HIDDEN] Anciennes offres mensuelles « Mis en avant » et « Prioritaire »
 * (abonnement Stripe), remplacées par les mises en avant de 1, 3 ou 7 jours
 * (dashboard v2). Conservées telles quelles, plus appelées.
 */
async function legacyMonthlyBoostCheckout(request: Request) {
  // Cf. lib/billing.ts : sans webhook, l'annonce resterait invisible après paiement.
  if (!BILLING_ENABLED) {
    return NextResponse.json({ error: BILLING_DISABLED_MESSAGE }, { status: 503 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let listing_id: string, boost_tier: string
  try {
    ;({ listing_id, boost_tier } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!listing_id || !['featured', 'priority'].includes(boost_tier)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  // Verify ownership
  const { data: listing } = await supabase
    .from('listings')
    .select('id, owner_id')
    .eq('id', listing_id)
    .eq('owner_id', user.id)
    .single()

  if (!listing) return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://isaly.fr'
  const priceId = boost_tier === 'featured'
    ? process.env.STRIPE_PRICE_BOOST_FEATURED
    : process.env.STRIPE_PRICE_BOOST_PRIORITY

  const sessionMeta = {
    user_id:    user.id,
    plan:       'listing_boost',
    listing_id,
    boost_tier,
  }

  if (priceId) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email,
      metadata: sessionMeta,
      subscription_data: { metadata: sessionMeta },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/app/mes-annonces?boost_success=true`,
      cancel_url:  `${baseUrl}/app/annonce?edit=${listing_id}&boost_cancelled=true`,
    })
    return NextResponse.json({ url: session.url })
  }

  // Fallback: price_data dynamique (si Price ID non configuré)
  const fallbackPlans = {
    featured: { price: 999,  name: 'ISALY Boost — Mis en avant' },
    priority: { price: 2499, name: 'ISALY Boost — Prioritaire' },
  } as const

  const plan = fallbackPlans[boost_tier as 'featured' | 'priority']
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: user.email,
    metadata: sessionMeta,
    subscription_data: { metadata: sessionMeta },
    line_items: [{
      price_data: {
        currency: 'eur',
        unit_amount: plan.price,
        recurring: { interval: 'month' },
        product_data: { name: plan.name },
      },
      quantity: 1,
    }],
    success_url: `${baseUrl}/app/mes-annonces?boost_success=true`,
    cancel_url:  `${baseUrl}/app/annonce?edit=${listing_id}&boost_cancelled=true`,
  })

  return NextResponse.json({ url: session.url })
}
