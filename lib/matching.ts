/**
 * Moteur de compatibilité ISALY — modèle 5 dimensions.
 *
 * Chaque utilisateur répond à 15 questions (3 par dimension, options mappées
 * 0/33/66/100) + 2 questions dealbreakers. Les scores sont stockés dans
 * profiles.matching_data (JSONB). computeCompatibility est une fonction pure :
 * elle retourne null si l'un des deux profils n'a pas complété le test —
 * jamais de faux pourcentage.
 */

// ─── Dimensions ────────────────────────────────────────────────────────────────

export type Dimension = 'rythme' | 'proprete' | 'sociabilite' | 'calme' | 'partage'

export const DIMENSIONS: Dimension[] = ['rythme', 'proprete', 'sociabilite', 'calme', 'partage']

export const DIMENSION_LABELS: Record<Dimension, string> = {
  rythme: 'Rythme de vie',
  proprete: 'Propreté & organisation',
  sociabilite: 'Sociabilité',
  calme: 'Calme',
  partage: 'Partage & valeurs',
}

/** Pondération du score global. */
export const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  proprete: 0.25,
  rythme: 0.20,
  calme: 0.20,
  sociabilite: 0.20,
  partage: 0.15,
}

// ─── Questionnaire ─────────────────────────────────────────────────────────────

export interface QuizQuestion {
  id: string
  dimension: Dimension
  question: string
  /** 4 options, jamais de neutre du milieu. */
  options: [string, string, string, string]
  /** Valeur 0-100 de chaque option (l'ordre d'affichage reste naturel). */
  values: [number, number, number, number]
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // ── Rythme de vie ──
  {
    id: 'q1', dimension: 'rythme',
    question: 'Un mardi soir type ?',
    options: ['Couché avant 22h', '22h – minuit', 'Minuit – 2h', "La nuit, c'est la vie"],
    values: [0, 33, 66, 100],
  },
  {
    id: 'q2', dimension: 'rythme',
    question: 'Ton réveil le week-end ?',
    options: ['Avant 8h, comme en semaine', 'Entre 8h et 10h', 'Entre 10h et midi', 'On se voit au déjeuner'],
    values: [0, 33, 66, 100],
  },
  {
    id: 'q3', dimension: 'rythme',
    question: 'Tes journées en semaine ?',
    options: ['Dehors du matin au soir', 'Dehors, mais je rentre tôt', 'Télétravail 2-3 jours', 'À la maison quasi tout le temps'],
    values: [0, 33, 66, 100],
  },
  // ── Propreté & organisation ──
  {
    id: 'q4', dimension: 'proprete',
    question: 'La vaisselle après le repas ?',
    options: ['Immédiatement', 'Le soir même', 'Le lendemain', 'Quand la pile menace de tomber'],
    values: [100, 66, 33, 0],
  },
  {
    id: 'q5', dimension: 'proprete',
    question: 'Le ménage des espaces communs ?',
    options: ['Planning fixe, chacun son tour', 'Chaque semaine, au feeling', "Quand c'est visiblement sale", 'Le ménage, quel ménage ?'],
    values: [100, 66, 33, 0],
  },
  {
    id: 'q6', dimension: 'proprete',
    question: 'Un truc qui traîne dans le salon ?',
    options: ["Je le range direct, même si c'est pas à moi", 'Je le signale gentiment', 'Je laisse couler quelques jours', 'Chacun vit sa vie'],
    values: [100, 66, 33, 0],
  },
  // ── Sociabilité ──
  {
    id: 'q7', dimension: 'sociabilite',
    question: "Des amis à l'appart ?",
    options: ["Rarement, c'est mon cocon", '1-2 fois par mois', 'Chaque semaine', 'Porte ouverte en continu'],
    values: [0, 33, 66, 100],
  },
  {
    id: 'q8', dimension: 'sociabilite',
    question: 'Ta relation idéale avec tes colocs ?',
    options: ['On se croise poliment', 'On papote dans la cuisine', 'Repas et sorties ensemble', 'Une deuxième famille'],
    values: [0, 33, 66, 100],
  },
  {
    id: 'q9', dimension: 'sociabilite',
    question: 'Un samedi soir idéal ?',
    options: ['Tranquille dans ma chambre', 'Film canapé avec les colocs', 'Dîner à la maison avec des amis', 'Grosse soirée, tout le monde est invité'],
    values: [0, 33, 66, 100],
  },
  // ── Calme ──
  {
    id: 'q10', dimension: 'calme',
    question: 'De la musique dans le salon ?',
    options: ['Enceintes à fond', 'Volume normal', 'Volume doux', 'Toujours au casque'],
    values: [0, 33, 66, 100],
  },
  {
    id: 'q11', dimension: 'calme',
    question: 'Du bruit après 22h ?',
    options: ['Aucun souci, je dors avec', 'Ok le week-end', 'Seulement exceptionnellement', 'Silence complet, impératif'],
    values: [0, 33, 66, 100],
  },
  {
    id: 'q12', dimension: 'calme',
    question: 'Pour te concentrer chez toi ?',
    options: ['Le bruit ne me dérange jamais', 'Un fond sonore me va', "J'ai besoin de calme relatif", 'Silence total obligatoire'],
    values: [0, 33, 66, 100],
  },
  // ── Partage & valeurs ──
  {
    id: 'q13', dimension: 'partage',
    question: 'Les courses ?',
    options: ['Chacun son étagère', 'Base commune (sel, huile…)', "50/50 sur l'essentiel", 'Tout en commun'],
    values: [0, 33, 66, 100],
  },
  {
    id: 'q14', dimension: 'partage',
    question: 'Les repas ?',
    options: ['Chacun cuisine pour soi', 'Ensemble de temps en temps', 'Plusieurs fois par semaine', 'On cuisine et mange ensemble par défaut'],
    values: [0, 33, 66, 100],
  },
  {
    id: 'q15', dimension: 'partage',
    question: 'Prêter tes affaires (aspirateur, poêle, chargeur) ?',
    options: ['Je préfère éviter', 'Sur demande uniquement', "Oui pour l'essentiel", "Ce qui est à moi est à nous"],
    values: [0, 33, 66, 100],
  },
]

export interface DealbreakerQuestion {
  id: 'd_fumeur' | 'd_animaux'
  question: string
  options: [string, string, string, string]
  /** Effet de chaque option sur les dealbreakers. */
  effects: [Partial<Dealbreakers>, Partial<Dealbreakers>, Partial<Dealbreakers>, Partial<Dealbreakers>]
}

export const DEALBREAKER_QUESTIONS: DealbreakerQuestion[] = [
  {
    id: 'd_fumeur',
    question: 'Le tabac ?',
    options: [
      'Je fume',
      'Je fume occasionnellement',
      'Je ne fume pas, mais ça ne me dérange pas',
      'Non-fumeur, et je veux une coloc non-fumeur',
    ],
    effects: [
      { fumeur: true, fumeur_ok: true },
      { fumeur: true, fumeur_ok: true },
      { fumeur: false, fumeur_ok: true },
      { fumeur: false, fumeur_ok: false },
    ],
  },
  {
    id: 'd_animaux',
    question: 'Les animaux ?',
    options: [
      "J'ai un animal",
      "Pas d'animal, mais j'aimerais en adopter",
      "Pas d'animal, mais les colocs peuvent",
      "Pas d'animaux dans la coloc",
    ],
    effects: [
      { animaux: true, animaux_ok: true },
      { animaux: false, animaux_ok: true },
      { animaux: false, animaux_ok: true },
      { animaux: false, animaux_ok: false },
    ],
  },
]

export const QUIZ_TOTAL_STEPS = QUIZ_QUESTIONS.length + DEALBREAKER_QUESTIONS.length

// ─── Types stockés dans profiles.matching_data ─────────────────────────────────

export type DimensionScores = Record<Dimension, number>

export interface Dealbreakers {
  /** L'utilisateur fume. */
  fumeur: boolean
  /** Accepte un coloc fumeur. */
  fumeur_ok: boolean
  /** L'utilisateur a un animal. */
  animaux: boolean
  /** Accepte les animaux dans la coloc. */
  animaux_ok: boolean
}

export interface MatchingData {
  /** questionId → valeur choisie (0/33/66/100), + index d'option pour les dealbreakers. */
  answers: Record<string, number>
  scores: DimensionScores
  dealbreakers: Dealbreakers
  completed_at: string
  /** Conservé pour le calcul de chevauchement budget. */
  budget_min?: number
}

/** Le test est-il réellement complété (ancienne structure vectorielle → false) ? */
export function hasCompletedTest(md: unknown): md is MatchingData {
  if (!md || typeof md !== 'object') return false
  const m = md as Partial<MatchingData>
  return (
    typeof m.completed_at === 'string' &&
    !!m.scores &&
    DIMENSIONS.every(d => typeof (m.scores as Record<string, unknown>)[d] === 'number')
  )
}

/** Score d'une dimension = moyenne des 3 réponses. */
export function computeScoresFromAnswers(answers: Record<string, number>): DimensionScores {
  const scores = {} as DimensionScores
  for (const dim of DIMENSIONS) {
    const qs = QUIZ_QUESTIONS.filter(q => q.dimension === dim)
    const vals = qs.map(q => answers[q.id]).filter((v): v is number => typeof v === 'number')
    scores[dim] = vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 50
  }
  return scores
}

/** Construit le matching_data complet à partir des réponses du quiz. */
export function buildMatchingData(
  answers: Record<string, number>,
  dealbreakerChoices: { d_fumeur: number; d_animaux: number },
  budget_min?: number
): MatchingData {
  const dealbreakers: Dealbreakers = { fumeur: false, fumeur_ok: true, animaux: false, animaux_ok: true }
  for (const q of DEALBREAKER_QUESTIONS) {
    const idx = dealbreakerChoices[q.id]
    if (idx >= 0 && idx <= 3) Object.assign(dealbreakers, q.effects[idx])
  }
  return {
    answers: { ...answers, d_fumeur: dealbreakerChoices.d_fumeur, d_animaux: dealbreakerChoices.d_animaux },
    scores: computeScoresFromAnswers(answers),
    dealbreakers,
    completed_at: new Date().toISOString(),
    ...(budget_min != null ? { budget_min } : {}),
  }
}

// ─── Calcul de compatibilité ───────────────────────────────────────────────────

const MALUS_FUMEUR = 25
const MALUS_ANIMAUX = 15

export interface CompatibilityResult {
  /** Score global 0-100 (pondéré + malus dealbreakers). */
  score: number
  /** Similarité par dimension, 0-100. */
  dimensions: DimensionScores
  /** Conflits de dealbreakers détectés. */
  conflicts: string[]
}

/**
 * Fonction pure. Retourne null si l'un des deux n'a pas complété le test —
 * l'UI doit alors afficher « Test non complété », jamais un faux %.
 */
export function computeCompatibility(a: unknown, b: unknown): CompatibilityResult | null {
  if (!hasCompletedTest(a) || !hasCompletedTest(b)) return null

  const dimensions = {} as DimensionScores
  let weighted = 0
  for (const dim of DIMENSIONS) {
    const sim = 100 - Math.abs(a.scores[dim] - b.scores[dim])
    dimensions[dim] = Math.round(sim)
    weighted += sim * DIMENSION_WEIGHTS[dim]
  }

  const conflicts: string[] = []
  const da = a.dealbreakers, db = b.dealbreakers
  if ((da?.fumeur && db && !db.fumeur_ok) || (db?.fumeur && da && !da.fumeur_ok)) {
    conflicts.push('fumeur')
    weighted -= MALUS_FUMEUR
  }
  if ((da?.animaux && db && !db.animaux_ok) || (db?.animaux && da && !da.animaux_ok)) {
    conflicts.push('animaux')
    weighted -= MALUS_ANIMAUX
  }

  return {
    score: Math.round(Math.min(100, Math.max(0, weighted))),
    dimensions,
    conflicts,
  }
}

// ─── Budget : % de chevauchement des fourchettes ──────────────────────────────

/**
 * Chevauchement des fourchettes budget, 0-100.
 * 100 = la plus petite fourchette est entièrement couverte ; sans
 * chevauchement, décroît avec l'écart (0 à partir de 500 € d'écart).
 */
export function computeBudgetOverlap(
  aMin: number | null | undefined, aMax: number | null | undefined,
  bMin: number | null | undefined, bMax: number | null | undefined
): number | null {
  if (aMax == null || bMax == null) return null
  const loA = aMin ?? Math.round(aMax * 0.7)
  const loB = bMin ?? Math.round(bMax * 0.7)
  const lo = Math.max(loA, loB)
  const hi = Math.min(aMax, bMax)
  if (hi >= lo) {
    const smallest = Math.max(1, Math.min(aMax - loA, bMax - loB))
    return Math.min(100, Math.round(((hi - lo) / smallest) * 100))
  }
  const gap = lo - hi
  return Math.max(0, Math.round(100 - (gap / 500) * 100))
}

// ─── Mapping vers les 4 barres UI existantes ──────────────────────────────────

export interface UiBreakdown {
  modeDeVie: number
  budget: number | null
  personnalite: number
  interets: number
}

export function toUiBreakdown(result: CompatibilityResult, budgetOverlap: number | null): UiBreakdown {
  const d = result.dimensions
  return {
    modeDeVie: Math.round((d.rythme + d.calme) / 2),
    budget: budgetOverlap,
    personnalite: Math.round((d.proprete + d.sociabilite) / 2),
    interets: d.partage,
  }
}

// ─── Helper haut niveau sur deux profils ──────────────────────────────────────

interface ProfileLike {
  matching_data?: unknown
  budget_max?: number | null
}

export interface ProfileCompatibility {
  score: number
  breakdown: UiBreakdown
  dimensions: DimensionScores
  conflicts: string[]
}

/** Compatibilité complète entre deux profils, ou null si test manquant. */
export function profilesCompatibility(a: ProfileLike, b: ProfileLike): ProfileCompatibility | null {
  const result = computeCompatibility(a.matching_data, b.matching_data)
  if (!result) return null
  const mdA = a.matching_data as MatchingData
  const mdB = b.matching_data as MatchingData
  const budget = computeBudgetOverlap(mdA.budget_min, a.budget_max, mdB.budget_min, b.budget_max)
  return {
    score: result.score,
    breakdown: toUiBreakdown(result, budget),
    dimensions: result.dimensions,
    conflicts: result.conflicts,
  }
}
