import { LOGO_PATH } from '../icons'

/**
 * Silhouette du logo en contour (houseOutline de la maquette), pour les pages
 * d'erreur. `missing` ajoute la pièce de puzzle qui flotte (page introuvable).
 */
export function HouseOutline({ missing }: { missing?: boolean }) {
  return (
    <svg className="ill" viewBox="0 0 100 100" aria-hidden="true">
      <path d={LOGO_PATH} fill="url(#lgSoft)" stroke="url(#lg)" strokeWidth="3" strokeLinejoin="round" transform="translate(0 2)" />
      {missing && (
        <circle cx="84" cy="22" r="8" fill="url(#lg)">
          <animate attributeName="cy" values="22;16;22" dur="3s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  )
}
