import { COL, mix } from './colors'

/**
 * Dégradés SVG partagés (lg, gradRing, gradFill et rb<couleur>), rendus une
 * seule fois dans le layout de l'espace connecté. Repris de init() dans la
 * maquette.
 */
export function SvgDefs() {
  const grad = (id: string) => (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#6C4DFF" />
      <stop offset=".55" stopColor="#2F6BFF" />
      <stop offset="1" stopColor="#16C79A" />
    </linearGradient>
  )
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        {grad('lg')}
        {grad('gradRing')}
        <linearGradient id="gradFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6C4DFF" stopOpacity=".34" />
          <stop offset="1" stopColor="#16C79A" stopOpacity=".22" />
        </linearGradient>
        {Object.values(COL).map(c => (
          <radialGradient key={c} id={`rb${c.slice(1)}`} cx=".34" cy=".28" r=".78">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity=".95" />
            <stop offset=".22" stopColor={mix(c, '#FFFFFF', 0.45)} />
            <stop offset=".62" stopColor={c} />
            <stop offset="1" stopColor={mix(c, '#000000', 0.38)} />
          </radialGradient>
        ))}
      </defs>
    </svg>
  )
}
