import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'ISALY — Trouve ta coloc parfaite',
  description: 'ISALY combine le matching intelligent façon Tinder avec une gestion complète de ton bail.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap"
          rel="stylesheet"
        />
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
