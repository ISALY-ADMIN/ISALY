import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicLayout } from '@/components/ui-v2/public'
import { HouseOutline } from '@/components/ui-v2/public/HouseOutline'

export const metadata: Metadata = {
  title: 'Page introuvable',
  robots: { index: false },
}

/** Page introuvable (vE404 de la maquette). */
export default function NotFound() {
  return (
    <PublicLayout>
      <div className="err">
        <div className="in">
          <HouseOutline missing />
          <div className="ecode grad-text">404</div>
          <h1>Cette page a déménagé</h1>
          <p>Elle n’existe pas ou plus. Pas de panique, ta future coloc est toujours là.</p>
          <div className="acts" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-main" href="/">Retour à l’accueil</Link>
            <a className="btn btn-glass" href="/#annonces">Voir les annonces</a>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
