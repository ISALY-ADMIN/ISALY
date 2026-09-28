'use client'

import { useEffect } from 'react'
import { PublicLayout } from '@/components/ui-v2/public'
import { ErrorScreen } from '@/components/ui-v2/public/ErrorScreen'

/** Erreur d'une page (vE500 de la maquette) : « Réessayer » relance le rendu. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <PublicLayout>
      <ErrorScreen digest={error.digest} reset={reset} />
    </PublicLayout>
  )
}
