import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript: true,
})

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
