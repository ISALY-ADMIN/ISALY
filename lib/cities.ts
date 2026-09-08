/**
 * Référentiel des villes utilisées par les pages SEO `/colocation/[ville]`
 * et par les alertes de recherche créées depuis `?ville=`.
 */
export const CITIES: Record<string, string> = {
  paris: 'Paris',
  marseille: 'Marseille',
  lyon: 'Lyon',
  toulouse: 'Toulouse',
  nice: 'Nice',
  nantes: 'Nantes',
  montpellier: 'Montpellier',
  strasbourg: 'Strasbourg',
  bordeaux: 'Bordeaux',
  lille: 'Lille',
  rennes: 'Rennes',
  reims: 'Reims',
  toulon: 'Toulon',
  'saint-etienne': 'Saint-Étienne',
  'le-havre': 'Le Havre',
  grenoble: 'Grenoble',
  dijon: 'Dijon',
  angers: 'Angers',
  nimes: 'Nîmes',
  'clermont-ferrand': 'Clermont-Ferrand',
}

export function slugifyCity(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function unslugify(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')
}

/** Nom lisible d'une ville à partir de son slug d'URL. */
export function cityNameFromSlug(slug: string): string {
  return CITIES[slug] ?? unslugify(slug)
}

/**
 * Valide un slug reçu d'une URL avant de l'utiliser comme critère d'alerte.
 * Retourne le nom de ville, ou `null` si le paramètre n'a pas la forme d'un slug.
 */
export function safeCityFromSlug(slug: string | null | undefined): string | null {
  if (!slug) return null
  const s = slug.trim().toLowerCase()
  if (!s || s.length > 60 || !/^[a-z0-9-]+$/.test(s)) return null
  return cityNameFromSlug(s)
}
