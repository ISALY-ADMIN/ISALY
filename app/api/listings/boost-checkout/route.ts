import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { BILLING_ENABLED, BILLING_DISABLED_MESSAGE } from '@/lib/billing'

export async function POST(request: Request) {
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
