import type { Metadata } from 'next'
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
      <body>{children}</body>
    </html>
  )
}
