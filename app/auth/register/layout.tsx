import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Créer un compte',
  description: "Créez votre compte ISALY gratuitement : matching de personnalité, annonces vérifiées et bail en ligne. Gratuit pour les locataires jusqu'à la signature.",
  path: '/auth/register',
  noIndex: true,
})

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
