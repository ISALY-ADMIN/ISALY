/** Coordonnées approximatives des grandes villes françaises — fallback quand
 *  une annonce n'a pas de latitude/longitude renseignées. */
export const CITY_COORDS: Record<string, [number, number]> = {
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

export function getCoordsForCity(city: string): [number, number] | null {
  const normalized = city.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (normalized.includes(key) || key.includes(normalized)) return coords
  }
  return null
}

/** Décalage déterministe (~±500 m) pour ne pas révéler l'adresse exacte
 *  et éviter que les markers d'une même ville se superposent. */
export function jitterCoords(coords: [number, number], seed: string): [number, number] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (seed.charCodeAt(i) + ((h << 5) - h)) | 0
  const dx = ((h % 1000) / 1000 - 0.5) * 0.012
  const dy = (((h >> 10) % 1000) / 1000 - 0.5) * 0.012
  return [coords[0] + dx, coords[1] + dy]
}
