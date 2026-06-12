import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ISALY - Colocation intelligente',
    short_name: 'ISALY',
    description: 'Trouve ta colocation idéale grâce au matching intelligent.',
    start_url: '/app/swipe',
    display: 'standalone',
    background_color: '#0A0A0A',
    theme_color: '#10B981',
    orientation: 'portrait',
    icons: [
      {
        src: '/favicon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    categories: ['lifestyle', 'social'],
    lang: 'fr',
    scope: '/',
  }
}
