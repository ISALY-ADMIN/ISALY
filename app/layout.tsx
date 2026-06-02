import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ta coloc idéale existe déjà',
  description: 'ISALY analyse tes habitudes, tes horaires et ta personnalité pour te connecter avec des colocataires vraiment compatibles.',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
    shortcut: '/favicon.png',
  },
  openGraph: {
    title: 'Ta coloc idéale existe déjà',
    description: 'Matching intelligent pour trouver le colocataire idéal.',
    url: 'https://isaly.fr',
    siteName: 'ISALY',
    images: [{ url: 'https://isaly.fr/favicon.png', width: 512, height: 512 }],
    locale: 'fr_FR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-JXZRTY71Y4"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-JXZRTY71Y4');
        `}
      </Script>
      <body>{children}</body>
    </html>
  )
}
