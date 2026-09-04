import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Contact',
  description: "Une question, un bug ou une suggestion ? Contactez l'équipe ISALY, nous répondons sous 48 h ouvrées.",
  path: '/contact',
  keywords: ['contact ISALY', 'support colocation', 'aide'],
})

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
