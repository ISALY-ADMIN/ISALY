import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

const PLANS: Record<string, { price: number; name: string; interval: 'month' }> = {
  featured:  { price: 999,  name: 'ISALY Loueur Essentiel',  interval: 'month' },
  priority:  { price: 2499, name: 'ISALY Loueur Prioritaire', interval: 'month' },
  assurance: { price: 0,    name: 'ISALY Assurance Dossier',  interval: 'month' },
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan, listing_id, loyer } = await req.json()

  let unitAmount = PLANS[plan]?.price ?? 999
  if (plan === 'assurance' && loyer) {
    unitAmount = Math.round(loyer * 0.025 * 100)
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: user.email,
    metadata: { user_id: user.id, plan, listing_id: listing_id ?? '' },
    line_items: [{
      price_data: {
        currency: 'eur',
        unit_amount: unitAmount,
        recurring: { interval: 'month' },
        product_data: { name: PLANS[plan]?.name ?? 'ISALY Boost' },
      },
      quantity: 1,
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://isaly.fr'}/app/paiement?success=true`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://isaly.fr'}/app/paiement?cancelled=true`,
  })

  return NextResponse.json({ url: session.url })
}
