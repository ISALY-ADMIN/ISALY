'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLease } from '@/contexts/LeaseContext'
import Topbar from '@/components/layout/Topbar'
import LoueurMaintenance from './LoueurMaintenance'
import Emoji from '@/components/ui/Emoji'

export default function MaintenancePage() {
  const { mode, loading } = useLease()
  const router = useRouter()

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
