import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'ISALY — Trouve ta coloc parfaite',
  description: 'ISALY analyse tes habitudes, tes horaires et ta personnalité pour te connecter avec des colocataires vraiment compatibles.',
  icons: {
    icon: '/LOGO_ISALY.png',
    apple: '/LOGO_ISALY.png',
    shortcut: '/LOGO_ISALY.png',
  },
  openGraph: {
    title: 'ISALY — Trouve ta coloc parfaite',
    description: 'Matching intelligent pour trouver le colocataire idéal.',
    url: 'https://isaly.fr',
    siteName: 'ISALY',
    images: [{ url: 'https://isaly.fr/LOGO_ISALY.png', width: 512, height: 512 }],
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
