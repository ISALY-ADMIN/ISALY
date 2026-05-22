import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Stripe webhook error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createClient()

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object
      const { userId, planType } = paymentIntent.metadata

      if (userId && planType) {
        await supabase.from('payments').upsert({
          user_id: userId,
          stripe_payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount,
          plan_type: planType as 'assurance' | 'featured' | 'priority',
          status: 'succeeded',
        })
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object
      await supabase.from('payments').upsert({
        stripe_payment_intent_id: paymentIntent.id,
        status: 'failed',
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}
