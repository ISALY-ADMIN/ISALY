import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Politique de confidentialité',
  description: 'Comment ISALY collecte, utilise et protège vos données personnelles, et comment exercer vos droits RGPD.',
  path: '/confidentialite',
})

export default function ConfidentialiteLayout({ children }: { children: React.ReactNode }) {
  return children
}
