import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const f = firstName?.[0] ?? ''
  const l = lastName?.[0] ?? ''
  return (f + l).toUpperCase() || '?'
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

const AVATAR_COLORS = [
  '#4ECBA0', '#6366F1', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
]

export function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/** Places occupées / capacité totale d'une annonce. Si la capacité n'est pas
 *  renseignée, elle est déduite des chambres disponibles. */
export function listingOccupancy(l: {
  occupants_current?: number | null
  capacity_total?: number | null
  rooms_available?: number | null
}): { current: number; total: number } {
  const current = l.occupants_current ?? 1
  const total = l.capacity_total ?? Math.max(current + (l.rooms_available ?? 1), current)
  return { current, total }
}

/**
 * Parse une date de disponibilité 'YYYY-MM-DD' au jour près.
 *
 * Construite composante par composante volontairement : `new Date('2026-10-01')`
 * est interprété en UTC et retomberait sur le 30 septembre pour un lecteur à
 * l'ouest de Greenwich. Renvoie `null` si la valeur est absente ou illisible.
 */
function parseAvailabilityDate(availableFrom?: string | null): Date | null {
  if (!availableFrom) return null
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(availableFrom)
  if (!parts) return null
  const target = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))
  return Number.isNaN(target.getTime()) ? null : target
}

/**
 * Le logement est-il disponible dès aujourd'hui ?
 *
 * Source de vérité du filtre « Disponible maintenant » de la recherche, pour
 * qu'il ne puisse pas diverger du libellé affiché par `formatAvailability`.
 *
 * Renvoie `true` quand aucune date n'est connue : une annonce sans date reste
 * candidate. L'inverse exclurait de la recherche toutes les annonces publiées
 * avant la migration 41 — l'absence d'information n'est pas une indisponibilité.
 * Même raisonnement pour une valeur illisible : on n'exclut pas sur un doute.
 */
export function isAvailableNow(availableFrom?: string | null): boolean {
  const target = parseAvailabilityDate(availableFrom)
  if (!target) return true
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return target.getTime() <= today.getTime()
}

/**
 * Libellé de disponibilité d'une annonce (listings.available_from, migration 41).
 *
 * Renvoie `null` si la date n'est pas renseignée : l'appelant n'affiche alors
 * rien du tout — pas de tiret, pas de « non renseigné », même règle que les
 * autres champs facultatifs de la carte.
 *
 * Une date passée ou celle du jour devient « Disponible maintenant » : garder
 * « à partir du 3 mars » six mois après le 3 mars ferait passer une annonce
 * libre pour une annonce à venir.
 */
export function formatAvailability(
  availableFrom?: string | null,
  format: 'long' | 'short' = 'long',
): string | null {
  const target = parseAvailabilityDate(availableFrom)
  if (!target) return null
  if (isAvailableNow(availableFrom)) return 'Disponible maintenant'

  const label = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: format === 'short' ? 'short' : 'long',
    year: 'numeric',
  }).format(target)
  return `Disponible à partir du ${label}`
}

/** Nom de marque, jamais affichable tel quel comme nom de personne. */
const BRAND_NAMES = ['isaly', 'isaly immo', 'admin', 'support']

/** Libellé neutre utilisé quand aucun prénom exploitable n'est disponible. */
export const FALLBACK_OWNER_NAME = 'Loueur ISALY'

/**
 * Nom affichable d'un loueur sur une fiche publique.
 * Un prénom vide, ou égal au nom de marque, ne doit jamais être rendu tel quel :
 * « Proposé par ISALY » laisse croire que la plateforme est le bailleur.
 */
export function ownerDisplayName(firstName?: string | null): string {
  const name = firstName?.trim() ?? ''
  if (!name) return FALLBACK_OWNER_NAME
  if (BRAND_NAMES.includes(name.toLowerCase())) return FALLBACK_OWNER_NAME
  return name
}
