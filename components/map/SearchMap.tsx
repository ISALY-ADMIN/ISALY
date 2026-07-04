'use client'

import { useEffect, useState } from 'react'

export interface MapItem {
  id: string
  title: string
  rent: number
  photo: string | null
  coords: [number, number]
}

interface SearchMapProps {
  items: MapItem[]
  hoveredId: string | null
  onMarkerClick: (id: string) => void
}

/** Carte Leaflet inline de la recherche : markers prix mint custom,
 *  pulse quand la card correspondante est survolée, clic → highlight card. */
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

  const { MapContainer, TileLayer, Marker, Popup, ZoomControl } = mods.rl
  const L = mods.L

  function priceIcon(rent: number, active: boolean) {
    return L.divIcon({
      html: `
        <div class="isaly-price-marker${active ? ' isaly-marker-active' : ''}" style="
          padding:${active ? '7px 14px' : '5px 11px'};
          background:${active ? '#059669' : '#10B981'};
          border-radius:20px; border:2px solid #fff;
          box-shadow:0 4px 14px rgba(16,185,129,${active ? '0.65' : '0.4'});
          color:#fff; font-weight:800; white-space:nowrap;
          font-size:${active ? '13px' : '12px'};
          font-family:'Outfit',sans-serif; cursor:pointer;
          transform:translate(-50%,-100%);
          transition:all .15s ease;
        ">${rent}€</div>`,
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

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>{`
        @keyframes isalyPulse { 0%,100% { transform:translate(-50%,-100%) scale(1); } 50% { transform:translate(-50%,-100%) scale(1.14); } }
        .isaly-marker-active { animation: isalyPulse 0.9s ease-in-out infinite; }
        .leaflet-popup-content-wrapper { border-radius: 14px; overflow: hidden; }
        .leaflet-popup-content { margin: 0; }
      `}</style>
      <MapContainer
        center={center}
        zoom={items.length > 0 ? 6 : 5}
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
        {items.map(item => (
          <Marker
            key={`${item.id}-${hoveredId === item.id ? 'on' : 'off'}`}
            position={item.coords}
            icon={priceIcon(item.rent, hoveredId === item.id)}
            eventHandlers={{ click: () => onMarkerClick(item.id) }}
          >
            <Popup maxWidth={220}>
              <div
                style={{ fontFamily: "'Outfit', sans-serif", cursor: 'pointer', width: '200px' }}
                onClick={() => onMarkerClick(item.id)}
              >
                {item.photo && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={item.photo} alt={item.title}
                    onError={e => { e.currentTarget.style.display = 'none' }}
                    style={{ width: '100%', height: '90px', objectFit: 'cover', display: 'block' }} />
                )}
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#059669', fontWeight: 800, marginTop: '2px' }}>{item.rent}€/mois</div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </>
  )
}
