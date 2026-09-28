import type { ReactNode } from 'react'
import { SiteRoot } from './SiteRoot'
import { PublicHeader } from './PublicHeader'
import { PublicFooter } from './PublicFooter'

/** Mise en page des pages publiques : en-tête, contenu, pied de page (pub() de la maquette). */
export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <SiteRoot>
      <div className="pub">
        <PublicHeader />
        <main id="contenu" tabIndex={-1}>{children}</main>
        <PublicFooter />
      </div>
    </SiteRoot>
  )
}
