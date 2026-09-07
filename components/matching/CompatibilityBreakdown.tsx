'use client'

import { DIMENSIONS, DIMENSION_LABELS, type DimensionScores } from '@/lib/matching'

/**
 * Détail d'un score de compatibilité, dimension par dimension.
 *
 * Les catégories affichées sont celles du moteur réel (lib/matching.ts) —
 * rythme de vie, propreté, sociabilité, calme, partage — et pas un découpage
 * inventé pour l'écran. « Heure de coucher » relève du rythme de vie : c'est
 * l'une des trois questions qui composent cette dimension.
 *
 * Partagé par la modale de score du swipe (moyenne des colocataires) et par la
 * fiche profil (une seule personne) : même lecture des deux côtés.
 */

const DIMENSION_COLORS: Record<string, string> = {
  rythme: '#10B981',
  proprete: '#6366F1',
  sociabilite: '#F59E0B',
  calme: '#38BDF8',
  partage: '#EC4899',
}

/** Sous-titre : ce que la dimension recouvre concrètement, en une ligne. */
const DIMENSION_HINTS: Record<string, string> = {
  rythme: 'Heure de coucher, réveil, présence en journée',
  proprete: 'Vaisselle, ménage des communs, rangement',
  sociabilite: 'Amis à la maison, vie commune, soirées',
  calme: 'Musique, bruit après 22h, besoin de silence',
  partage: 'Courses, repas, prêt des affaires',
}

const CONFLICT_LABELS: Record<string, string> = {
  fumeur: 'Tabac : incompatibilité déclarée',
  animaux: 'Animaux : incompatibilité déclarée',
}

interface Props {
  dimensions: DimensionScores
  conflicts?: string[]
  /** Affiche le rappel de ce que couvre chaque dimension. */
  withHints?: boolean
}

export default function CompatibilityBreakdown({ dimensions, conflicts = [], withHints = true }: Props) {
  return (
    <div className="flex flex-col gap-3.5">
      {DIMENSIONS.map(dim => {
        const value = dimensions[dim]
        const color = DIMENSION_COLORS[dim]
        return (
          <div key={dim}>
            <div className="flex justify-between items-baseline gap-3 mb-1">
              <span className="text-[13px] font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {DIMENSION_LABELS[dim]}
              </span>
              <span className="text-[13px] font-extrabold flex-shrink-0" style={{ color, fontFamily: "'Outfit', sans-serif" }}>
                {value}%
              </span>
            </div>
            {withHints && (
              <div className="text-[11px] mb-1.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {DIMENSION_HINTS[dim]}
              </div>
            )}
            <div className="rounded-full overflow-hidden" style={{ height: 4, background: 'rgba(255,255,255,0.1)' }}>
              <div style={{ height: '100%', width: `${value}%`, background: color, transition: 'width 0.6s ease' }} />
            </div>
          </div>
        )
      })}

      {conflicts.length > 0 && (
        <div
          className="flex flex-col gap-1 mt-1 p-3 rounded-[12px]"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          {conflicts.map(c => (
            <span key={c} className="text-[12px] font-semibold" style={{ color: '#FCA5A5' }}>
              {CONFLICT_LABELS[c] ?? c}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
