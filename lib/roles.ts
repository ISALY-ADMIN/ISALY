/**
 * Rôle utilisateur : locataire ou loueur.
 *
 * Le rôle est posé par la question d'onboarding (« Tu es plutôt… ») et pilote
 * la navigation et le dashboard. Il n'est plus définitif : depuis /app/parametres,
 * TOUT utilisateur peut basculer librement d'une vue à l'autre, autant de fois
 * qu'il le souhaite (section « Mode d'utilisation »).
 *
 * La bascule écrit réellement `profiles.role` via PATCH /api/profile/mode — ce
 * n'est pas un état de session. C'est la seule mécanique possible sans réécrire
 * les quatre lecteurs de la colonne (dashboard, Sidebar, /app/loyers, redirection
 * /app/dashboard), pour qui `profiles.role` est la source de vérité du mode.
 *
 * Ce que la bascule ne fait PAS : toucher `role_confirmed_at`. Cette colonne
 * appartient à /api/profile/role, la réponse à l'onboarding, et c'est elle seule
 * que RoleGate surveille. Changer de vue ne peut donc pas rouvrir la modal.
 */
export type UserRoleMode = 'locataire' | 'loueur'

/**
 * [HIDDEN - BASCULE GÉNÉRALISÉE] Compte de démonstration interne.
 *
 * Il n'est plus le seul à pouvoir basculer : la bascule de vue est ouverte à
 * tous depuis les paramètres. Ce compte garde deux privilèges qui, eux, restent
 * spécifiques et justifient de conserver la constante :
 *   1. la pastille de bascule permanente dans le Sidebar et sur la page swipe,
 *      absente pour les autres (leur point d'entrée est /app/parametres) ;
 *   2. la dispense de la modal RoleGate, qu'il n'a jamais eu à remplir.
 *
 * Rien n'est supprimé ici : `canSwitchMode` reste appelée par Sidebar.tsx,
 * app/app/swipe/page.tsx et RoleGate.tsx.
 *
 * Pourquoi l'e-mail exact plutôt que `is_admin` : rien dans le code ne garantit
 * que `is_admin` reste exclusif à ce compte. C'est une permission générale,
 * affichée par utilisateur dans /admin/utilisateurs et posée à la main en base ;
 * un second administrateur hériterait silencieusement de la double vue et de la
 * dispense de question d'onboarding. `is_admin` continue de gouverner l'accès
 * à /admin/*, ce qui est son rôle ; la double vue se décide ici.
 */
export const DUAL_VIEW_EMAIL = 'isaly.register@gmail.com'

/**
 * Ce compte bénéficie-t-il de la pastille de bascule permanente (Sidebar, swipe)
 * et de la dispense de RoleGate ?
 *
 * Ne PAS utiliser pour décider qui a le droit de changer de vue : tout le monde
 * l'a désormais, depuis /app/parametres.
 */
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
