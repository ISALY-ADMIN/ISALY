/**
 * Agrégation des scores d'une colocation, et état de la carte de swipe.
 *
 * Extrait de la route et du composant pour être testable seul : ce sont les
 * deux règles qui décident ce que voit l'utilisateur sur la page « Trouver ».
 * Fonctions pures, aucune dépendance à Supabase ni à React.
 */

import { DIMENSIONS, type DimensionScores } from '@/lib/matching'

export interface ScoredRoommate {
  /** null = l'un des deux questionnaires n'est pas complété. */
  score: number | null
  dimensions: DimensionScores | null
}

export interface ColocAggregate {
  /** Moyenne des scores calculables ; null si aucun ne l'est. */
  averageScore: number | null
  /** Moyenne par dimension, sur les mêmes colocataires. */
  averageDimensions: DimensionScores | null
  /** Colocataires en place dont le score n'est pas calculable. */
  unscoredCount: number
}

/** Moyenne dimension par dimension. Liste vide → null, jamais 0. */
export function averageDimensionScores(list: DimensionScores[]): DimensionScores | null {
  if (list.length === 0) return null
  const out = {} as DimensionScores
  for (const dim of DIMENSIONS) {
    out[dim] = Math.round(list.reduce((s, d) => s + d[dim], 0) / list.length)
  }
  return out
}

/**
 * Score de la colocation = moyenne du score du visiteur avec CHAQUE
 * colocataire en place.
 *
 * Les colocataires sans score ne tirent pas la moyenne vers le bas : ils sont
 * exclus du calcul et comptés à part. Un test non complété n'est pas une
 * incompatibilité, c'est une absence d'information — la compter comme un 0
 * afficherait un faux pourcentage.
 */
export function aggregateColocScores(roommates: ScoredRoommate[]): ColocAggregate {
  const scored = roommates.filter(
    (r): r is { score: number; dimensions: DimensionScores } =>
      r.score !== null && r.dimensions !== null,
  )

  if (scored.length === 0) {
    return { averageScore: null, averageDimensions: null, unscoredCount: roommates.length }
  }

  return {
    averageScore: Math.round(scored.reduce((s, r) => s + r.score, 0) / scored.length),
    averageDimensions: averageDimensionScores(scored.map(r => r.dimensions)),
    unscoredCount: roommates.length - scored.length,
  }
}

/**
 * État du bloc « Infos coloc » de la carte.
 *
 *   'occupied'    → variante A : remplissage, avatars, badge de score cliquable.
 *   'empty'       → variante B : personne sur place, candidature directe.
 *   'undisclosed' → occupants annoncés par le loueur mais aucun rattaché à un
 *                   bail ISALY : ni vide, ni scorable. Cas distinct pour ne pas
 *                   faire passer une coloc habitée pour un logement libre.
 *
 * `declaredOccupants` vient de listings.occupants_current, qui vaut 1 par
 * défaut (migration 26) : seul un chiffre > 1 traduit une déclaration explicite
 * du loueur, d'où le seuil.
 */
export function colocCardState(input: {
  identifiedRoommates: number
  declaredOccupants: number
}): 'occupied' | 'empty' | 'undisclosed' {
  if (input.identifiedRoommates > 0) return 'occupied'
  if (input.declaredOccupants > 1) return 'undisclosed'
  return 'empty'
}
