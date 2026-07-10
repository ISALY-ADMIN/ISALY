'use client'

import { useEffect, useState } from 'react'

export interface MapItem {
  id: string
  title: string
  rent: number
  photo: string | null
  coords: [number, number]
  city?: string | null
}

interface SearchMapProps {
  items: MapItem[]
  hoveredId: string | null
  onMarkerClick: (id: string) => void
}

/** Carte Leaflet inline de la recherche : markers mint groupés par ville,
 *  affichant le nombre d'annonces (« N ann. »). Un item dont la card est
 *  survolée fait pulser le marker de sa ville. Clic → focus premier item. */
export default function SearchMap({ items, hoveredId, onMarkerClick }: SearchMapProps) {
  const [mods, setMods] = useState<{ rl: typeof import('react-leaflet'); L: typeof import('leaflet') } | null>(null)

  useEffect(() => {
    let mounted = true
    Promise.all([import('react-leaflet'), import('leaflet')]).then(([rl, L]) => {
      if (mounted) setMods({ rl, L: L.default as unknown as typeof import('leaflet') })
    })
    return () => { mounted = false }
  }, [])

  if (!mods) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Chargement de la carte…</div>
      </div>
    )
  }

  const { MapContainer, TileLayer, Marker, ZoomControl } = mods.rl
  const L = mods.L

  // Regroupement par ville (fallback : coords arrondies au 3e chiffre)
  interface Cluster { key: string; coords: [number, number]; items: MapItem[]; label: string }
  const clusters: Cluster[] = []
  const byKey = new Map<string, Cluster>()
  for (const it of items) {
    const key = (it.city ?? '').trim().toLowerCase()
      || `${it.coords[0].toFixed(3)}_${it.coords[1].toFixed(3)}`
    const existing = byKey.get(key)
    if (existing) {
      existing.items.push(it)
    } else {
      const c: Cluster = { key, coords: it.coords, items: [it], label: it.city ?? '' }
      byKey.set(key, c)
      clusters.push(c)
    }
  }
  // Centroïde des coords pour chaque cluster
  for (const c of clusters) {
    const n = c.items.length
    if (n > 1) {
      c.coords = [
        c.items.reduce((s, i) => s + i.coords[0], 0) / n,
        c.items.reduce((s, i) => s + i.coords[1], 0) / n,
      ]
    }
  }

  function countIcon(count: number, active: boolean) {
    const size = count === 1 ? 32 : count < 5 ? 38 : 44
    const bg = count >= 5 ? 'linear-gradient(135deg,#10B981,#059669)' : '#10B981'
    const shadowAlpha = count >= 5 ? 0.6 : active ? 0.55 : 0.4
    return L.divIcon({
      html: `
        <div class="isaly-count-marker${active ? ' isaly-marker-active' : ''}" style="
          width:${size}px; height:${size}px;
          background:${bg};
          border-radius:100px; border:2px solid #fff;
          box-shadow:0 4px 14px rgba(16,185,129,${shadowAlpha});
          color:#fff; font-weight:700; font-size:11px;
          font-family:'Outfit',sans-serif; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          transform:translate(-50%,-50%);
          transition:all .15s ease;
          line-height:1;
        ">${count} ann.</div>`,
      className: '',
      iconSize: [0, 0],
    })
  }

  const center: [number, number] = clusters.length > 0
    ? [
        clusters.reduce((s, c) => s + c.coords[0], 0) / clusters.length,
        clusters.reduce((s, c) => s + c.coords[1], 0) / clusters.length,
      ]
    : [46.8, 2.3]

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>{`
        @keyframes isalyPulse { 0%,100% { transform:translate(-50%,-50%) scale(1); } 50% { transform:translate(-50%,-50%) scale(1.14); } }
        .isaly-marker-active { animation: isalyPulse 0.9s ease-in-out infinite; }
      `}</style>
      <MapContainer
        center={center}
        zoom={clusters.length > 0 ? 6 : 5}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
          url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=fr"
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          maxZoom={20}
        />
        <ZoomControl position="bottomright" />
        {clusters.map(c => {
          const active = !!hoveredId && c.items.some(i => i.id === hoveredId)
          return (
            <Marker
              key={`${c.key}-${active ? 'on' : 'off'}`}
              position={c.coords}
              icon={countIcon(c.items.length, active)}
              eventHandlers={{ click: () => onMarkerClick(c.items[0].id) }}
            />
          )
        })}
      </MapContainer>
    </>
  )
}
