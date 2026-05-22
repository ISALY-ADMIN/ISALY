import type { Profile, Schedule, Vibe } from '@/types/database'

// ─── Vector Types ──────────────────────────────────────────────────────────────

export interface LifestyleVector {
  proprete: number          // 0=peu propre → 1=très propre
  bruit: number             // 0=silence total → 1=très bruyant
  heure_coucher: number     // 0=21h → 1=4h+
  frequence_soirees: number // 0=jamais → 1=tous les weekends
  frequence_invites: number // 0=jamais → 1=souvent
  cuisine: number           // 0=jamais → 1=passionné culinaire
  teletravail: number       // 0=jamais → 1=full remote
  temps_domicile: number    // 0=rarement présent → 1=toujours
}

export interface PersonalityVector {
  introversion: number      // 0=très extraverti → 1=très introverti
  sociabilite: number       // 0=solitaire → 1=très sociable
  tolerance_conflit: number // 0=conflictuel → 1=très tolérant
  communication: number     // 0=peu communicatif → 1=très communicatif
  besoin_espace: number     // 0=peu d'espace requis → 1=beaucoup
}

export interface ConstraintVector {
  fumeur: boolean
  accepte_fumeurs: boolean
  animaux: boolean
  accepte_animaux: boolean
  alcool: boolean
  regime: 'omnivore' | 'vegetarien' | 'vegan' | 'autre'
}

export interface InterestVector {
  sport: number
  musique: number
  gaming: number
  voyages: number
  culture: number
}

/** Full normalized user vector. All numeric fields are 0–1. */
export interface UserVector {
  id: string
  ville: string
  budget_min: number
  budget_max: number
  genre?: 'homme' | 'femme' | 'autre'
  genre_preference?: 'homme' | 'femme' | 'mixte'
  duree_recherche?: number
  lifestyle: Partial<LifestyleVector>
  personality: Partial<PersonalityVector>
  constraints: Partial<ConstraintVector>
  interests: Partial<InterestVector>
  non_negociables: string[]
}

/**
 * Extended matching data stored as JSONB in profiles.matching_data.
 * Populated from the full questionnaire; optional on all fields for graceful fallback.
 */
export interface MatchingData {
  budget_min?: number
  genre?: 'homme' | 'femme' | 'autre'
  genre_preference?: 'homme' | 'femme' | 'mixte'
  duree_recherche?: number
  lifestyle?: Partial<LifestyleVector>
  personality?: Partial<PersonalityVector>
  constraints?: Partial<ConstraintVector>
  interests?: Partial<InterestVector>
  non_negociables?: string[]
}

// ─── Result Types ──────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  lifestyle: number
  personality: number
  interests: number
  budget: number
  constraints_compatible: boolean
}

export interface MatchScore {
  score: number
  breakdown: ScoreBreakdown
  strengths: string[]
  risks: string[]
  hard_filtered: boolean
  filter_reasons?: string[]
}

export interface RankedCandidate {
  profile: Profile
  match: MatchScore
}

// ─── Category Weights ─────────────────────────────────────────────────────────

const WEIGHTS = {
  lifestyle: 0.40,
  rules: 0.30,    // blends lifestyle + budget
  personality: 0.20,
  interests: 0.10,
} as const

const NON_NEGOCIABLE_MULTIPLIER = 4

// ─── Enum → Vector Mappings ───────────────────────────────────────────────────

const SCHEDULE_MAP: Record<Schedule, Partial<LifestyleVector>> = {
  'leve-tot':    { heure_coucher: 0.05, temps_domicile: 0.65 },
  'couche-tard': { heure_coucher: 0.90, temps_domicile: 0.55 },
  'variable':    { heure_coucher: 0.50, temps_domicile: 0.50 },
  'flexible':    { heure_coucher: 0.50, temps_domicile: 0.40 },
}

const VIBE_MAP: Record<Vibe, { lifestyle: Partial<LifestyleVector>; personality: Partial<PersonalityVector> }> = {
  'calme':    {
    lifestyle:    { bruit: 0.10, frequence_soirees: 0.10, frequence_invites: 0.15 },
    personality:  { introversion: 0.70, sociabilite: 0.30 },
  },
  'festif':   {
    lifestyle:    { bruit: 0.80, frequence_soirees: 0.85, frequence_invites: 0.75 },
    personality:  { introversion: 0.20, sociabilite: 0.85 },
  },
  'studieux': {
    lifestyle:    { bruit: 0.15, frequence_soirees: 0.15, frequence_invites: 0.20 },
    personality:  { introversion: 0.60, sociabilite: 0.35 },
  },
  'detendu':  {
    lifestyle:    { bruit: 0.40, frequence_soirees: 0.40, frequence_invites: 0.45 },
    personality:  { introversion: 0.45, sociabilite: 0.55 },
  },
}

const PASSION_MAP: Partial<Record<string, keyof InterestVector>> = {
  'Sport': 'sport',
  'Musique': 'musique',
  'Gaming': 'gaming',
  'Voyages': 'voyages',
  'Culture': 'culture',
  'Cinéma': 'culture',
  'Art': 'culture',
  'Cuisine': 'culture',
  'Lecture': 'culture',
}

// ─── Similarity Functions ──────────────────────────────────────────────────────

/**
 * Proximity: optimal when preferences should be identical.
 * similarity(0.2, 0.2) = 1 ; similarity(0, 1) = 0
 */
function proximitySim(a: number, b: number): number {
  return 1 - Math.abs(a - b)
}

/**
 * Complementarity: optimal when opposites coexist well (introvert + extravert).
 * Peaks when a + b ≈ 1 ; symmetrically ok at (0,0) and (1,1).
 */
function complementaritySim(a: number, b: number): number {
  return 1 - Math.abs(1 - (a + b)) * 0.5
}

// ─── Profile → UserVector ──────────────────────────────────────────────────────

export function profileToVector(profile: Profile): UserVector {
  const ext = (profile.matching_data ?? {}) as MatchingData
  const sched = SCHEDULE_MAP[profile.schedule ?? 'flexible'] ?? {}
  const vibe = VIBE_MAP[profile.vibe ?? 'detendu'] ?? { lifestyle: {}, personality: {} }

  const baseInterests: Partial<InterestVector> = { sport: 0, musique: 0, gaming: 0, voyages: 0, culture: 0 }
  for (const passion of (profile.passions ?? [])) {
    const key = PASSION_MAP[passion]
    if (key) baseInterests[key] = 1
  }

  return {
    id: profile.id,
    ville: profile.city ?? '',
    budget_min: ext.budget_min ?? Math.round((profile.budget_max ?? 800) * 0.70),
    budget_max: profile.budget_max ?? 800,
    genre: ext.genre,
    genre_preference: ext.genre_preference,
    duree_recherche: ext.duree_recherche,
    lifestyle: {
      ...sched,
      ...vibe.lifestyle,
      ...ext.lifestyle,
    },
    personality: {
      tolerance_conflit: 0.65,
      communication: 0.65,
      besoin_espace: 0.50,
      ...vibe.personality,
      ...ext.personality,
    },
    constraints: {
      fumeur: false,
      accepte_fumeurs: false,
      animaux: false,
      accepte_animaux: true,
      alcool: true,
      regime: 'omnivore',
      ...ext.constraints,
    },
    interests: {
      ...baseInterests,
      ...ext.interests,
    },
    non_negociables: ext.non_negociables ?? [],
  }
}

// ─── Hard Filters ──────────────────────────────────────────────────────────────

function runHardFilters(a: UserVector, b: UserVector): { passed: boolean; reasons: string[] } {
  const reasons: string[] = []

  if (a.budget_max < b.budget_min || b.budget_max < a.budget_min) {
    reasons.push('budget incompatible')
  }

  if (a.ville && b.ville && a.ville.toLowerCase() !== b.ville.toLowerCase()) {
    reasons.push('villes différentes')
  }

  if ((a.constraints.fumeur ?? false) && !(b.constraints.accepte_fumeurs ?? true)) {
    reasons.push('A est fumeur · B n\'accepte pas les fumeurs')
  }
  if ((b.constraints.fumeur ?? false) && !(a.constraints.accepte_fumeurs ?? true)) {
    reasons.push('B est fumeur · A n\'accepte pas les fumeurs')
  }

  if ((a.constraints.animaux ?? false) && !(b.constraints.accepte_animaux ?? true)) {
    reasons.push('A a des animaux · B n\'en accepte pas')
  }
  if ((b.constraints.animaux ?? false) && !(a.constraints.accepte_animaux ?? true)) {
    reasons.push('B a des animaux · A n\'en accepte pas')
  }

  if (a.genre_preference && a.genre_preference !== 'mixte' && b.genre && a.genre_preference !== b.genre) {
    reasons.push('préférence de genre incompatible')
  }
  if (b.genre_preference && b.genre_preference !== 'mixte' && a.genre && b.genre_preference !== a.genre) {
    reasons.push('préférence de genre incompatible')
  }

  return { passed: reasons.length === 0, reasons }
}

// ─── Weighted Category Scorers ────────────────────────────────────────────────

type SimFn = 'proximity' | 'complementarity'

function weightedCategoryScore<T extends object>(
  a: Partial<T>,
  b: Partial<T>,
  fields: Array<{ key: keyof T; fn: SimFn }>,
  nonNeg: string[]
): number {
  let totalWeight = 0
  let weightedSum = 0

  for (const { key, fn } of fields) {
    const aVal = a[key] as number | undefined
    const bVal = b[key] as number | undefined
    if (aVal == null || bVal == null) continue

    const mult = nonNeg.includes(key as string) ? NON_NEGOCIABLE_MULTIPLIER : 1
    const sim = fn === 'proximity' ? proximitySim(aVal, bVal) : complementaritySim(aVal, bVal)
    weightedSum += sim * mult
    totalWeight += mult
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0.5
}

const LIFESTYLE_FIELDS: Array<{ key: keyof LifestyleVector; fn: SimFn }> = [
  { key: 'proprete', fn: 'proximity' },
  { key: 'bruit', fn: 'proximity' },
  { key: 'heure_coucher', fn: 'proximity' },
  { key: 'frequence_soirees', fn: 'proximity' },
  { key: 'frequence_invites', fn: 'proximity' },
  { key: 'cuisine', fn: 'proximity' },
  { key: 'teletravail', fn: 'proximity' },
  { key: 'temps_domicile', fn: 'proximity' },
]

const PERSONALITY_FIELDS: Array<{ key: keyof PersonalityVector; fn: SimFn }> = [
  { key: 'introversion', fn: 'complementarity' },
  { key: 'sociabilite', fn: 'complementarity' },
  { key: 'tolerance_conflit', fn: 'proximity' },
  { key: 'communication', fn: 'proximity' },
  { key: 'besoin_espace', fn: 'proximity' },
]

const INTEREST_FIELDS: Array<{ key: keyof InterestVector; fn: SimFn }> = [
  { key: 'sport', fn: 'proximity' },
  { key: 'musique', fn: 'proximity' },
  { key: 'gaming', fn: 'proximity' },
  { key: 'voyages', fn: 'proximity' },
  { key: 'culture', fn: 'proximity' },
]

function scoreBudget(a: UserVector, b: UserVector): number {
  const diff = Math.abs(a.budget_max - b.budget_max)
  if (diff <= 100) return 1.00
  if (diff <= 200) return 0.80
  if (diff <= 300) return 0.60
  if (diff <= 400) return 0.40
  return Math.max(0, 1 - diff / 1000)
}

// ─── Match Explanation ─────────────────────────────────────────────────────────

function buildExplanation(
  a: UserVector,
  b: UserVector,
  scores: { lifestyle: number; personality: number; interests: number; budget: number }
): { strengths: string[]; risks: string[] } {
  const strengths: string[] = []
  const risks: string[] = []

  const heureDiff = Math.abs((a.lifestyle.heure_coucher ?? 0.5) - (b.lifestyle.heure_coucher ?? 0.5))
  if (heureDiff < 0.20) strengths.push('rythmes de vie similaires')
  else if (heureDiff > 0.55) risks.push('horaires de sommeil très différents')

  const proprDiff = Math.abs((a.lifestyle.proprete ?? 0.5) - (b.lifestyle.proprete ?? 0.5))
  if (proprDiff < 0.15) strengths.push('même niveau de propreté')
  else if (proprDiff > 0.40) risks.push('attentes de propreté différentes')

  const bruitDiff = Math.abs((a.lifestyle.bruit ?? 0.5) - (b.lifestyle.bruit ?? 0.5))
  if (bruitDiff < 0.15) strengths.push('ambiance sonore compatible')
  else if (bruitDiff > 0.40) risks.push('tolérance au bruit différente')

  const soireesDiff = Math.abs((a.lifestyle.frequence_soirees ?? 0.5) - (b.lifestyle.frequence_soirees ?? 0.5))
  if (soireesDiff < 0.20) strengths.push('mode de vie social compatible')
  else if (soireesDiff > 0.50) risks.push('fréquence de soirées très différente')

  const ttvA = a.lifestyle.teletravail ?? 0.5
  const ttvB = b.lifestyle.teletravail ?? 0.5
  if (Math.abs(ttvA - ttvB) < 0.20) strengths.push('modes de travail compatibles')
  else if ((ttvA > 0.7 && ttvB < 0.3) || (ttvB > 0.7 && ttvA < 0.3)) {
    risks.push('présence à domicile très asymétrique')
  }

  if (scores.budget > 0.80) strengths.push('budgets bien alignés')
  else if (scores.budget < 0.45) risks.push('budgets peu compatibles')

  const introA = a.personality.introversion ?? 0.5
  const introB = b.personality.introversion ?? 0.5
  if (complementaritySim(introA, introB) > 0.80) strengths.push('personnalités complémentaires')

  const tolA = a.personality.tolerance_conflit ?? 0.65
  const tolB = b.personality.tolerance_conflit ?? 0.65
  if (tolA > 0.70 && tolB > 0.70) strengths.push('bonne capacité de gestion des conflits')
  else if (tolA < 0.35 || tolB < 0.35) risks.push('gestion des conflits potentiellement difficile')

  if (scores.interests > 0.70) strengths.push('nombreux intérêts communs')
  else if (scores.interests < 0.30) risks.push('peu de centres d\'intérêt partagés')

  return {
    strengths: Array.from(new Set(strengths)),
    risks: Array.from(new Set(risks)),
  }
}

// ─── MatchingEngine ────────────────────────────────────────────────────────────

export class MatchingEngine {
  computeMatchScore(a: UserVector, b: UserVector): MatchScore {
    const filterResult = this.applyHardFilters(a, b)
    if (!filterResult.passed) {
      return {
        score: 0,
        breakdown: { lifestyle: 0, personality: 0, interests: 0, budget: 0, constraints_compatible: false },
        strengths: [],
        risks: filterResult.reasons,
        hard_filtered: true,
        filter_reasons: filterResult.reasons,
      }
    }

    const allNonNeg = [...(a.non_negociables ?? []), ...(b.non_negociables ?? [])]

    const lifestyle = weightedCategoryScore<LifestyleVector>(a.lifestyle, b.lifestyle, LIFESTYLE_FIELDS, allNonNeg)
    const personality = weightedCategoryScore<PersonalityVector>(a.personality, b.personality, PERSONALITY_FIELDS, allNonNeg)
    const interests = weightedCategoryScore<InterestVector>(a.interests, b.interests, INTEREST_FIELDS, allNonNeg)
    const budget = scoreBudget(a, b)

    // "rules" category = mode de vie + budget
    const rules = lifestyle * 0.60 + budget * 0.40

    const rawScore =
      lifestyle  * WEIGHTS.lifestyle  +
      rules      * WEIGHTS.rules      +
      personality * WEIGHTS.personality +
      interests  * WEIGHTS.interests

    const explanation = buildExplanation(a, b, { lifestyle, personality, interests, budget })

    return {
      score: Math.round(Math.min(100, Math.max(0, rawScore * 100))),
      breakdown: {
        lifestyle: Math.round(lifestyle * 100),
        personality: Math.round(personality * 100),
        interests: Math.round(interests * 100),
        budget: Math.round(budget * 100),
        constraints_compatible: true,
      },
      strengths: explanation.strengths,
      risks: explanation.risks,
      hard_filtered: false,
    }
  }

  applyHardFilters(a: UserVector, b: UserVector): { passed: boolean; reasons: string[] } {
    return runHardFilters(a, b)
  }

  rankCandidates(
    user: UserVector,
    candidates: Array<{ profile: Profile; vector: UserVector }>
  ): RankedCandidate[] {
    return candidates
      .map(({ profile, vector }) => ({
        profile,
        match: this.computeMatchScore(user, vector),
      }))
      .filter(c => !c.match.hard_filtered)
      .sort((a, b) => b.match.score - a.match.score)
  }

  explainMatch(a: UserVector, b: UserVector): { score: number; strengths: string[]; risks: string[] } {
    const result = this.computeMatchScore(a, b)
    return { score: result.score, strengths: result.strengths, risks: result.risks }
  }
}

export const matchingEngine = new MatchingEngine()

/** Backward-compatible helper used by existing code. */
export function calculateCompatibility(profileA: Profile, profileB: Profile): number {
  return matchingEngine.computeMatchScore(profileToVector(profileA), profileToVector(profileB)).score
}
