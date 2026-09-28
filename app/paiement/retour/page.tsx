import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { Icon, eurCents, plural } from '@/components/ui-v2'
import { SiteRoot } from '@/components/ui-v2/public'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Paiement', robots: { index: false } }

type Kind = 'plus' | 'boost' | 'auto'

/** Offre d'après les métadonnées posées par les routes de checkout existantes. */
function kindOf(plan: string | undefined, fallback: string | undefined): Kind | null {
  if (plan === 'swiper_plus') return 'plus'
  if (plan === 'listing_boost_days') return 'boost'
  if (plan === 'autogestion') return 'auto'
  return fallback === 'plus' || fallback === 'boost' || fallback === 'auto' ? fallback : null
}

function longDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Retour de paiement Stripe (vPaiement de la maquette). Piloté par le
 * session_id de Checkout : la session est relue côté serveur, et n'est
 * affichée qu'à la personne qui l'a payée (metadata.user_id). Les montants
 * viennent de Stripe, jamais d'une valeur écrite dans le code.
 */
export default async function PaiementRetourPage({ searchParams }: { searchParams: { session_id?: string; type?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let session: Stripe.Checkout.Session | null = null
  if (searchParams.session_id) {
    try {
      session = await stripe.checkout.sessions.retrieve(searchParams.session_id, { expand: ['subscription'] })
    } catch {
      session = null
    }
  }
  // Une session d'un autre compte n'est jamais montrée.
  if (session && session.metadata?.user_id !== user.id) session = null

  const kind = kindOf(session?.metadata?.plan, searchParams.type)
  const paid = !!session && (session.payment_status === 'paid' || session.payment_status === 'no_payment_required')
  const sub = session && typeof session.subscription === 'object' ? (session.subscription as Stripe.Subscription | null) : null
  const amount = session?.amount_total != null ? eurCents(session.amount_total) : null

  let title = 'Paiement reçu'
  let text = 'Merci, ton paiement a bien été pris en compte.'
  let rows: [string, string][] = []
  let cta: [string, string] = ['Retour à mon espace', '/app/dashboard-home']

  if (kind === 'plus') {
    title = 'Swiper Plus est activé'
    text = 'Plus de limite quotidienne, et tes demandes passent en priorité chez les colocs.'
    rows = [['Offre', 'Swiper Plus']]
    if (amount) rows.push(['Montant', `${amount} par mois`])
    if (sub) rows.push(['Prochain prélèvement', longDate(sub.current_period_end)])
    cta = ['Continuer à swiper', '/app/swipe']
  } else if (kind === 'auto') {
    title = 'Autogestion activée'
    text = 'Tu gères tes logements avec ISALY : bail en ligne, loyers, quittances, maintenance et préavis.'
    rows = [['Offre', 'Abonnement autogestion']]
    if (amount) rows.push(['Montant', `${amount} par mois`])
    if (sub) rows.push(['Prochain prélèvement', longDate(sub.current_period_end)])
    cta = ['Ouvrir mon tableau de bord', '/app/dashboard-home']
  } else if (kind === 'boost') {
    title = 'Ton annonce est mise en avant'
    const days = Number(session?.metadata?.days) || 0
    text = days
      ? `Elle apparaît en priorité dans les swipes et la liste pendant ${days} ${plural(days, 'jour', 'jours')}.`
      : 'Elle apparaît en priorité dans les swipes et la liste.'
    const listingId = session?.metadata?.listing_id
    if (listingId) {
      const { data: listing } = await supabase.from('listings').select('title, neighborhood, city').eq('id', listingId).maybeSingle()
      const name = listing?.title || [listing?.neighborhood, listing?.city].filter(Boolean).join(', ')
      if (name) rows.push(['Annonce', name])
    }
    if (days && session) rows.push(['Durée', `${days} ${plural(days, 'jour', 'jours')}, jusqu’au ${longDate(session.created + days * 86400)}`])
    if (amount) rows.push(['Montant', amount])
    cta = ['Voir mes annonces', '/app/mes-annonces']
  }

  return (
    <SiteRoot>
      <main className="pay" id="contenu">
        <div className="pay-card">
          {paid || !session ? (
            <span className={paid ? 'okring' : 'okring off'}><Icon name={paid ? 'check' : 'clock'} /></span>
          ) : (
            <span className="okring off"><Icon name="clock" /></span>
          )}
          <h1>{paid ? title : 'Paiement en cours de validation'}</h1>
          <p>{paid ? text : 'Stripe n’a pas encore confirmé ce paiement. Ton offre s’active dès la confirmation.'}</p>
          {paid && rows.length > 0 && (
            <div className="kv recap panel" style={{ padding: '16px 18px' }}>
              {rows.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}
            </div>
          )}
          {paid && <p className="hint">Le reçu t’a été envoyé par e-mail.</p>}
          <Link className="btn btn-main" href={cta[1]}>{cta[0]}<Icon name="arrow" size={18} /></Link>
        </div>
      </main>
    </SiteRoot>
  )
}
