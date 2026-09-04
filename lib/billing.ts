/**
 * Coupe-circuit des paiements.
 *
 * Contexte : `STRIPE_WEBHOOK_SECRET` n'est pas configuré en production. Sans
 * lui, `stripe.webhooks.constructEvent` rejette tous les événements entrants
 * (app/api/webhooks/stripe/route.ts) et l'application n'est JAMAIS notifiée
 * d'un paiement réussi. Conséquence concrète : un loueur peut être débité d'un
 * abonnement mensuel récurrent sans que son annonce soit jamais activée —
 * `listings.is_active` reste à `false`, seul le webhook le passe à `true`.
 *
 * Tant que ce drapeau vaut `false` :
 *   - les routes de checkout répondent 503 (aucune session Stripe n'est créée) ;
 *   - les écrans de paiement affichent « bientôt disponible » au lieu d'un
 *     bouton fonctionnel mais silencieusement cassé ;
 *   - le dépôt d'annonce force la formule Standard, qui publie immédiatement.
 *
 * À repasser à `true` UNIQUEMENT après avoir : configuré le webhook Stripe,
 * vérifié la réception d'un `checkout.session.completed`, et ajouté le
 * traitement des plans `featured` / `priority` dans le webhook (aujourd'hui
 * absent : voir la note ci-dessous).
 *
 * Note : même webhook configuré, les plans `featured` et `priority` envoyés par
 * /api/stripe/checkout ne sont traités par AUCUNE branche du webhook, qui ne
 * connaît que `swiper_plus` et `listing_boost`.
 */
export const BILLING_ENABLED = false

/** Message unique, affiché côté écran comme renvoyé par les API. */
export const BILLING_DISABLED_MESSAGE =
  'Les paiements sont temporairement indisponibles. Cette offre revient très bientôt — aucun montant ne peut être prélevé pour le moment.'
