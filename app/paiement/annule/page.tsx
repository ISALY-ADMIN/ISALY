import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/ui-v2'
import { SiteRoot } from '@/components/ui-v2/public'

export const metadata: Metadata = { title: 'Paiement annulé', robots: { index: false } }

/** Page d'origine de chaque offre, pour « Réessayer ». */
const RETRY: Record<string, string> = {
  plus: '/app/paiement',
  auto: '/app/paiement',
  boost: '/app/mes-annonces',
}

/** Paiement Stripe annulé (variante « cancel » de vPaiement). */
export default function PaiementAnnulePage({ searchParams }: { searchParams: { type?: string } }) {
  const retry = RETRY[searchParams.type ?? ''] ?? '/app/paiement'
  return (
    <SiteRoot>
      <main className="pay" id="contenu">
        <div className="pay-card">
          <span className="okring off"><Icon name="x" /></span>
          <h1>Paiement annulé</h1>
          <p>Aucun montant n’a été débité. Tu peux réessayer quand tu veux.</p>
          <div className="acts" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-main" href={retry}>Réessayer</Link>
            <Link className="btn btn-glass" href="/app/dashboard-home">Retour à mon espace</Link>
          </div>
        </div>
      </main>
    </SiteRoot>
  )
}
