import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { resend, FROM_EMAIL } from '@/lib/resend'
import { identityVerifiedTemplate } from '@/lib/email-templates'

/** Client de service : le webhook n'a pas de session utilisateur (RLS). */
function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

/**
 * Dashboard v2 : statut de l'abonnement autogestion sur le profil du bailleur.
 * Colonnes absentes (migration 42 non exécutée) : on journalise sans échouer.
 */
async function writeAutogestion(
  sub: { id: string; status: string; current_period_end: number; metadata?: Record<string, string> | null },
  fallbackUserId?: string | null,
) {
  const admin = serviceClient()
  const patch = {
    autogestion_status: sub.status,
    autogestion_subscription_id: sub.id,
    autogestion_period_end: new Date(sub.current_period_end * 1000).toISOString(),
  }
  const userId = sub.metadata?.user_id || fallbackUserId
  const q = userId
    ? admin.from('profiles').update(patch).eq('id', userId)
    : admin.from('profiles').update(patch).eq('autogestion_subscription_id', sub.id)
  const { error } = await q
  if (error) console.error('[webhook] abonnement autogestion non enregistré', error.code, error.message)
}

/** Normalise un nom pour comparaison (accents, casse, espaces). */
function normName(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

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
      const session = event.data.object as {
        metadata?: Record<string, string>
        subscription?: string
      }

      // ── Swiper+ ──────────────────────────────────────────────
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

      // ── Dashboard v2 : mise en avant de 1, 3 ou 7 jours (paiement unique) ──
      if (session.metadata?.plan === 'listing_boost_days' && session.metadata.listing_id) {
        const days = Math.max(1, Math.min(7, Number(session.metadata.days) || 1))
        const admin = serviceClient()
        const { data: current } = await admin
          .from('listings')
          .select('boost_expires_at, boost_tier')
          .eq('id', session.metadata.listing_id)
          .maybeSingle()
        // Une mise en avant encore en cours est prolongée, pas écrasée.
        const base = current?.boost_expires_at && new Date(current.boost_expires_at as string).getTime() > Date.now()
          ? new Date(current.boost_expires_at as string)
          : new Date()
        const expires = new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
        const { error } = await admin.from('listings').update({
          boost_tier: 'featured',
          boost_expires_at: expires.toISOString(),
        }).eq('id', session.metadata.listing_id)
        if (error) console.error('[webhook] mise en avant', error)
      }

      // ── Dashboard v2 : abonnement autogestion du bailleur ────────
      if (session.metadata?.plan === 'autogestion' && session.subscription) {
        try {
          const sub = await stripe.subscriptions.retrieve(session.subscription)
          await writeAutogestion(sub as unknown as Parameters<typeof writeAutogestion>[0], session.metadata.user_id)
        } catch (err) {
          console.error('[webhook] lecture de l’abonnement autogestion', err)
        }
      }

      // ── Listing boost ─────────────────────────────────────────
      if (session.metadata?.plan === 'listing_boost' && session.metadata.listing_id) {
        const listingId = session.metadata.listing_id
        const boostTier = session.metadata.boost_tier ?? 'featured'

        let boostExpiresAt = new Date()
        boostExpiresAt.setDate(boostExpiresAt.getDate() + 30)
        let subscriptionId: string | null = session.subscription ?? null

        if (subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId)
            boostExpiresAt = new Date(sub.current_period_end * 1000)
          } catch {}
        }

        await supabase.from('listings').update({
          is_active:                    true,
          boost_tier:                   boostTier,
          boost_expires_at:             boostExpiresAt.toISOString(),
          boost_stripe_subscription_id: subscriptionId,
        }).eq('id', listingId)

        try {
          await supabase.from('admin_actions').insert({
            action:       'listing_boost_activated',
            target_type:  'listing',
            target_id:    listingId,
            details:      { boost_tier: boostTier, boost_expires_at: boostExpiresAt.toISOString() },
          })
        } catch {}

        // Notification in-app au loueur
        try {
          const { data: listing } = await supabase
            .from('listings')
            .select('title, city, owner_id')
            .eq('id', listingId)
            .single()
          if (listing?.owner_id) {
            const label = listing.title || (listing.city ? `annonce à ${listing.city}` : 'votre annonce')
            const tierLabel = boostTier === 'priority' ? 'Prioritaire' : 'Essentiel'
            await supabase.from('notifications').insert({
              user_id: listing.owner_id,
              type:    'boost',
              title:   `Votre annonce est maintenant boostée`,
              body:    `${label} bénéficie désormais du boost ${tierLabel}.`,
              link:    '/app/mes-annonces',
              read:    false,
            })
          }
        } catch {}
      }

      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as { subscription?: string }
      if (invoice.subscription) {
        try {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription)
          const userId = subscription.metadata?.user_id

          // Renouvellement Swiper+
          if (subscription.metadata?.plan === 'swiper_plus' && userId) {
            await supabase.from('profiles').update({
              swiper_plus_active:     true,
              swiper_plus_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
            }).eq('id', userId)
          }

          // Renouvellement listing boost
          if (subscription.metadata?.plan === 'listing_boost' && subscription.metadata.listing_id) {
            await supabase.from('listings').update({
              boost_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
            }).eq('id', subscription.metadata.listing_id)
          }
        } catch {}
      }
      break
    }

    // ── Dashboard v2 : suivi de l'abonnement autogestion ──────────
    case 'customer.subscription.updated': {
      const sub = event.data.object as unknown as Parameters<typeof writeAutogestion>[0]
      if (sub.metadata?.plan === 'autogestion') await writeAutogestion(sub)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as { metadata?: Record<string, string> }

      // Fin de l'abonnement autogestion : les logements passent en lecture seule.
      if (subscription.metadata?.plan === 'autogestion') {
        await writeAutogestion(event.data.object as unknown as Parameters<typeof writeAutogestion>[0])
      }

      // Annulation Swiper+
      if (subscription.metadata?.plan === 'swiper_plus' && subscription.metadata.user_id) {
        await supabase.from('profiles').update({
          swiper_plus_active: false,
        }).eq('id', subscription.metadata.user_id)
      }

      // Annulation listing boost
      if (subscription.metadata?.plan === 'listing_boost' && subscription.metadata.listing_id) {
        await supabase.from('listings').update({
          boost_tier:                   'standard',
          boost_expires_at:             null,
          boost_stripe_subscription_id: null,
        }).eq('id', subscription.metadata.listing_id)
      }

      break
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object
      const { userId, planType } = paymentIntent.metadata

      if (userId && planType) {
        await supabase.from('payments').upsert({
          user_id:                   userId,
          stripe_payment_intent_id:  paymentIntent.id,
          amount:                    paymentIntent.amount,
          plan_type:                 planType as 'assurance' | 'featured' | 'priority',
          status:                    'succeeded',
        })
      }
      break
    }

    // ── Mission 14 : vérification d'identité Stripe Identity ──
    case 'identity.verification_session.verified': {
      const session = event.data.object as Stripe.Identity.VerificationSession
      const userId = session.metadata?.user_id
      if (!userId) break

      // Service role : le webhook n'a pas de session utilisateur (RLS)
      const admin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      )

      // Données vérifiées par Stripe (nom + prénom du document)
      let verifiedFirst = ''
      let verifiedLast = ''
      try {
        const full = await stripe.identity.verificationSessions.retrieve(session.id, {
          expand: ['verified_outputs'],
        })
        verifiedFirst = full.verified_outputs?.first_name ?? ''
        verifiedLast = full.verified_outputs?.last_name ?? ''
      } catch (err) {
        console.error('Stripe Identity retrieve error:', err)
      }

      const { data: profile } = await admin
        .from('profiles')
        .select('first_name, last_name, email, cert_level')
        .eq('id', userId)
        .single()
      if (!profile) break

      const nameMatch =
        normName(profile.first_name) === normName(verifiedFirst) &&
        normName(profile.last_name) === normName(verifiedLast)

      if (!nameMatch) {
        await admin.from('notifications').insert({
          user_id: userId,
          type: 'system',
          title: 'Vérification échouée',
          body: 'Le nom du document ne correspond pas à votre profil. Vérifiez vos prénom et nom, puis réessayez.',
          link: '/app/profil',
        })
        break
      }

      await admin.from('user_documents').upsert({
        user_id: userId,
        type: 'identity',
        file_url: session.id,
        storage_path: session.id,
        status: 'verified',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,type' })

      if ((profile.cert_level ?? 0) < 2) {
        await admin.from('profiles').update({ cert_level: 2 }).eq('id', userId)
      }

      await admin.from('notifications').insert({
        user_id: userId,
        type: 'system',
        title: 'Votre identité a été vérifiée ✓',
        body: 'Votre badge « Identité vérifiée » est maintenant visible sur votre profil.',
        link: '/app/profil',
      })

      if (profile.email) {
        try {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: profile.email,
            subject: 'Votre identité est vérifiée ✓ — ISALY',
            html: identityVerifiedTemplate(profile.first_name ?? ''),
          })
        } catch (err) {
          console.error('Resend identity email error:', err)
        }
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object
      await supabase.from('payments').upsert({
        stripe_payment_intent_id: paymentIntent.id,
        status:                   'failed',
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}
