/**
 * Mission 18 — événements GA4 typés (gtag chargé dans app/layout.tsx, G-JXZRTY71Y4).
 * No-op côté serveur ou si gtag est bloqué (adblock) : ne jette jamais.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

function event(name: string, params?: Record<string, unknown>) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', name, params ?? {})
    }
  } catch {
    // analytics ne doit jamais casser l'app
  }
}

export const track = {
  // ── Acquisition / activation ──
  signUp: (method: 'email' | 'google' = 'email') => event('sign_up', { method }),
  onboardingCompleted: () => event('onboarding_completed'),
  quizCompleted: () => event('quiz_completed'),

  // ── Engagement swipe ──
  swipeRight: (targetType: 'profile' | 'listing' = 'profile') => event('swipe_right', { target_type: targetType }),
  swipeLeft: (targetType: 'profile' | 'listing' = 'profile') => event('swipe_left', { target_type: targetType }),
  superLike: (targetType: 'profile' | 'listing' = 'profile') => event('super_like', { target_type: targetType }),
  match: () => event('match'),

  // ── Conversion ──
  messageSent: () => event('message_sent'),
  listingPublished: (city?: string) => event('listing_published', { city }),
  leaseSigned: () => event('lease_signed'),
  boostPurchased: (tier?: string) => event('boost_purchased', { tier }),

  // ── Missions 14-16 ──
  identityVerificationStarted: () => event('identity_verification_started'),
  urgentSearchActivated: (city?: string) => event('urgent_search_activated', { city }),
  garantAdded: () => event('garant_added'),
}
