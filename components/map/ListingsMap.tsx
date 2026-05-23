'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Listing {
  id: string
  title: string
  city: string
  neighborhood: string
  rent: number
  rooms_available: number
  photos: string[]
  owner_id: string
}

const CITY_COORDS: Record<string, [number, number]> = {
  'paris': [48.8566, 2.3522],
  'lyon': [45.7640, 4.8357],
  'marseille': [43.2965, 5.3698],
  'toulouse': [43.6047, 1.4442],
  'nice': [43.7102, 7.2620],
  'nantes': [47.2184, -1.5536],
  'strasbourg': [48.5734, 7.7521],
  'montpellier': [43.6119, 3.8772],
  'bordeaux': [44.8378, -0.5792],
  'lille': [50.6292, 3.0573],
  'rennes': [48.1173, -1.6778],
  'reims': [49.2583, 4.0317],
  'grenoble': [45.1885, 5.7245],
  'dijon': [47.3220, 5.0415],
  'angers': [47.4784, -0.5632],
  'metz': [49.1193, 6.1757],
  'tours': [47.3941, 0.6848],
  'clermont-ferrand': [45.7772, 3.0870],
  'aix-en-provence': [43.5297, 5.4474],
  'brest': [48.3904, -4.4861],
}

function getCoordsForCity(city: string): [number, number] | null {
  const normalized = city.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (normalized.includes(key) || key.includes(normalized)) return coords
  }
  return null
}

export default function ListingsMap() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [MapComponents, setMapComponents] = useState<any>(null)

  useEffect(() => {
    import('react-leaflet').then((rl) => {
      import('leaflet').then((L) => {
        delete (L.default.Icon.Default.prototype as any)._getIconUrl
        L.default.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })
        setMapComponents({ rl, L: L.default })
      })
    })
  }, [])

  useEffect(() => {
    async function fetchListings() {
      const supabase = createClient()
      const { data } = await supabase
        .from('listings')
        .select('id, title, city, neighborhood, rent, rooms_available, photos, owner_id')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (data) setListings(data)
      setLoading(false)
    }
    fetchListings()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🗺️</div>
          <div style={{ fontSize: '14px' }}>Chargement de la carte...</div>
        </div>
      </div>
    )
  }

  if (!MapComponents) {
    return (
      <div className="flex items-center justify-center h-full">
        <div style={{ fontSize: '14px', color: '#9CA3AF' }}>Initialisation de la carte...</div>
      </div>
    )
  }

  const { rl, L } = MapComponents
  const { MapContainer, TileLayer, Marker, Popup, ZoomControl } = rl

  const listingsByCity: Record<string, { coords: [number, number]; items: Listing[] }> = {}
  for (const listing of listings) {
    if (!listing.city) continue
    const coords = getCoordsForCity(listing.city)
    if (!coords) continue
    const key = listing.city.toLowerCase().trim()
    if (!listingsByCity[key]) listingsByCity[key] = { coords, items: [] }
    listingsByCity[key].items.push(listing)
  }

  function createClusterIcon(count: number) {
    const size = count === 1 ? 36 : count < 5 ? 44 : 52
    const bg = count === 1 ? '#10B981' : count < 5 ? '#059669' : '#047857'
    return L.divIcon({
      html: `
        <div style="
          width:${size}px; height:${size}px;
          background:${bg};
          border-radius:50%;
          border:3px solid white;
          box-shadow:0 4px 14px rgba(16,185,129,0.45);
          display:flex; align-items:center; justify-content:center;
          color:white; font-weight:700;
          font-size:${count === 1 ? '12' : '14'}px;
          font-family:'Inter',sans-serif;
          cursor:pointer;
        ">
          ${count === 1 ? '🏠' : count}
        </div>
      `,
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <MapContainer
        center={[46.8, 2.3]}
        zoom={6}
        style={{ height: '100%', width: '100%', borderRadius: '0' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
          url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=fr"
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          maxZoom={20}
        />
        <ZoomControl position="bottomright" />

        {Object.entries(listingsByCity).map(([city, { coords, items }]) => (
          <Marker
            key={city}
            position={coords}
            icon={createClusterIcon(items.length)}
          >
            <Popup maxWidth={280} className="listing-popup">
              <div style={{ fontFamily: "'Inter', sans-serif", padding: '4px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px', color: '#111827', textTransform: 'capitalize' }}>
                  📍 {items[0].city}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '10px' }}>
                  {items.length} annonce{items.length > 1 ? 's' : ''} disponible{items.length > 1 ? 's' : ''}
                </div>
                {items.slice(0, 3).map(item => (
                  <div
                    key={item.id}
                    style={{
                      padding: '8px',
                      background: '#F9FAFB',
                      borderRadius: '8px',
                      marginBottom: '6px',
                      cursor: 'pointer',
                      border: '1px solid #E5E7EB',
                    }}
                    onClick={() => { window.location.href = `/app/recherche?listing=${item.id}` }}
                  >
                    {item.photos?.[0] && (
                      <img
                        src={item.photos[0]}
                        alt={item.title}
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                        style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px', marginBottom: '6px' }}
                      />
                    )}
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#111827' }}>
                      {item.title || `Colocation à ${item.city}`}
                    </div>
                    <div style={{ fontSize: '12px', color: '#10B981', fontWeight: 700, marginTop: '2px' }}>
                      {item.rent > 0 ? `${item.rent}€/mois` : 'Prix non renseigné'}
                    </div>
                    {item.rooms_available > 0 && (
                      <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                        {item.rooms_available} chambre{item.rooms_available > 1 ? 's' : ''} disponible{item.rooms_available > 1 ? 's' : ''}
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        window.location.href = `/app/messages?listing=${item.id}&owner=${item.owner_id}`
                      }}
                      style={{
                        marginTop: '6px',
                        width: '100%',
                        padding: '6px',
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      💬 Contacter
                    </button>
                  </div>
                ))}
                {items.length > 3 && (
                  <div
                    style={{ fontSize: '12px', color: '#10B981', fontWeight: 600, textAlign: 'center', marginTop: '4px', cursor: 'pointer' }}
                    onClick={() => { window.location.href = '/app/recherche' }}
                  >
                    +{items.length - 3} autres annonces →
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {listings.length === 0 && (
          <Marker
            position={[46.8, 2.3]}
            icon={L.divIcon({
              html: '<div style="background:white;padding:12px 16px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.1);font-size:13px;color:#6B7280;white-space:nowrap;">Aucune annonce pour l\'instant</div>',
              className: '',
            })}
          >
            <Popup>Sois le premier à publier une annonce !</Popup>
          </Marker>
        )}
      </MapContainer>
    </>
  )
}
