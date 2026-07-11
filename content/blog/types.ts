export type BlogCategory = 'Guides' | 'Droits' | 'Conseils' | 'Marché'

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'quote'; text: string }

export interface BlogArticle {
  slug: string
  title: string
  category: BlogCategory
  /** Date de publication ISO (rich snippets Google). */
  date: string
  /** Dernière modification ISO. */
  updated?: string
  excerpt: string
  keywords: string[]
  /** Emoji illustratif de la card (placeholder visuel mint). */
  emoji: string
  /** Ville associée (lien depuis /colocation/[ville]). */
  city?: string
  blocks: Block[]
  /** Slugs d'articles liés (maillage interne). */
  related: string[]
}

/** ~200 mots/minute de lecture. */
export function readingTime(article: BlogArticle): number {
  const words = article.blocks.reduce((acc, b) => {
    if (b.type === 'ul') return acc + b.items.join(' ').split(/\s+/).length
    return acc + b.text.split(/\s+/).length
  }, 0)
  return Math.max(1, Math.round(words / 200))
}
