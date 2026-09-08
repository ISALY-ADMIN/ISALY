'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { X, ChevronRight, Users } from 'lucide-react'
import CompatibilityBreakdown from '@/components/matching/CompatibilityBreakdown'
import { getAvatarColor, getInitials } from '@/lib/utils'
import type { DimensionScores } from '@/lib/matching'

/**
 * Détail du score d'une colocation occupée (E3).
 *
 * Deux niveaux de lecture :
 *   1. la moyenne par dimension sur l'ensemble des colocataires en place ;
 *   2. chaque colocataire avec SON score global, cliquable vers sa fiche.
 *
 * Ouverte au clic sur le badge de score de la carte. Sur une colocation vide,
 * ce badge n'existe pas : il n'y a rien à détailler.
 */

export interface RoommateScoreView {
  id: string
  name: string
  avatarUrl: string | null
  score: number | null
  dimensions: DimensionScores | null
}

interface Props {
  listingTitle: string
  averageScore: number | null
  averageDimensions: DimensionScores | null
  roommates: RoommateScoreView[]
  onClose: () => void
}

export default function ColocScoreModal({
  listingTitle,
  averageScore,
  averageDimensions,
  roommates,
  onClose,
}: Props) {
  const router = useRouter()
  const scoredCount = roommates.filter(r => r.score !== null).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Détail de la compatibilité avec les colocataires"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="w-full flex flex-col overflow-hidden"
        style={{
          maxWidth: 460,
          maxHeight: '86vh',
          background: '#111111',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        }}
      >
        {/* ── En-tête ── */}
        <div
          className="flex items-start justify-between gap-3 flex-shrink-0"
          style={{ padding: '20px 22px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Compatibilité avec la coloc
            </div>
            <div
              className="text-[17px] font-bold truncate"
              style={{ fontFamily: "'Outfit', sans-serif", color: '#fff' }}
            >
              {listingTitle}
            </div>
            <div className="flex items-center gap-1.5 text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <Users size={12} />
              {scoredCount > 0
                ? `Moyenne sur ${scoredCount} colocataire${scoredCount > 1 ? 's' : ''} en place`
                : 'Aucun score calculable pour l’instant'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-full border-none cursor-pointer flex-shrink-0"
            style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' }}
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ padding: '20px 22px 24px' }}>
          {/* ── Score global ── */}
          {averageScore !== null && (
            <div
              className="flex items-center justify-center gap-3 mb-6 py-4 rounded-[16px]"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              <span
                style={{ fontFamily: "'Outfit', sans-serif", fontSize: 40, fontWeight: 800, color: '#10B981', lineHeight: 1 }}
              >
                {averageScore}%
              </span>
              <span className="text-[12.5px] leading-snug" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 150 }}>
                de compatibilité moyenne avec la colocation
              </span>
            </div>
          )}

          {/* ── Détail par catégorie ── */}
          {averageDimensions ? (
            <>
              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Le détail, catégorie par catégorie
              </h3>
              <CompatibilityBreakdown dimensions={averageDimensions} />
            </>
          ) : (
            <p className="text-[13px] leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Le score demande que toi et les colocataires ayez répondu au questionnaire de
              compatibilité. Tant que ce n’est pas le cas, aucun pourcentage n’est affiché —
              plutôt que d’en inventer un.
            </p>
          )}

          {/* ── Colocataire par colocataire ── */}
          <h3 className="text-[11px] font-bold uppercase tracking-wider mt-7 mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Les colocataires en place
          </h3>
          <div className="flex flex-col gap-2">
            {roommates.map(r => (
              <button
                key={r.id}
                onClick={() => router.push(`/app/profil-public/${r.id}`)}
                className="flex items-center gap-3 p-2.5 rounded-[14px] text-left cursor-pointer border-none w-full transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              >
                {r.avatarUrl ? (
                  <Image
                    src={r.avatarUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-extrabold text-white"
                    style={{ background: getAvatarColor(r.name) }}
                  >
                    {getInitials(r.name.split(' ')[0], r.name.split(' ')[1])}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold truncate" style={{ color: '#fff' }}>
                    {r.name}
                  </div>
                  <div className="text-[11.5px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {r.score !== null ? 'Voir son profil et le détail' : 'Questionnaire non complété'}
                  </div>
                </div>
                <span
                  className="text-[14px] font-extrabold flex-shrink-0"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    color: r.score !== null ? '#10B981' : 'rgba(255,255,255,0.35)',
                  }}
                >
                  {r.score !== null ? `${r.score}%` : '—'}
                </span>
                <ChevronRight size={16} color="rgba(255,255,255,0.3)" className="flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
