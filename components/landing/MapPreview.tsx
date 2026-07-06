'use client'
import { useEffect, useState } from 'react'
import Emoji from '@/components/ui/Emoji'

interface MapListing {
  id: string
  title: string | null
  city: string | null
  price: number | null
  lat: number
  lng: number
  photo: string | null
}

interface MapComponents {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rl: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  L: any
}

export default function MapPreview() {
  const [listings, setListings] = useState<MapListing[]>([])
  const [MapComponents, setMapComponents] = useState<MapComponents | null>(null)

  useEffect(() => {
    fetch('/api/listings/public-map')
      .then(r => r.json())
      .then((data: MapListing[]) => setListings(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    import('react-leaflet').then((rl) => {
      import('leaflet').then((leaflet) => {
        const L = leaflet.default
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })
        setMapComponents({ rl, L })
      })
    })
  }, [])

  const containerStyle: React.CSSProperties = {
    borderRadius: '16px',
    overflow: 'hidden',
    height: 'clamp(300px, 50vw, 500px)',
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
  }

  if (!MapComponents) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}><Emoji native="🗺️" /></div>
          <div style={{ fontSize: '14px' }}>Chargement de la carte...</div>
        </div>
      </div>
    )
  }

  const { rl, L } = MapComponents
  const { MapContainer, TileLayer, Marker, Popup, ZoomControl } = rl

  // Group listings by city coords
  const byCity: Record<string, { lat: number; lng: number; items: MapListing[] }> = {}
  for (const l of listings) {
    const key = `${l.lat},${l.lng}`
    if (!byCity[key]) byCity[key] = { lat: l.lat, lng: l.lng, items: [] }
    byCity[key].items.push(l)
  }

  function createMarkerIcon(count: number) {
    const size = count === 1 ? 36 : count < 5 ? 44 : 52
    return L.divIcon({
      html: `<div style="width:${size}px;height:${size}px;background:#4ECBA0;border-radius:50%;border:3px solid rgba(255,255,255,0.9);box-shadow:0 4px 14px rgba(78,203,160,0.5);display:flex;align-items:center;justify-content:center;color:#0A0A0A;font-weight:700;font-size:${count === 1 ? '13' : '14'}px;font-family:'Inter',sans-serif;cursor:pointer;">${count === 1 ? '🏠' : count}</div>`,
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }

  return (
    <div style={containerStyle}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <MapContainer
        center={[46.8, 2.3] as [number, number]}
        zoom={6}
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

        {Object.entries(byCity).map(([key, { lat, lng, items }]) => (
          <Marker key={key} position={[lat, lng] as [number, number]} icon={createMarkerIcon(items.length)}>
            <Popup maxWidth={260}>
              <div style={{ fontFamily: "'Outfit', sans-serif", padding: '4px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '6px', color: '#111827' }}>
                  <Emoji native="📍" /> {items[0].city}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
                  {items.length} annonce{items.length > 1 ? 's' : ''} disponible{items.length > 1 ? 's' : ''}
                </div>
                {items.slice(0, 2).map(item => (
                  <div key={item.id} style={{ padding: '8px', background: '#F9FAFB', borderRadius: '8px', marginBottom: '6px', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#111827', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title || `Colocation à ${item.city}`}
                    </div>
                    {item.price && (
                      <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 700, marginBottom: '6px' }}>
                        {item.price}€/mois
                      </div>
                    )}
                    <a
                      href={`/annonce/${item.id}`}
                      style={{ display: 'block', textAlign: 'center', padding: '5px 8px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}
                    >
                      Voir l&apos;annonce →
                    </a>
                  </div>
                ))}
                {items.length > 2 && (
                  <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 600, textAlign: 'center', cursor: 'pointer' }}>
                    +{items.length - 2} autres →
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {listings.length === 0 && (
          <Marker
            position={[46.8, 2.3] as [number, number]}
            icon={L.divIcon({
              html: '<div style="background:white;padding:10px 14px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.1);font-size:13px;color:#6B7280;white-space:nowrap;">Aucune annonce pour l\'instant</div>',
              className: '',
            })}
          >
            <Popup>Sois le premier à publier une annonce !</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
