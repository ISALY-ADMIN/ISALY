import type { Metadata } from 'next'
import Script from 'next/script'
import InstallBanner from '@/components/pwa/InstallBanner'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://isaly.fr'),
  title: {
    default: 'ISALY — La colocation intelligente en France',
    template: '%s — ISALY',
  },
  description: 'Trouvez votre colocation idéale avec ISALY. Matching de personnalité, annonces vérifiées, bail électronique. Gratuit pour les locataires.',
  keywords: ['colocation', 'colocataire', 'location', 'appartement', 'bail', 'matching'],
  robots: 'index, follow',
  alternates: {
    canonical: './',
  },
  icons: {
    icon: '/favicon.png',
    apple: '/icon-192.png',
    shortcut: '/favicon.png',
  },
  openGraph: {
    title: 'ISALY — La colocation intelligente en France',
    description: 'Trouvez votre colocation idéale avec ISALY. Matching de personnalité, annonces vérifiées, bail électronique. Gratuit pour les locataires.',
    url: 'https://isaly.fr',
    siteName: 'ISALY',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'ISALY — Ta coloc idéale existe déjà' }],
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ISALY — La colocation intelligente en France',
    description: 'Matching de personnalité, annonces vérifiées, bail électronique.',
    images: ['/og-image.png'],
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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#10B981" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ISALY" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" href="/favicon.png?v=2" type="image/png" />
        <link rel="shortcut icon" href="/favicon.png?v=2" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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
      <Script id="register-sw" strategy="afterInteractive">
        {`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
          }
        `}
      </Script>
      <body>
        {children}
        <InstallBanner />
      </body>
    </html>
  )
}
