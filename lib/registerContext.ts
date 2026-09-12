/**
 * Message contextuel affiché à l'inscription, selon le geste qui y a mené.
 *
 * Suit la convention déjà en place pour `?ville=` (posé par les pages SEO
 * /colocation/<ville>, lu côté client par app/auth/register/page.tsx) : un
 * paramètre d'URL, court et lisible, plutôt qu'un état de session. Même
 * raison qu'à l'époque — le lien reste partageable, la page d'inscription
 * reste statiquement rendable, et rien à nettoyer si l'utilisateur abandonne.
 *
 * Le libellé vit ICI et non dans la page d'inscription, pour la même raison
 * que `isAvailableNow` et `formatAvailability` partagent un parseur dans
 * lib/utils : l'émetteur du lien et la page qui l'affiche ne doivent pas
 * pouvoir se contredire.
 */

export const REGISTER_CONTEXTS = {
  /** Le visiteur a aimé un logement dans l'aperçu de swipe. */
  like: 'Tu as aimé ce logement ? Crée ton compte pour candidater et voir ta compatibilité avec les colocataires.',
  /** Le visiteur a passé un logement dans l'aperçu de swipe. */
  pass: 'Pas celui-là ? Crée ton compte pour voir tous les logements compatibles avec ton profil.',
  /** Le visiteur a cliqué « Postuler » sur un logement vide. */
  apply: 'Pour candidater à ce logement, il te faut un compte — deux minutes, et ton dossier est prêt.',
} as const

export type RegisterContext = keyof typeof REGISTER_CONTEXTS

/** Le paramètre est écrit par un humain dans l'URL aussi bien que par nous :
 *  une valeur inconnue ne doit rien afficher, pas planter la page. */
export function registerContextMessage(value: string | null | undefined): string | null {
  if (!value) return null
  return (REGISTER_CONTEXTS as Record<string, string>)[value] ?? null
}

/** Lien d'inscription portant le contexte — un seul endroit qui écrit le nom
 *  du paramètre, pour ne pas avoir à le retrouver partout s'il change. */
export function registerHref(context: RegisterContext): string {
  return `/auth/register?contexte=${context}`
}
