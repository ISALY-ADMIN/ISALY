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
    case 'checkout.session.completed': {
      const session = event.data.object as { metadata?: Record<string, string>; subscription?: string }
      if (session.metadata?.plan === 'swiper_plus' && session.metadata.user_id) {
        let expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + 1)
        if (session.subscription) {
          try {
            const subscription = await stripe.subscriptions.retrieve(session.subscription)
            expiresAt = new Date(subscription.current_period_end * 1000)
          } catch {}
        }
        await supabase.from('profiles').update({
          swiper_plus_active: true,
          swiper_plus_expires_at: expiresAt.toISOString(),
        }).eq('id', session.metadata.user_id)
      }
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as { subscription?: string }
      if (invoice.subscription) {
        try {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
          const userId = subscription.metadata?.user_id
          if (subscription.metadata?.plan === 'swiper_plus' && userId) {
            await supabase.from('profiles').update({
              swiper_plus_active: true,
              swiper_plus_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
            }).eq('id', userId)
          }
        } catch {}
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as { metadata?: Record<string, string> }
      if (subscription.metadata?.plan === 'swiper_plus' && subscription.metadata.user_id) {
        await supabase.from('profiles').update({
          swiper_plus_active: false,
        }).eq('id', subscription.metadata.user_id)
      }
      break
    }

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
