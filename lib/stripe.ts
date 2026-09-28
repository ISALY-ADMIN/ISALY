import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
})

/**
 * [HIDDEN] Anciennes offres (dashboard v1) : commission de gestion de 2,5 %,
 * offres mensuelles « Mis en avant » et « Prioritaire ». Remplacées par
 * l'abonnement autogestion et les mises en avant de 1, 3 ou 7 jours
 * (lib/stripePrices.ts). Plus lues nulle part, conservées pour mémoire.
 */
export const PLANS = {
  assurance: {
    name: 'Commission de gestion du bail',
    price: 'percentage',
    description: '2,5 % du loyer mensuel, prélevés chaque mois pendant la durée du bail',
  },
  featured: {
    name: 'Annonce mise en avant',
    price: 999,
    interval: 'month' as const,
    description: '2× plus de contacts · Badge vérifié',
  },
  priority: {
    name: 'Annonce prioritaire',
    price: 2499,
    interval: 'month' as const,
    description: 'Top du fil · Analytics avancés',
  },
}
