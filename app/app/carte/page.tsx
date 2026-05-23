'use client'

import dynamic from 'next/dynamic'
import Topbar from '@/components/layout/Topbar'

const ListingsMap = dynamic(() => import('@/components/map/ListingsMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full" style={{ background: '#F0F4F0' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
        <div style={{ fontSize: '14px', color: '#9CA3AF' }}>Chargement de la carte...</div>
      </div>
    </div>
  ),
})

export default function CartePage() {
  return (
    <div className="flex flex-col" style={{ height: '100vh' }}>
      <Topbar title="Carte des annonces" />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <ListingsMap />
      </div>
    </div>
  )
}
