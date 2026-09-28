import type { ReactNode } from 'react'
import { bricolage } from '../font'
import { SvgDefs } from '../SvgDefs'
import { ToastProvider } from '../Toast'
// Composants de la charte v2 (communs avec l'espace connecté), puis styles
// propres aux pages du site, limités à .ui-site.
import '@/styles/ui-v2.css'
import '@/styles/ui-v2-app.css'
import '@/styles/ui-v2-site.css'

/**
 * Racine de toutes les pages du site v2 (hors landing et espace connecté) :
 * jetons .ui-v2, styles .ui-site, police Bricolage Grotesque, dégradés SVG et
 * messages flash. data-ui="v2" sert de témoin pour la vérification en production.
 */
export function SiteRoot({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`ui-v2 ui-site ${bricolage.variable}${className ? ` ${className}` : ''}`} data-ui="v2">
      <SvgDefs />
      <SiteSvgDefs />
      <ToastProvider>{children}</ToastProvider>
    </div>
  )
}

/** Dégradé pâle lgSoft de la maquette (illustrations des pages d'erreur). */
function SiteSvgDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="lgSoft" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6C4DFF" stopOpacity=".14" />
          <stop offset=".55" stopColor="#2F6BFF" stopOpacity=".14" />
          <stop offset="1" stopColor="#16C79A" stopOpacity=".14" />
        </linearGradient>
      </defs>
    </svg>
  )
}
