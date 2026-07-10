/**
 * Source de vérité unique pour le % de complétion du profil.
 * Utilisé par /app/profil (checklist visuelle) ET /app/dashboard-home (progress ring).
 *
 * Critères alignés sur /app/profil :
 *  - avatar_url présent
 *  - first_name + last_name présents
 *  - bio > 20 caractères (après trim)
 *  - city présente ET budget_max > 0
 *  - matching_data.completed_at (test de compatibilité fait)
 *  - cert_level >= 2 (pièce d'identité uploadée)
 *  - cert_level >= 3 (justificatif de revenus uploadé)
 */

export interface ProfileCompletionInput {
  avatarUrl?: string | null
  firstName?: string | null
  lastName?: string | null
  city?: string | null
  bio?: string | null
  budgetMax?: number | null
  matchingData?: Record<string, unknown> | null
  certLevel?: number | null
}

export interface CompletionStep {
  key: 'photo' | 'name' | 'bio' | 'city' | 'quiz' | 'cni' | 'income'
  label: string
  done: boolean
}

export function computeProfileCompletionSteps(p: ProfileCompletionInput): CompletionStep[] {
  const bioLen = (p.bio ?? '').trim().length
  const cert = p.certLevel ?? 0
  return [
    { key: 'photo',  label: 'Photo de profil',        done: !!p.avatarUrl },
    { key: 'name',   label: 'Prénom & nom',           done: !!(p.firstName && p.lastName) },
    { key: 'bio',    label: 'Bio (20+ car.)',         done: bioLen > 20 },
    { key: 'city',   label: 'Ville & budget',         done: !!p.city && (p.budgetMax ?? 0) > 0 },
    { key: 'quiz',   label: 'Test de compatibilité',  done: !!(p.matchingData && typeof p.matchingData.completed_at === 'string') },
    { key: 'cni',    label: "Pièce d'identité",       done: cert >= 2 },
    { key: 'income', label: 'Justificatif de revenus', done: cert >= 3 },
  ]
}

export function computeProfileCompletion(p: ProfileCompletionInput): number {
  const steps = computeProfileCompletionSteps(p)
  const done = steps.filter(s => s.done).length
  return Math.round((done / steps.length) * 100)
}
