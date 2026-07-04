/**
 * Test manuel du moteur de compatibilité 5 dimensions.
 * Lancer : npx tsx scripts/test-matching.ts
 */
import {
  computeCompatibility,
  computeBudgetOverlap,
  toUiBreakdown,
  buildMatchingData,
  profilesCompatibility,
  DIMENSION_LABELS,
  DIMENSIONS,
  type MatchingData,
} from '../lib/matching'

function makeData(
  scores: [number, number, number, number, number],
  dealbreakers: Partial<MatchingData['dealbreakers']> = {},
  budget_min?: number
): MatchingData {
  const [rythme, proprete, sociabilite, calme, partage] = scores
  return {
    answers: {},
    scores: { rythme, proprete, sociabilite, calme, partage },
    dealbreakers: { fumeur: false, fumeur_ok: true, animaux: false, animaux_ok: true, ...dealbreakers },
    completed_at: new Date().toISOString(),
    ...(budget_min != null ? { budget_min } : {}),
  }
}

function show(label: string, a: MatchingData | null, b: MatchingData | null) {
  const r = computeCompatibility(a, b)
  console.log(`\n── ${label} ──`)
  if (!r) { console.log('   → null (test non complété)'); return }
  console.log(`   Score global : ${r.score}%`)
  for (const d of DIMENSIONS) console.log(`   ${DIMENSION_LABELS[d].padEnd(26)} ${r.dimensions[d]}%`)
  if (r.conflicts.length) console.log(`   ⚠ Conflits dealbreakers : ${r.conflicts.join(', ')}`)
}

// Jumeaux parfaits → 100%
show('Jumeaux parfaits', makeData([66, 83, 50, 75, 40]), makeData([66, 83, 50, 75, 40]))

// Opposés → très bas
show('Opposés complets', makeData([0, 100, 0, 100, 0]), makeData([100, 0, 100, 0, 100]))

// Proches avec conflit fumeur → malus -25
show(
  'Compatibles mais conflit fumeur',
  makeData([60, 70, 50, 60, 50], { fumeur: true }),
  makeData([65, 75, 55, 65, 45], { fumeur_ok: false })
)

// Conflit animaux → malus -15
show(
  'Conflit animaux',
  makeData([60, 70, 50, 60, 50], { animaux: true }),
  makeData([65, 75, 55, 65, 45], { animaux_ok: false })
)

// Test non complété → null
show('Test manquant', makeData([50, 50, 50, 50, 50]), null)

// Ancienne structure vectorielle → null (pas de faux score)
const legacy = { lifestyle: { proprete: 0.8 }, constraints: { fumeur: false } } as unknown as MatchingData
show('Ancien matching_data (vectoriel)', makeData([50, 50, 50, 50, 50]), legacy)

// Budget
console.log('\n── Budget overlap ──')
console.log('   [400-800] vs [500-900]  →', computeBudgetOverlap(400, 800, 500, 900), '%')
console.log('   [400-600] vs [700-900]  →', computeBudgetOverlap(400, 600, 700, 900), '%')
console.log('   [400-600] vs [1300-1500]→', computeBudgetOverlap(400, 600, 1300, 1500), '%')
console.log('   identiques              →', computeBudgetOverlap(400, 800, 400, 800), '%')

// Mapping 4 barres UI
const rA = computeCompatibility(makeData([66, 83, 50, 75, 40]), makeData([50, 90, 60, 60, 55]))!
console.log('\n── Barres UI ──')
console.log('  ', toUiBreakdown(rA, computeBudgetOverlap(400, 800, 500, 900)))

// buildMatchingData depuis des réponses de quiz
const md = buildMatchingData(
  { q1: 33, q2: 33, q3: 0, q4: 100, q5: 66, q6: 100, q7: 33, q8: 66, q9: 33, q10: 66, q11: 66, q12: 100, q13: 33, q14: 33, q15: 66 },
  { d_fumeur: 3, d_animaux: 2 },
  450
)
console.log('\n── buildMatchingData ──')
console.log('   scores       :', md.scores)
console.log('   dealbreakers :', md.dealbreakers)

// profilesCompatibility (profils complets)
const pc = profilesCompatibility(
  { matching_data: makeData([66, 83, 50, 75, 40], {}, 400), budget_max: 800 },
  { matching_data: makeData([50, 90, 60, 60, 55], {}, 500), budget_max: 900 }
)
console.log('\n── profilesCompatibility ──')
console.log('  ', pc)
