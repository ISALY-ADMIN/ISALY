import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { checkoutReady, priceId } from '@/lib/stripePrices'

export const dynamic = 'force-dynamic'

/**
 * Abonnement autogestion du bailleur : Stripe Checkout en mode subscription,
 * prix STRIPE_PRICE_AUTOGESTION, metadata user_id (lue par le webhook).
 * Le portail de facturation reste /api/stripe/portal.
 */
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const price = priceId('autogestion')
  if (!checkoutReady(price)) {
    return NextResponse.json(
      { error: 'L’abonnement autogestion sera bientôt disponible.', code: 'price_missing' },
      { status: 503 },
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://isaly.fr'
  const meta = { user_id: user.id, plan: 'autogestion' }
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: user.email,
    metadata: meta,
    subscription_data: { metadata: meta },
    line_items: [{ price, quantity: 1 }],
    // Site v2 : pages de retour pilotées par le session_id. [HIDDEN] anciennes URL :
    // success_url: `${baseUrl}/app/paiement?abonnement=ok`,
    // cancel_url: `${baseUrl}/app/paiement?abonnement=annule`,
    success_url: `${baseUrl}/paiement/retour?type=auto&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/paiement/annule?type=auto`,
  })
  return NextResponse.json({ url: session.url })
}
