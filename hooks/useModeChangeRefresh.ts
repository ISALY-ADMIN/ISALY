'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useLease } from '@/contexts/LeaseContext'

/**
 * Force un `router.refresh()` chaque fois que le mode (locataire/loueur)
 * change dans LeaseContext après le premier rendu.
 *
 * À monter sur toutes les pages dont le contenu diffère selon le mode
 * (dashboard-home, mes-annonces, maison, paiement, maintenance…) afin
 * d'éviter qu'un contenu du mode précédent reste affiché après un switch.
 *
 * Le premier passage est ignoré : on ne déclenche pas de refresh au montage.
 */
export function useModeChangeRefresh() {
  const { mode } = useLease()
  const router = useRouter()
  const previous = useRef<'locataire' | 'loueur' | null>(null)

  useEffect(() => {
    if (previous.current === null) {
      previous.current = mode
      return
    }
    if (previous.current !== mode) {
      previous.current = mode
      router.refresh()
    }
  }, [mode, router])
}
