'use client'

import { useEffect, useMemo, useState } from 'react'
import { eur } from './format'

export interface MapPin {
  id: string
  rent: number
  coords: [number, number] | null
}

/**
 * Carte de l'écran Trouver : même bibliothèque que l'existant (react-leaflet,
 * tuiles de components/map/SearchMap.tsx), seul le style change : une
 * pastille de prix par annonce, violette quand elle est sélectionnée.
 */
export default function TrouverMap({ pins, selected, onSelect }: { pins: MapPin[]; selected: string | null; onSelect: (id: string) => void }) {
  const [mods, setMods] = useState<{ rl: typeof import('react-leaflet'); L: typeof import('leaflet') } | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([import('react-leaflet'), import('leaflet')]).then(([rl, L]) => {
      if (alive) setMods({ rl, L: L.default as unknown as typeof import('leaflet') })
    })
    return () => {
      alive = false
    }
  }, [])

  // Annonces d'une même ville sans coordonnées exactes : léger décalage pour
  // ne pas empiler les pastilles.
  const placed = useMemo(() => {
    const seen = new Map<string, number>()
    return pins
      .filter((p): p is MapPin & { coords: [number, number] } => !!p.coords)
      .map(p => {
        const k = `${p.coords[0].toFixed(4)}_${p.coords[1].toFixed(4)}`
        const n = seen.get(k) ?? 0
        seen.set(k, n + 1)
        const a = n * 2.4
        const r = n ? 0.004 * Math.sqrt(n) : 0
        return { ...p, pos: [p.coords[0] + Math.sin(a) * r, p.coords[1] + Math.cos(a) * r] as [number, number] }
      })
  }, [pins])

  if (!mods) return <div className="leaflet-container" aria-busy="true" />

  const { MapContainer, TileLayer, Marker, ZoomControl } = mods.rl
  const L = mods.L
  const bounds = placed.length ? L.latLngBounds(placed.map(p => p.pos)) : null

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <MapContainer
        bounds={bounds ?? undefined}
        boundsOptions={{ padding: [40, 40], maxZoom: 14 }}
        center={bounds ? undefined : [46.8, 2.3]}
        zoom={bounds ? undefined : 5}
        zoomControl={false}
        style={{ width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
          url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=fr"
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          maxZoom={20}
        />
        <ZoomControl position="topright" />
        {placed.map(p => {
          const on = p.id === selected
          return (
            <Marker
              key={`${p.id}-${on ? 'on' : 'off'}`}
              position={p.pos}
              zIndexOffset={on ? 1000 : 0}
              keyboard
              title={`${p.rent} euros par mois`}
              icon={L.divIcon({ html: `<span class="v-pin${on ? ' on' : ''}">${eur(p.rent)}</span>`, className: '', iconSize: [0, 0] })}
              eventHandlers={{ click: () => onSelect(p.id) }}
            />
          )
        })}
      </MapContainer>
    </>
  )
}
