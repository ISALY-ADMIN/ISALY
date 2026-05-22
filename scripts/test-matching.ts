/**
 * Test du moteur de matching ISALY
 * Exécuter avec : npx tsx scripts/test-matching.ts
 */

import { matchingEngine, profileToVector } from '../lib/matching'
import type { Profile } from '../types/database'

// ─── Profils d'exemple ─────────────────────────────────────────────────────────

const alice: Profile = {
  id: 'alice-001',
  email: 'alice@example.com',
  first_name: 'Alice',
  last_name: 'Martin',
  avatar_url: null,
  role: 'locataire',
  city: 'Paris',
  budget_max: 850,
  schedule: 'leve-tot',
  vibe: 'calme',
  passions: ['Sport', 'Lecture', 'Cuisine'],
  bio: 'Dev web, lève-tôt, j\'aime la tranquillité.',
  phone: null,
  profile_complete: 100,
  is_visible: true,
  created_at: new Date().toISOString(),
  matching_data: {
    budget_min: 600,
    genre: 'femme',
    genre_preference: 'mixte',
    lifestyle: {
      proprete: 0.90,
      bruit: 0.10,
      frequence_soirees: 0.10,
      teletravail: 0.80,
    },
    personality: {
      tolerance_conflit: 0.80,
      communication: 0.85,
      besoin_espace: 0.70,
    },
    constraints: {
      fumeur: false,
      accepte_fumeurs: false,
      animaux: false,
      accepte_animaux: true,
    },
    non_negociables: ['proprete', 'bruit'],
  },
}

const bob: Profile = {
  id: 'bob-001',
  email: 'bob@example.com',
  first_name: 'Bob',
  last_name: 'Dupont',
  avatar_url: null,
  role: 'locataire',
  city: 'Paris',
  budget_max: 800,
  schedule: 'leve-tot',
  vibe: 'studieux',
  passions: ['Gaming', 'Sport', 'Voyages'],
  bio: 'Étudiant en master, calme, ordonné.',
  phone: null,
  profile_complete: 100,
  is_visible: true,
  created_at: new Date().toISOString(),
  matching_data: {
    budget_min: 600,
    genre: 'homme',
    lifestyle: {
      proprete: 0.85,
      bruit: 0.15,
      frequence_soirees: 0.20,
      teletravail: 0.30,
    },
    personality: {
      tolerance_conflit: 0.75,
      communication: 0.70,
      besoin_espace: 0.60,
    },
    constraints: {
      fumeur: false,
      accepte_fumeurs: false,
      animaux: false,
      accepte_animaux: true,
    },
    non_negociables: ['proprete'],
  },
}

const charlie: Profile = {
  id: 'charlie-001',
  email: 'charlie@example.com',
  first_name: 'Charlie',
  last_name: 'Leroy',
  avatar_url: null,
  role: 'locataire',
  city: 'Paris',
  budget_max: 1100,
  schedule: 'couche-tard',
  vibe: 'festif',
  passions: ['Musique', 'Gaming', 'Cinéma'],
  bio: 'Barman, noctambule, j\'aime les soirées.',
  phone: null,
  profile_complete: 100,
  is_visible: true,
  created_at: new Date().toISOString(),
  matching_data: {
    budget_min: 900,
    genre: 'homme',
    lifestyle: {
      proprete: 0.40,
      bruit: 0.85,
      frequence_soirees: 0.90,
      teletravail: 0.00,
    },
    personality: {
      tolerance_conflit: 0.50,
      communication: 0.60,
      besoin_espace: 0.20,
    },
    constraints: {
      fumeur: true,
      accepte_fumeurs: true,
      animaux: false,
      accepte_animaux: true,
    },
  },
}

// ─── Run Tests ────────────────────────────────────────────────────────────────

function printResult(label: string, a: Profile, b: Profile) {
  const va = profileToVector(a)
  const vb = profileToVector(b)
  const result = matchingEngine.computeMatchScore(va, vb)

  console.log(`\n${'─'.repeat(56)}`)
  console.log(`  ${label}`)
  console.log(`${'─'.repeat(56)}`)

  if (result.hard_filtered) {
    console.log(`  ❌ HARD FILTERED`)
    console.log(`  Raisons : ${result.filter_reasons?.join(' · ')}`)
    return
  }

  console.log(`  Score global      : ${result.score}%`)
  console.log(`  Mode de vie       : ${result.breakdown.lifestyle}%`)
  console.log(`  Personnalité      : ${result.breakdown.personality}%`)
  console.log(`  Intérêts          : ${result.breakdown.interests}%`)
  console.log(`  Budget            : ${result.breakdown.budget}%`)

  if (result.strengths.length) {
    console.log(`\n  ✅ Points forts :`)
    result.strengths.forEach(s => console.log(`     • ${s}`))
  }
  if (result.risks.length) {
    console.log(`\n  ⚠️  Risques :`)
    result.risks.forEach(r => console.log(`     • ${r}`))
  }

  // explainMatch
  const explain = matchingEngine.explainMatch(va, vb)
  console.log(`\n  explain_match() →`)
  console.log(JSON.stringify(explain, null, 4).split('\n').map(l => '  ' + l).join('\n'))
}

console.log('\n════════════════════════════════════════════════════════')
console.log('  ISALY — Test du moteur de matching avancé')
console.log('════════════════════════════════════════════════════════')

printResult('Alice ↔ Bob   (profils similaires, lève-tôt + calme)', alice, bob)
printResult('Alice ↔ Charlie (profils opposés + hard filter budget)', alice, charlie)
printResult('Bob   ↔ Charlie (hard filter budget + fumeur)', bob, charlie)

console.log(`\n${'─'.repeat(56)}`)
console.log('  rankCandidates() — vue du ranking depuis Alice')
console.log(`${'─'.repeat(56)}`)

const aliceVector = profileToVector(alice)
const ranked = matchingEngine.rankCandidates(aliceVector, [
  { profile: bob, vector: profileToVector(bob) },
  { profile: charlie, vector: profileToVector(charlie) },
])

ranked.forEach((c, i) => {
  console.log(`  ${i + 1}. ${c.profile.first_name} ${c.profile.last_name} — ${c.match.score}%`)
})
if (ranked.length === 0) console.log('  Aucun candidat après hard filters.')

console.log()
