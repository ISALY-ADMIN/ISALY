'use client'

import { useEffect, useState } from 'react'

export interface HomeMapItem {
  id: string
  rent: number
  /** Position APPROXIMATIVE (jitter ~500 m côté serveur) — jamais l'adresse exacte. */
  coords: [number, number]
  city?: string | null
}

interface Props {
  items: HomeMapItem[]
  hoveredId: string | null
  onMarkerClick: (id: string) => void
}

/**
 * Carte de la page d'accueil — un marqueur PAR LOGEMENT portant le loyer,
 * conformément à la maquette (.map-pin : pastille prix + ergot bas).
 *
 * Se distingue de components/map/SearchMap.tsx, qui regroupe les annonces par
 * ville en markers « N ann. ». Même socle technique (Leaflet chargé en dynamic
 * import, mêmes tuiles fr), habillage différent.
 *
 * Confidentialité : ce composant ne reçoit QUE des coordonnées déjà bruitées
 * par jitterCoords (~±500 m) dans /api/home-search. L'adresse exacte n'est
 * jamais transmise au client pour un visiteur non connecté.
 */
export default function HomeMap({ items, hoveredId, onMarkerClick }: Props) {
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
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, color: 'rgba(246,243,240,0.38)',
      }}>
        Chargement de la carte…
      </div>
    )
  }

  const { MapContainer, TileLayer, Marker, ZoomControl } = mods.rl
  const L = mods.L

  /** Pastille prix de la maquette (.map-pin / .map-pin.hi). */
  function priceIcon(rent: number, active: boolean) {
    const bg = active ? '#4ADE80' : '#131110'
    const fg = active ? '#08170F' : '#F6F3F0'
    const border = active ? 'transparent' : 'rgba(255,255,255,0.14)'
    return L.divIcon({
      html: `
        <div style="
          position:relative; transform:translate(-50%,-100%);
          background:${bg}; color:${fg}; border:1px solid ${border};
          font-size:12px; font-weight:700; font-family:'Outfit',sans-serif;
          padding:6px 11px; border-radius:100px; white-space:nowrap;
          box-shadow:0 6px 18px rgba(0,0,0,0.35); line-height:1;
          transition:all .15s ease;
        ">${rent} €<span style="
          position:absolute; left:50%; bottom:-5px; transform:translateX(-50%) rotate(45deg);
          width:8px; height:8px; background:${bg};
          border-right:1px solid ${border}; border-bottom:1px solid ${border};
          border-radius:0 0 2px 0;
        "></span></div>`,
      className: '',
      iconSize: [0, 0],
    })
  }

  const center: [number, number] = items.length > 0
    ? [
        items.reduce((s, i) => s + i.coords[0], 0) / items.length,
        items.reduce((s, i) => s + i.coords[1], 0) / items.length,
      ]
    : [46.8, 2.3]

  // Une seule ville dans les résultats → on zoome sur le quartier ; sinon vue France.
  const distinctCities = new Set(items.map(i => (i.city ?? '').trim().toLowerCase())).size
  const zoom = items.length === 0 ? 5 : distinctCities === 1 ? 12 : 6

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
          url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=fr"
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          maxZoom={20}
        />
        <ZoomControl position="bottomright" />
        {items.map(it => {
          const active = it.id === hoveredId
          return (
            <Marker
              key={`${it.id}-${active ? 'on' : 'off'}`}
              position={it.coords}
              icon={priceIcon(it.rent, active)}
              eventHandlers={{ click: () => onMarkerClick(it.id) }}
            />
          )
        })}
      </MapContainer>
    </>
  )
}
