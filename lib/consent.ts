/**
 * Consentement cookies (RGPD / ePrivacy).
 *
 * Seuls les cookies strictement nécessaires (session Supabase, préférences)
 * sont déposés sans consentement. Tout script non essentiel — aujourd'hui
 * Google Analytics — n'est chargé qu'après un choix explicite de l'utilisateur.
 */

export const CONSENT_STORAGE_KEY = 'isaly.cookie-consent.v1'

/** Événement global : ouvre le panneau de préférences depuis n'importe où. */
export const CONSENT_OPEN_EVENT = 'isaly:open-cookie-settings'

/** Événement global : le choix de l'utilisateur vient de changer. */
export const CONSENT_CHANGE_EVENT = 'isaly:cookie-consent-change'

export interface ConsentChoice {
  /** Mesure d'audience (Google Analytics). */
  analytics: boolean
  /** Date ISO du choix, pour pouvoir en prouver la date et le réinterroger. */
  decidedAt: string
  version: 1
}

/** Lit le choix stocké. `null` = aucun choix fait → il faut demander. */
export function readConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ConsentChoice>
    if (typeof parsed?.analytics !== 'boolean' || parsed.version !== 1) return null
    return parsed as ConsentChoice
  } catch {
    // localStorage indisponible (navigation privée stricte, cookies bloqués)
    // → on considère qu'aucun consentement n'a été donné.
    return null
  }
}

export function writeConsent(analytics: boolean): ConsentChoice {
  const choice: ConsentChoice = { analytics, decidedAt: new Date().toISOString(), version: 1 }
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(choice))
  } catch { /* rien à faire : le choix ne survivra pas à la session */ }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: choice }))
  return choice
}

/** Ouvre le panneau « Gérer mes cookies ». */
export function openCookieSettings() {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))
}
