import type { IconName } from '../icons'

/**
 * Navigation du dashboard v2 (bloc NAV de la maquette, routes Next.js
 * existantes conservées). La valeur stockée du mode reste profiles.role :
 * 'locataire' ou 'loueur' ; l'écran affiche « Bailleur ».
 */
export type Mode = 'locataire' | 'loueur'
export type BadgeKey = 'messages' | 'demandes' | 'candidatures' | 'maintenance'

export interface NavItem {
  id: string
  label: string
  ic: IconName
  /** Titre de la barre du haut. */
  title: string
  href: string
  /** Libellé de l'onglet de la barre du bas (mobile), si l'écran y figure. */
  tab?: string
  badge?: BadgeKey
  /** Autres préfixes d'URL qui rendent l'onglet actif. */
  match?: string[]
}

export type NavEntry = NavItem | { group: string }

export const NAV: Record<Mode, NavEntry[]> = {
  locataire: [
    { id: 'dashboard', label: 'Tableau de bord', ic: 'home', title: 'Tableau de bord', href: '/app/dashboard-home', tab: 'Tableau de bord' },
    { id: 'trouver', label: 'Trouver', ic: 'compass', title: 'Trouver une coloc', href: '/app/swipe', tab: 'Trouver', match: ['/app/annonce/'] },
    { id: 'demandes', label: 'Demandes', ic: 'send', title: 'Mes demandes', href: '/app/demandes', badge: 'demandes' },
    { id: 'messages', label: 'Messages', ic: 'chat', title: 'Messages', href: '/app/messages', badge: 'messages', tab: 'Messages' },
    { id: 'maison', label: 'Ma maison', ic: 'house', title: 'Ma maison', href: '/app/maison', tab: 'Ma maison', match: ['/app/bail', '/app/preavis', '/app/signalement'] },
    { group: 'Compte' },
    { id: 'profil', label: 'Mon profil', ic: 'user', title: 'Mon profil', href: '/app/profil', match: ['/app/quiz', '/app/profil-public'] },
    { id: 'plus', label: 'Swiper Plus', ic: 'spark', title: 'Swiper Plus', href: '/app/paiement' },
    { id: 'parrainage', label: 'Parrainage', ic: 'gift', title: 'Parrainage', href: '/app/parrainage' },
    { id: 'parametres', label: 'Paramètres', ic: 'gear', title: 'Paramètres', href: '/app/parametres' },
  ],
  loueur: [
    { id: 'dashboard', label: 'Tableau de bord', ic: 'home', title: 'Tableau de bord', href: '/app/dashboard-home', tab: 'Tableau de bord' },
    { id: 'annonces', label: 'Annonces', ic: 'building', title: 'Mes annonces', href: '/app/mes-annonces', tab: 'Annonces', match: ['/app/annonce', '/app/annonces/'] },
    { id: 'candidatures', label: 'Candidatures', ic: 'inbox', title: 'Candidatures', href: '/app/candidatures', badge: 'candidatures', tab: 'Candidats', match: ['/app/profil-public'] },
    { id: 'baux', label: 'Baux', ic: 'contract', title: 'Mes baux', href: '/app/baux', tab: 'Baux', match: ['/app/locataires', '/app/bail'] },
    { id: 'maintenance', label: 'Maintenance', ic: 'wrench', title: 'Maintenance', href: '/app/maintenance', badge: 'maintenance', match: ['/app/signalement'] },
    { id: 'messages', label: 'Messages', ic: 'chat', title: 'Messages', href: '/app/messages', badge: 'messages' },
    { group: 'Compte' },
    { id: 'abonnement', label: 'Abonnement', ic: 'card', title: 'Abonnement et options', href: '/app/paiement' },
    { id: 'profil', label: 'Mon profil', ic: 'user', title: 'Mon profil', href: '/app/profil', match: ['/app/quiz'] },
    { id: 'parametres', label: 'Paramètres', ic: 'gear', title: 'Paramètres', href: '/app/parametres' },
  ],
}

export function isItem(e: NavEntry): e is NavItem {
  return 'id' in e
}

/** Onglet actif pour une URL donnée (préfixe le plus long). */
export function activeItem(mode: Mode, pathname: string): NavItem | null {
  let best: NavItem | null = null
  let bestLen = -1
  for (const e of NAV[mode]) {
    if (!isItem(e)) continue
    for (const p of [e.href, ...(e.match ?? [])]) {
      const hit = pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`) || (p.endsWith('/') && pathname.startsWith(p))
      if (hit && p.length > bestLen) {
        best = e
        bestLen = p.length
      }
    }
  }
  return best
}

/**
 * Écrans déjà passés au design v2. Les autres gardent leur apparence d'origine
 * dans un cadre sombre (.ui-legacy) le temps de leur migration, écran par écran.
 */
export const V2_SCREENS: Record<string, Mode[]> = {
  '/app/dashboard-home': ['locataire', 'loueur'],
  '/app/swipe': ['locataire'],
  '/app/demandes': ['locataire', 'loueur'],
  '/app/messages': ['locataire', 'loueur'],
  '/app/maison': ['locataire', 'loueur'],
  '/app/profil': ['locataire'],
  '/app/paiement': ['locataire'],
  '/app/parrainage': ['locataire', 'loueur'],
  '/app/parametres': ['locataire', 'loueur'],
  '/app/mes-annonces': ['locataire', 'loueur'],
  '/app/candidatures': ['locataire', 'loueur'],
  '/app/baux': ['locataire', 'loueur'],
}

export function isV2Screen(pathname: string, mode: Mode): boolean {
  return (V2_SCREENS[pathname] ?? []).includes(mode)
}

/** Équivalent d'un écran dans l'autre mode, sinon le tableau de bord. */
export function routeForMode(mode: Mode, pathname: string): string {
  const current = activeItem(mode === 'locataire' ? 'loueur' : 'locataire', pathname)
  if (current) {
    const twin = NAV[mode].find(e => isItem(e) && e.id === current.id) as NavItem | undefined
    if (twin) return twin.href
  }
  return '/app/dashboard-home'
}
