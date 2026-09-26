'use client'

import { useEffect, useState } from 'react'

/**
 * Le contour de la maison-puzzle se dessine (animation de trait), puis
 * s'efface sur le vrai logo. Une seule fois par session.
 *
 * Calque posé SUR l'image du logo (parent en position relative, overflow
 * hidden) : un carré menthe qui cache l'image, le tracé qui s'y dessine,
 * puis un fondu qui rend la main au PNG. L'image n'est jamais retirée — si
 * l'animation n'a pas lieu, le logo est là, tel quel.
 *
 * Le tracé reprend le contour de public/LOGO_ISALY.png (extrait du PNG, repère
 * 164 × 164). La couleur du carré est celle que le navigateur affiche pour le
 * PNG (#ABCEBB, correction gamma comprise), pas sa valeur brute.
 *
 * « Une fois par session » :
 *   · rechargement : le script en ligne, exécuté avant le premier affichage,
 *     lit sessionStorage et pose `m-logo-seen` sur <html> (le calque est
 *     masqué en CSS) — aucun clignotement ;
 *   · navigation côté client : le drapeau de module suffit.
 * Mouvement réduit : le calque n'est pas affiché (globals.css).
 */

const KEY = 'isaly_logo_drawn'
const PATH = 'M83.5 24.5L100.5 39.5L102.5 37.5L102.5 29.5L114.5 29.5L115.5 51.5L139.5 71.5L125.5 71.5L123.5 73.5L123.5 87.5L126.5 90.5L132.5 86.5L135.5 86.5L139.5 88.5L142.5 93.5L141.5 102.5L137.5 106.5L131.5 106.5L127.5 103.5L125.5 103.5L123.5 105.5L123.5 127.5L92.5 127.5L90.5 125.5L94.5 118.5L94.5 115.5L94.5 113.5L89.5 108.5L85.5 106.5L81.5 106.5L75.5 109.5L71.5 115.5L71.5 117.5L75.5 123.5L74.5 127.5L42.5 127.5L42.5 108.5L43.5 106.5L40.5 103.5L35.5 106.5L29.5 106.5L25.5 103.5L23.5 97.5L24.5 92.5L28.5 87.5L34.5 86.5L39.5 90.5L43 87.5L43 73.5L41.5 71.5L26.5 71.5L83.5 24.5Z'

const INLINE = `try{var d=document.documentElement;if(sessionStorage.getItem('${KEY}'))d.classList.add('m-logo-seen');else sessionStorage.setItem('${KEY}','1')}catch(e){}`

/** Déjà monté dans ce chargement de page (navigation côté client). */
let mountedOnce = false

export default function BrandLogoDraw() {
  const [show] = useState(() => !mountedOnce)
  useEffect(() => {
    mountedOnce = true
    try { sessionStorage.setItem(KEY, '1') } catch {}
  }, [])
  if (!show) return null

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: INLINE }} />
      <span
        className="m-logo-cover"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: '#ABCEBB', pointerEvents: 'none' }}
      >
        <svg viewBox="0 0 164 164" className="m-logo-draw" style={{ display: 'block', width: '100%', height: '100%' }}>
          <path d={PATH} pathLength={1} fill="none" stroke="#fff" strokeWidth={3.4} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </span>
    </>
  )
}
