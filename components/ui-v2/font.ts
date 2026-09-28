import { Bricolage_Grotesque } from 'next/font/google'

/**
 * Police de la charte v2, chargée par next/font (graisses 400 à 800).
 * Exposée en variable CSS --font-bricolage : app/globals.css la place en tête
 * de --font, uniquement sous .ui-v2. Les pages publiques gardent Outfit.
 */
export const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-bricolage',
  display: 'swap',
})
