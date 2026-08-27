/**
 * Rôle utilisateur : locataire ou loueur.
 *
 * Le rôle est fixé une fois pour toutes par la question d'onboarding
 * (« Tu es plutôt… ») et pilote strictement la navigation et le dashboard.
 * Un utilisateur normal n'a aucun moyen d'en changer depuis l'interface.
 */
export type UserRoleMode = 'locataire' | 'loueur'

/**
 * Compte de démonstration interne, seul autorisé à voir les DEUX panneaux et
 * à basculer librement entre eux.
 *
 * Pourquoi l'e-mail exact plutôt que `is_admin` : rien dans le code ne garantit
 * que `is_admin` reste exclusif à ce compte. C'est une permission générale,
 * affichée par utilisateur dans /admin/utilisateurs et posée à la main en base ;
 * un second administrateur hériterait silencieusement de la double vue et de la
 * dispense de question d'onboarding. `is_admin` continue de gouverner l'accès
 * à /admin/*, ce qui est son rôle ; la double vue se décide ici.
 */
export const DUAL_VIEW_EMAIL = 'isaly.register@gmail.com'

/** Ce compte peut-il voir les deux panneaux et basculer entre eux ? */
export function canSwitchMode(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase() === DUAL_VIEW_EMAIL
}

/** Normalise la valeur de profiles.role vers un mode d'affichage. */
export function roleToMode(role: string | null | undefined): UserRoleMode {
  return role === 'loueur' ? 'loueur' : 'locataire'
}

/** Les deux réponses possibles à la question d'onboarding. */
export const ROLE_CHOICES: {
  value: UserRoleMode
  emoji: string
  title: string
  description: string
}[] = [
  {
    value: 'locataire',
    emoji: '🔍',
    title: 'Je cherche une colocation',
    description: 'Trouve des colocataires compatibles et postule aux annonces.',
  },
  {
    value: 'loueur',
    emoji: '🏠',
    title: 'Je loue un bien',
    description: 'Publie tes annonces, gère tes candidatures et tes baux.',
  },
]
