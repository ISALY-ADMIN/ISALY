import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { APP_URL } from '@/lib/resend'

/**
 * Mission 14 — crée une Stripe Identity VerificationSession et renvoie
 * l'URL du hosted flow. Le résultat revient par webhook
 * (identity.verification_session.verified).
 */
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('cert_level, first_name, last_name')
    .eq('id', user.id)
    .single()

  if ((profile?.cert_level ?? 0) >= 2) {
    return NextResponse.json({ error: 'Identité déjà vérifiée' }, { status: 400 })
  }
  if (!profile?.first_name || !profile?.last_name) {
    return NextResponse.json({ error: 'Renseignez d’abord votre prénom et nom dans le profil' }, { status: 400 })
  }

  try {
    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: { user_id: user.id },
      return_url: `${APP_URL}/app/profil?identity=pending`,
    })

    await supabase.from('profiles').update({ stripe_identity_session_id: session.id }).eq('id', user.id)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe Identity error:', err)
    // Fallback : le flow manuel d'upload CNI reste disponible dans le profil
    return NextResponse.json({ error: 'Stripe Identity indisponible', fallback: true }, { status: 503 })
  }
}
