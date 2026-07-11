import type { BlogArticle, BlogCategory } from './types'
import { guideColocationParis } from './guide-colocation-paris'
import { droitsLocataireColocation } from './droits-locataire-colocation'
import { commentChoisirColocataire } from './comment-choisir-colocataire'
import { redigerBailColocation } from './rediger-bail-colocation'
import { colocationVsStudio } from './colocation-vs-studio'

export type { BlogArticle, BlogCategory }
export { readingTime } from './types'

/** Tous les articles, du plus récent au plus ancien. */
export const ARTICLES: BlogArticle[] = [
  colocationVsStudio,
  redigerBailColocation,
  commentChoisirColocataire,
  droitsLocataireColocation,
  guideColocationParis,
].sort((a, b) => b.date.localeCompare(a.date))

export const CATEGORIES: BlogCategory[] = ['Guides', 'Droits', 'Conseils', 'Marché']

export function getArticle(slug: string): BlogArticle | undefined {
  return ARTICLES.find(a => a.slug === slug)
}

export function getArticlesByCity(city: string): BlogArticle[] {
  const c = city.toLowerCase()
  return ARTICLES.filter(a => a.city?.toLowerCase() === c)
}

/** Article précédent / suivant (ordre chronologique). */
export function getAdjacent(slug: string): { prev: BlogArticle | null; next: BlogArticle | null } {
  const idx = ARTICLES.findIndex(a => a.slug === slug)
  if (idx === -1) return { prev: null, next: null }
  return {
    prev: ARTICLES[idx + 1] ?? null, // plus ancien
    next: ARTICLES[idx - 1] ?? null, // plus récent
  }
}
