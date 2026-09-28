import type { ReactNode } from 'react'
import { bricolage } from '../font'
import '@/styles/ui-v2.css'
import '@/styles/ui-v2-app.css'
import '@/styles/ui-v2-site.css'

/**
 * Racine des widgets globaux montés dans app/layout.tsx (bandeau cookies,
 * invite d'installation) : jetons .ui-v2 et styles .ui-site, sans le fond ni
 * la hauteur d'une page (.v2-widget, voir styles/ui-v2-site.css).
 */
export function WidgetRoot({ children }: { children: ReactNode }) {
  return <div className={`ui-v2 ui-site v2-widget ${bricolage.variable}`}>{children}</div>
}
