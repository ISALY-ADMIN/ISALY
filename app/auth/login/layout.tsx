import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Connexion',
  description: 'Connectez-vous à votre compte ISALY pour retrouver vos colocations, vos candidatures et vos messages.',
  path: '/auth/login',
  noIndex: true,
})

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
