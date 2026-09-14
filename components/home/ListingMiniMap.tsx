'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'

/**
 * Petite carte « Plan IGN » sous chaque card de logement de la page d'accueil.
 *
 * Remplace la grande carte globale (HomeMap, masquée). Fond Géoplateforme IGN
 * via le SDK officiel geoportal-extensions-leaflet, greffé sur le Leaflet déjà
 * en place : pas de changement de librairie de base.
 *
 * ── CLÉ GÉOPORTAIL — À CONFIGURER AVANT QUE LA CARTE FONCTIONNE ────────────
 * La clé est lue dans NEXT_PUBLIC_GEOPORTAIL_API_KEY. Elle doit être :
 *   1. créée sur https://cartes.gouv.fr (espace personnel → clés d'accès) ;
 *   2. ajoutée aux variables d'environnement Vercel (Production + Preview) sous
 *      ce nom exact, puis un redéploiement lancé : une variable NEXT_PUBLIC_
 *      est figée dans le bundle au build, l'ajouter sans redéployer ne suffit pas.
 * Sans clé, ni le SDK ni aucune tuile ne sont chargés : la carte affiche
 * « Carte indisponible ». Si le service de tuiles répond en erreur ou si le SDK
 * ne se charge pas, même message : la page ne plante jamais à cause de la carte.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Non interactive : ni zoom, ni déplacement, ni molette, et `pointer-events:
 * none` sur la carte — le défilement de la page n'est jamais capturé et un clic
 * traverse jusqu'au lien de la card.
 *
 * Confidentialité : `coords` est la position déjà BRUITÉE par jitterCoords
 * (~±500 m) dans /api/home-search. L'adresse exacte n'est jamais transmise au
 * client pour un visiteur non connecté ; ce composant n'en reçoit pas d'autre.
 */

const GEOPORTAIL_API_KEY = process.env.NEXT_PUBLIC_GEOPORTAIL_API_KEY ?? ''
const PLAN_IGN = 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2'
/** Assez près pour que le Plan IGN dessine le bâti, assez loin pour que le
 *  bruit de ±500 m reste une « zone » et pas une adresse. */
const ZOOM = 15

type Leaflet = typeof import('leaflet')
type GeoportalLeaflet = Leaflet & {
  geoportalLayer: {
    WMTS: (
      options: { layer: string; apiKey?: string },
      settings?: Record<string, unknown>,
    ) => import('leaflet').TileLayer
  }
}

/** Le SDK (~2 Mo) n'est chargé qu'une fois, et seulement si une clé existe. */
let sdk: Promise<GeoportalLeaflet> | null = null
function loadGeoportal(): Promise<GeoportalLeaflet> {
  if (!sdk) {
    sdk = Promise.all([import('leaflet'), import('geoportal-extensions-leaflet')])
      .then(([mod]) => ((mod as { default?: Leaflet }).default ?? mod) as unknown as GeoportalLeaflet)
    sdk.catch(() => { sdk = null })
  }
  return sdk
}

const PIN_SVG = `
  <svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 1C5.9 1 1 5.9 1 11.9 1 20.2 12 31 12 31s11-10.8 11-19.1C23 5.9 18.1 1 12 1z"
      fill="#16A34A" stroke="#FFFFFF" stroke-width="1.6"/>
    <circle cx="12" cy="12" r="4.2" fill="#FFFFFF"/>
  </svg>`

const MUTED = 'rgba(32,27,24,0.58)'

export default function ListingMiniMap({ coords, height = 170 }: {
  /** Position approximative (déjà bruitée côté serveur), ou null si inconnue. */
  coords: [number, number] | null
  height?: number
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [failed, setFailed] = useState(false)

  const lat = coords?.[0]
  const lng = coords?.[1]
  const unavailable = !GEOPORTAIL_API_KEY || lat == null || lng == null || failed

  // Jusqu'à 24 cards : on n'instancie une carte qu'à l'approche de l'écran.
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

    loadGeoportal().then(L => {
      if (cancelled) return
      map = L.map(el, {
        center: [lat, lng], zoom: ZOOM,
        dragging: false, zoomControl: false, scrollWheelZoom: false,
        doubleClickZoom: false, touchZoom: false, boxZoom: false,
        keyboard: false, attributionControl: false,
      })
      // La clé conditionne l'activation (plus haut) mais n'est PAS transmise
      // aux tuiles : le Plan IGN est une ressource publique de la
      // Géoplateforme, servie par data.geopf.fr/wmts. Dès qu'on passe `apiKey`
      // au SDK sans getConfig (fichier de config de plusieurs Mo), il bascule
      // sur data.geopf.fr/private/wmts, qui ne sert que les ressources
      // restreintes — la carte serait alors refusée même avec une clé valide.
      // Format explicite : le défaut du SDK (jpeg) ne correspond pas au png
      // du Plan IGN.
      const layer = L.geoportalLayer.WMTS(
        { layer: PLAN_IGN },
        { format: 'image/png', style: 'normal' },
      )
      // Une tuile en erreur AVANT toute tuile chargée = clé refusée ou service
      // injoignable → message propre. Une erreur isolée plus tard est ignorée.
      let loaded = false
      layer.on('tileload', () => { loaded = true })
      layer.on('tileerror', () => { if (!loaded && !cancelled) setFailed(true) })
      layer.addTo(map)
      L.marker([lat, lng], {
        interactive: false, keyboard: false,
        icon: L.divIcon({ html: PIN_SVG, className: '', iconSize: [24, 32], iconAnchor: [12, 31] }),
      }).addTo(map)
    }).catch(() => { if (!cancelled) setFailed(true) })

    return () => { cancelled = true; map?.remove() }
  }, [visible, unavailable, lat, lng])

  if (unavailable) {
    return (
      <div style={{
        height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(32,27,24,0.05)', color: MUTED, fontSize: 11.5,
        borderTop: '1px solid rgba(32,27,24,0.08)',
      }}>
        Carte indisponible
      </div>
    )
  }

  return (
    // isolation : les panneaux Leaflet ont des z-index de 400 à 1000 ; sans
    // contexte d'empilement propre ils passeraient au-dessus de la modale swipe.
    <div style={{ position: 'relative', height, isolation: 'isolate', borderTop: '1px solid rgba(32,27,24,0.08)' }}>
      <div
        ref={hostRef}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: '#E7E1DB', pointerEvents: 'none' }}
      />
      <span style={{ ...TAG, left: 6 }}>Position approximative</span>
      <span style={{ ...TAG, right: 6 }}>© IGN</span>
    </div>
  )
}

const TAG: React.CSSProperties = {
  position: 'absolute', bottom: 6, zIndex: 1, pointerEvents: 'none',
  fontSize: 9.5, fontWeight: 600, lineHeight: 1, padding: '3px 6px', borderRadius: 100,
  background: 'rgba(255,255,255,0.85)', color: MUTED,
}
