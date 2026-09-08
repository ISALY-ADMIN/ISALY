import type { Metadata } from 'next'

export const SITE_URL = 'https://isaly.fr'
export const SITE_NAME = 'ISALY'
export const DEFAULT_OG_IMAGE = '/og-image.png'

export interface PageSeoInput {
  /** Titre sans le suffixe de marque (le template `%s — ISALY` du layout racine l'ajoute). */
  title: string
  description: string
  /** Chemin absolu depuis la racine, ex. `/auth/login`. */
  path: string
  keywords?: string[]
  image?: string
  type?: 'website' | 'article'
  /** Pages utilitaires (formulaires, tunnels) que l'on ne veut pas voir indexées. */
  noIndex?: boolean
}

/**
 * Construit les métadonnées d'une page : title, description, canonical propre
 * et cartes OG/Twitter cohérentes avec le reste du site.
 * Le titre passé est le titre nu — `openGraph`/`twitter` reçoivent la version
 * complète `<titre> — ISALY` car ils n'héritent pas du template du layout.
 */
export function pageMetadata({
  title,
  description,
  path,
  keywords,
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  noIndex = false,
}: PageSeoInput): Metadata {
  const url = `${SITE_URL}${path}`
  const fullTitle = `${title} — ${SITE_NAME}`

  return {
    title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: { canonical: url },
    robots: noIndex ? 'noindex, follow' : 'index, follow',
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: fullTitle }],
      locale: 'fr_FR',
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
    },
  }
}
