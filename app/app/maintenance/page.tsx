'use client'

import { useLease } from '@/contexts/LeaseContext'
import Topbar from '@/components/layout/Topbar'
import TenantMaintenanceClient from './TenantMaintenanceClient'
import LoueurMaintenance from './LoueurMaintenance'

export default function MaintenancePage() {
  const { mode, loading } = useLease()

  if (loading) {
    return (
      <>
        <Topbar title="Maintenance" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[44px]" style={{ animation: 'bop 1s ease infinite' }}>🔧</div>
        </div>
      </>
    )
  }

  if (mode === 'loueur') return <LoueurMaintenance />
  return <TenantMaintenanceClient />
}
