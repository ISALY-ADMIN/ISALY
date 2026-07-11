import { createClient } from '@/lib/supabase/server'
import type { MetadataRoute } from 'next'
import { ARTICLES } from '@/content/blog/articles'

const CITY_SLUGS = [
  'paris', 'marseille', 'lyon', 'toulouse', 'nice', 'nantes', 'montpellier',
  'strasbourg', 'bordeaux', 'lille', 'rennes', 'reims', 'toulon', 'saint-etienne',
  'le-havre', 'grenoble', 'dijon', 'angers', 'nimes', 'clermont-ferrand',
]

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://isaly.fr'

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/auth/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/auth/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/cgu`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/confidentialite`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/contact`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.4 },
  ]

  const cityRoutes: MetadataRoute.Sitemap = CITY_SLUGS.map(slug => ({
    url: `${base}/colocation/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  const blogRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
    ...ARTICLES.map(a => ({
      url: `${base}/blog/${a.slug}`,
      lastModified: new Date(a.updated ?? a.date),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]

  let listingRoutes: MetadataRoute.Sitemap = []
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('listings')
      .select('id, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(500)

    listingRoutes = (data ?? []).map(l => ({
      url: `${base}/annonce/${l.id}`,
      lastModified: new Date(l.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  } catch {
    // Graceful degradation — sitemap works without DB
  }

  return [...staticRoutes, ...cityRoutes, ...blogRoutes, ...listingRoutes]
}
