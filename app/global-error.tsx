'use client'

import { useEffect } from 'react'
import { SiteRoot } from '@/components/ui-v2/public'
import { ErrorScreen } from '@/components/ui-v2/public/ErrorScreen'

/**
 * Erreur dans la mise en page racine elle-même : remplace tout le document,
 * d'où <html> et <body>. Même écran que error.tsx, sans en-tête ni pied de page
 * (ils dépendent de la mise en page qui vient d'échouer).
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="fr">
      <body>
        <SiteRoot>
          <main id="contenu">
            <ErrorScreen digest={error.digest} reset={reset} />
          </main>
        </SiteRoot>
      </body>
    </html>
  )
}
