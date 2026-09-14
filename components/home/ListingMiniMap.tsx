'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'

/**
 * Petite carte « Plan IGN » centrée sur un logement, avec un seul pin.
 *
 * Utilisée sur les fiches annonce (publique /annonce/[id] et interne
 * /app/annonce/[id]). Elle a d'abord vécu sous chaque card de la page
 * d'accueil ; cet usage est masqué [HIDDEN] dans HomeClient.
 *
 * Tuiles : service WMTS PUBLIC de la Géoplateforme IGN (data.geopf.fr/wmts),
 * sans clé d'API. Le Plan IGN est une ressource publique ; une clé ferait au
 * contraire basculer vers data.geopf.fr/private/wmts, réservé aux ressources
 * restreintes, qui refuserait la couche. Pas de SDK non plus : pour afficher
 * une seule couche WMTS, un L.tileLayer suffit, là où le SDK
 * geoportal-extensions-leaflet pesait ~630 Ko minifié.
 *
 * Si le service de tuiles répond en erreur, la carte affiche « Carte
 * indisponible » : la page ne plante jamais à cause d'elle.
 *
 * Confidentialité : `coords` doit être la position déjà BRUITÉE par
 * jitterCoords (~±500 m), calculée côté serveur ou par l'appelant. Ce
 * composant n'affiche jamais d'autre position ; l'adresse exacte n'est
 * partagée qu'après validation du dossier.
 */

const PLAN_IGN_URL =
  'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0'
  + '&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png'
  + '&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'

/* [HIDDEN - REMPLACÉ PAR LES TUILES PUBLIQUES DIRECTES] Chargement via le SDK
   geoportal-extensions-leaflet, conditionné à NEXT_PUBLIC_GEOPORTAIL_API_KEY.
   La clé bloquait l'affichage (« Carte indisponible » tant qu'elle manquait)
   alors que le Plan IGN n'en demande pas. Pour y revenir : réactiver ce bloc
   et remplacer L.tileLayer(PLAN_IGN_URL, …) par L.geoportalLayer.WMTS(…).
const GEOPORTAIL_API_KEY = process.env.NEXT_PUBLIC_GEOPORTAIL_API_KEY ?? ''
type GeoportalLeaflet = Leaflet & {
  geoportalLayer: {
    WMTS: (
      options: { layer: string; apiKey?: string },
      settings?: Record<string, unknown>,
    ) => import('leaflet').TileLayer
  }
}
let sdk: Promise<GeoportalLeaflet> | null = null
function loadGeoportal(): Promise<GeoportalLeaflet> {
  if (!sdk) {
    sdk = Promise.all([import('leaflet'), import('geoportal-extensions-leaflet')])
      .then(([mod]) => ((mod as { default?: Leaflet }).default ?? mod) as unknown as GeoportalLeaflet)
    sdk.catch(() => { sdk = null })
  }
  return sdk
}
*/

/** Assez près pour que le Plan IGN dessine le bâti, assez loin pour que le
 *  bruit de ±500 m reste une « zone » et pas une adresse. */
const ZOOM = 15

type Leaflet = typeof import('leaflet')

let leaflet: Promise<Leaflet> | null = null
function loadLeaflet(): Promise<Leaflet> {
  if (!leaflet) {
    leaflet = import('leaflet')
      .then(mod => ((mod as { default?: Leaflet }).default ?? mod) as Leaflet)
    leaflet.catch(() => { leaflet = null })
  }
  return leaflet
}

const PIN_SVG = `
  <svg width="28" height="37" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 1C5.9 1 1 5.9 1 11.9 1 20.2 12 31 12 31s11-10.8 11-19.1C23 5.9 18.1 1 12 1z"
      fill="#16A34A" stroke="#FFFFFF" stroke-width="1.6"/>
    <circle cx="12" cy="12" r="4.2" fill="#FFFFFF"/>
  </svg>`

const MUTED = 'rgba(32,27,24,0.58)'

export default function ListingMiniMap({ coords, height = 170, interactive = false }: {
  /** Position approximative (déjà bruitée), ou null si inconnue. */
  coords: [number, number] | null
  height?: number
  /**
   * false (défaut) : carte figée, `pointer-events: none`, pour un contexte où
   * elle ne doit rien capturer. true : boutons +/−, double-clic et pincement ;
   * glisser seulement à la souris (au doigt, il bloquerait le défilement de la
   * page). La molette reste désactivée dans les deux cas.
   */
  interactive?: boolean
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [failed, setFailed] = useState(false)

  const lat = coords?.[0]
  const lng = coords?.[1]
  const unavailable = lat == null || lng == null || failed

  // N'instancie la carte qu'à l'approche de l'écran.
  useEffect(() => {
    if (unavailable) return
    const el = hostRef.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setVisible(true); io.disconnect() }
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [unavailable])

  useEffect(() => {
    if (!visible || unavailable || lat == null || lng == null) return
    const el = hostRef.current
    if (!el) return
    let cancelled = false
    let map: import('leaflet').Map | null = null

    loadLeaflet().then(L => {
      if (cancelled) return
      map = L.map(el, {
        center: [lat, lng], zoom: ZOOM,
        // Plafond à 16 : plus près, le pin désignerait un immeuble précis
        // alors que la position est bruitée de ±500 m. Plancher à 11 : on
        // reste à l'échelle de la ville.
        minZoom: 11, maxZoom: 16,
        scrollWheelZoom: false, boxZoom: false, keyboard: false,
        dragging: interactive && !L.Browser.mobile,
        touchZoom: interactive, doubleClickZoom: interactive,
        zoomControl: false, attributionControl: false,
      })
      if (interactive) L.control.zoom({ position: 'topright' }).addTo(map)

      const layer = L.tileLayer(PLAN_IGN_URL, { minZoom: 11, maxZoom: 16, tileSize: 256 })
      // Une tuile en erreur AVANT toute tuile chargée = service injoignable
      // → message propre. Une erreur isolée plus tard est ignorée.
      let loaded = false
      layer.on('tileload', () => { loaded = true })
      layer.on('tileerror', () => { if (!loaded && !cancelled) setFailed(true) })
      layer.addTo(map)

      L.marker([lat, lng], {
        interactive: false, keyboard: false,
        icon: L.divIcon({ html: PIN_SVG, className: '', iconSize: [28, 37], iconAnchor: [14, 36] }),
      }).addTo(map)
    }).catch(() => { if (!cancelled) setFailed(true) })

    return () => { cancelled = true; map?.remove() }
  }, [visible, unavailable, lat, lng, interactive])

  if (unavailable) {
    return (
      <div style={{
        height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#E7E1DB', color: MUTED, fontSize: 12,
      }}>
        Carte indisponible
      </div>
    )
  }

  return (
    // isolation : les panneaux Leaflet ont des z-index de 400 à 1000 ; sans
    // contexte d'empilement propre ils passeraient au-dessus des modales et
    // des barres de navigation collantes.
    <div style={{ position: 'relative', height, isolation: 'isolate' }}>
      <div
        ref={hostRef}
        aria-label={interactive ? 'Carte de la zone approximative du logement' : undefined}
        aria-hidden={interactive ? undefined : true}
        style={{
          // zIndex 0 : contexte d'empilement propre à Leaflet, les pastilles
          // (zIndex 1) passent donc toujours au-dessus des tuiles et contrôles.
          position: 'absolute', inset: 0, zIndex: 0, background: '#E7E1DB',
          pointerEvents: interactive ? 'auto' : 'none',
        }}
      />
      <span style={{ ...TAG, left: 8 }}>Position approximative</span>
      <span style={{ ...TAG, right: 8 }}>© IGN – Plan IGN</span>
    </div>
  )
}

const TAG: React.CSSProperties = {
  position: 'absolute', bottom: 8, zIndex: 1, pointerEvents: 'none',
  fontSize: 10, fontWeight: 600, lineHeight: 1, padding: '4px 7px', borderRadius: 100,
  background: 'rgba(255,255,255,0.88)', color: MUTED,
}
