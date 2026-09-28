'use client'

import { useEffect, Suspense } from 'react'
import MaintenanceV2 from '@/components/ui-v2/screens/Maintenance'
import { useRouter } from 'next/navigation'
import { useLease } from '@/contexts/LeaseContext'
import { useModeChangeRefresh } from '@/hooks/useModeChangeRefresh'
import Topbar from '@/components/layout/Topbar'
import LoueurMaintenance from './LoueurMaintenance'
import Emoji from '@/components/ui/Emoji'

/** Dashboard v2 : Maintenance côté bailleur (components/ui-v2/screens/Maintenance.tsx). */
export default function MaintenancePage() {
  const { mode, loading } = useLease()
  const router = useRouter()
  useEffect(() => {
    if (!loading && mode === 'locataire') router.replace('/app/maison?onglet=signalements')
  }, [loading, mode, router])
  if (mode === 'locataire') return null
  return (
    <Suspense fallback={null}>
      <MaintenanceV2 />
    </Suspense>
  )
}

/** [HIDDEN] Ancienne page Maintenance (dashboard v1), conservée, plus rendue. */
function MaintenancePageLegacy() {
  const { mode, loading } = useLease()
  const router = useRouter()
  useModeChangeRefresh()

  useEffect(() => {
    if (!loading && mode === 'locataire') router.replace('/app/declarer-probleme')
  }, [loading, mode, router])

  if (loading || mode === 'locataire') {
    return (
      <>
        <Topbar title="Maintenance" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[44px]" style={{ animation: 'bop 1s ease infinite' }}><Emoji native="🔧" /></div>
        </div>
      </>
    )
  }

  return <LoueurMaintenance />
}
