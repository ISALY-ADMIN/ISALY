'use client'

import dynamic from 'next/dynamic'
import Topbar from '@/components/layout/Topbar'
import Emoji from '@/components/ui/Emoji'

const ListingsMap = dynamic(() => import('@/components/map/ListingsMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full" style={{ background: 'transparent' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}><Emoji native="🗺️" /></div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Chargement de la carte...</div>
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
