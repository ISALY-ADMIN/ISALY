/**
 * Préavis de départ du locataire — règles de calcul partagées.
 *
 * Délai légal (loi n° 89-462, art. 15) appliqué automatiquement :
 *   - logement meublé      → 1 mois
 *   - logement non meublé  → 3 mois
 *
 * La date de déclaration est TOUJOURS horodatée par le serveur : le locataire
 * ne la saisit pas. La date de fin effective en découle mécaniquement, et
 * c'est elle — pas `leases.end_date` — qui pilote l'arrêt de la part de
 * commission du locataire concerné (voir lib/commission.ts).
 */

export type TypeLogement = 'meuble' | 'non_meuble'

/** Délai légal en mois, par régime. */
export const DELAI_PREAVIS_MOIS: Record<TypeLogement, 1 | 3> = {
  meuble: 1,
  non_meuble: 3,
}

/**
 * Régime du bail. `leases.meuble` fait foi (figé à la signature, migration 39) ;
 * `listings.meuble` ne sert que de repli quand le bail ne le porte pas encore.
 * `null` = indéterminé : le locataire doit alors le déclarer lui-même.
 */
export function resolveTypeLogement(
  leaseMeuble: boolean | null | undefined,
  listingMeuble?: boolean | null,
): TypeLogement | null {
  const meuble = leaseMeuble ?? listingMeuble ?? null
  if (meuble === null) return null
  return meuble ? 'meuble' : 'non_meuble'
}

/**
 * Ajoute `months` mois à une date, en ramenant au dernier jour du mois quand
 * le quantième n'existe pas dans le mois d'arrivée (31 janvier + 1 mois →
 * 28 ou 29 février). Sans ce recalage, `setMonth` déborderait sur mars.
 */
export function addMonths(date: Date, months: number): Date {
  const day = date.getDate()
  const result = new Date(date.getTime())
  result.setDate(1)
  result.setMonth(result.getMonth() + months)
  const lastDayOfTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(day, lastDayOfTargetMonth))
  return result
}

/** Date de fin effective du bail pour ce locataire = déclaration + délai légal. */
export function computeDateFinEffective(dateDeclaration: Date, type: TypeLogement): Date {
  return addMonths(dateDeclaration, DELAI_PREAVIS_MOIS[type])
}

/** `YYYY-MM-DD` en heure locale — évite le décalage d'un jour d'un toISOString() en UTC. */
export function toDateKey(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

export function formatDateFr(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export const TYPE_LOGEMENT_LABEL: Record<TypeLogement, string> = {
  meuble: 'meublé',
  non_meuble: 'non meublé',
}

export interface PreavisRow {
  id: string
  lease_id: string
  tenant_id: string
  date_declaration: string
  date_fin_effective: string
  type_logement: TypeLogement
  delai_mois: 1 | 3
  status: 'active' | 'cancelled' | 'applied'
  cancelled_at: string | null
  applied_at: string | null
  created_at: string
}
