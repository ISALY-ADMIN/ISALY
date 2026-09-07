/**
 * Test manuel des règles de la carte « logement » du swipe.
 * Lancer : npx tsx scripts/test-coloc-matching.ts
 *
 * Couvre les deux décisions qui pilotent l'écran :
 *   1. le score affiché = moyenne du visiteur avec chaque colocataire en place ;
 *   2. la variante du bloc « Infos coloc » (occupé / vide / occupants inconnus).
 */
import { aggregateColocScores, colocCardState, averageDimensionScores } from '../lib/colocMatching'
import { formatAvailability } from '../lib/utils'
import { computeCompatibility, buildMatchingData, type DimensionScores } from '../lib/matching'

let failures = 0

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}`)
  if (!ok) console.log(`        attendu ${JSON.stringify(expected)}, reçu ${JSON.stringify(actual)}`)
}

const dims = (rythme: number, proprete: number, sociabilite: number, calme: number, partage: number): DimensionScores =>
  ({ rythme, proprete, sociabilite, calme, partage })

console.log('\n── Moyenne par dimension ──')
check('liste vide → null (jamais 0)', averageDimensionScores([]), null)
check(
  'deux colocataires → moyenne arrondie',
  averageDimensionScores([dims(80, 60, 40, 100, 20), dims(60, 70, 50, 90, 31)]),
  dims(70, 65, 45, 95, 26),
)

console.log('\n── Agrégation du score de la coloc ──')
check(
  'un seul colocataire → son score tel quel',
  aggregateColocScores([{ score: 74, dimensions: dims(70, 80, 60, 90, 70) }]),
  { averageScore: 74, averageDimensions: dims(70, 80, 60, 90, 70), unscoredCount: 0 },
)
check(
  'trois colocataires → moyenne des trois',
  aggregateColocScores([
    { score: 90, dimensions: dims(90, 90, 90, 90, 90) },
    { score: 60, dimensions: dims(60, 60, 60, 60, 60) },
    { score: 45, dimensions: dims(45, 45, 45, 45, 45) },
  ]).averageScore,
  65,
)
check(
  'colocataire sans test → exclu de la moyenne, compté à part',
  aggregateColocScores([
    { score: 80, dimensions: dims(80, 80, 80, 80, 80) },
    { score: null, dimensions: null },
  ]),
  { averageScore: 80, averageDimensions: dims(80, 80, 80, 80, 80), unscoredCount: 1 },
)
check(
  'aucun test complété → pas de score, pas de 0 %',
  aggregateColocScores([{ score: null, dimensions: null }, { score: null, dimensions: null }]),
  { averageScore: null, averageDimensions: null, unscoredCount: 2 },
)
check('aucun colocataire → rien à agréger', aggregateColocScores([]), {
  averageScore: null, averageDimensions: null, unscoredCount: 0,
})

console.log('\n── Variante du bloc « Infos coloc » ──')
check('1 colocataire identifié → variante A (occupé)',
  colocCardState({ identifiedRoommates: 1, declaredOccupants: 2 }), 'occupied')
check('3 colocataires identifiés → variante A (occupé)',
  colocCardState({ identifiedRoommates: 3, declaredOccupants: 4 }), 'occupied')
check('aucun colocataire, occupants_current = 1 (défaut) → variante B (vide)',
  colocCardState({ identifiedRoommates: 0, declaredOccupants: 1 }), 'empty')
check('aucun colocataire, occupants_current = 0 → variante B (vide)',
  colocCardState({ identifiedRoommates: 0, declaredOccupants: 0 }), 'empty')
check('aucun colocataire mais 3 occupants déclarés → occupants inconnus, pas « vide »',
  colocCardState({ identifiedRoommates: 0, declaredOccupants: 3 }), 'undisclosed')

console.log('\n── Date de disponibilité (migration 41) ──')
const iso = (offsetDays: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
check('date absente → rien à afficher (pas de tiret)', formatAvailability(null), null)
check('chaîne vide → rien à afficher', formatAvailability(''), null)
check('valeur illisible → rien à afficher', formatAvailability('bientôt'), null)
check("aujourd'hui → « Disponible maintenant »", formatAvailability(iso(0)), 'Disponible maintenant')
check('hier → « Disponible maintenant »', formatAvailability(iso(-1)), 'Disponible maintenant')
check('il y a un an → « Disponible maintenant »', formatAvailability(iso(-365)), 'Disponible maintenant')
check('demain → « Disponible à partir du … »',
  formatAvailability(iso(1))?.startsWith('Disponible à partir du '), true)
check('date future avec horodatage → date seule conservée',
  formatAvailability('2099-10-01T00:00:00Z'), 'Disponible à partir du 1 octobre 2099')
check('format court → mois abrégé pour la puce de la carte',
  formatAvailability('2099-10-01', 'short'), 'Disponible à partir du 1 oct. 2099')

console.log('\n── Chaîne complète : profil visiteur vs colocataire ──')
// Le moteur existant est réutilisé tel quel : profil du visiteur contre profil
// d'un colocataire en place, exactement comme entre deux candidats.
const visiteur = buildMatchingData(
  { q1: 66, q2: 66, q3: 33, q4: 100, q5: 66, q6: 66, q7: 33, q8: 66, q9: 33, q10: 66, q11: 66, q12: 66, q13: 33, q14: 33, q15: 66 },
  { d_fumeur: 3, d_animaux: 2 },
)
const colocA = buildMatchingData(
  { q1: 66, q2: 33, q3: 33, q4: 100, q5: 100, q6: 66, q7: 33, q8: 66, q9: 66, q10: 66, q11: 100, q12: 66, q13: 33, q14: 66, q15: 66 },
  { d_fumeur: 2, d_animaux: 2 },
)
const colocFumeur = buildMatchingData(
  { q1: 100, q2: 100, q3: 100, q4: 0, q5: 0, q6: 0, q7: 100, q8: 100, q9: 100, q10: 0, q11: 0, q12: 0, q13: 100, q14: 100, q15: 100 },
  { d_fumeur: 0, d_animaux: 0 },
)

const cA = computeCompatibility(visiteur, colocA)
const cF = computeCompatibility(visiteur, colocFumeur)
check('visiteur vs colocataire proche → score calculé', cA !== null, true)
// Le visiteur est non-fumeur strict mais accepte les animaux (d_animaux: 2) :
// seul le tabac fait conflit, l'animal du colocataire n'en est pas un.
check('visiteur non-fumeur strict vs colocataire fumeur → conflit tabac seul', cF?.conflicts, ['fumeur'])

const visiteurSansAnimaux = buildMatchingData(
  { q1: 66, q2: 66, q3: 33, q4: 100, q5: 66, q6: 66, q7: 33, q8: 66, q9: 33, q10: 66, q11: 66, q12: 66, q13: 33, q14: 33, q15: 66 },
  { d_fumeur: 2, d_animaux: 3 },
)
check(
  'visiteur refusant les animaux vs colocataire qui en a un → conflit animaux',
  computeCompatibility(visiteurSansAnimaux, colocFumeur)?.conflicts,
  ['animaux'],
)

const agg = aggregateColocScores([
  { score: cA!.score, dimensions: cA!.dimensions },
  { score: cF!.score, dimensions: cF!.dimensions },
])
check(
  'moyenne des deux = moyenne arrondie de leurs scores',
  agg.averageScore,
  Math.round((cA!.score + cF!.score) / 2),
)
console.log(`        (${cA!.score}% et ${cF!.score}% → ${agg.averageScore}% affiché sur la carte)`)

console.log(failures === 0 ? '\n✅ Toutes les règles passent\n' : `\n❌ ${failures} échec(s)\n`)
process.exit(failures === 0 ? 0 : 1)
