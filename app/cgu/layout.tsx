import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: "Conditions générales d'utilisation",
  description: "Conditions générales d'utilisation d'ISALY : accès au service, obligations des utilisateurs, tarification et responsabilités.",
  path: '/cgu',
})

export default function CguLayout({ children }: { children: React.ReactNode }) {
  return children
}
