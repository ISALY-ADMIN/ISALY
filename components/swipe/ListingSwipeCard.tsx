'use client'

import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { Bookmark } from 'lucide-react'
import { ReliabilityBadge } from '@/components/ui/ReliabilityScore'
import Emoji from '@/components/ui/Emoji'
import { getAvatarColor, getInitials, formatAvailability } from '@/lib/utils'
import { colocCardState } from '@/lib/colocMatching'
import type { DimensionScores } from '@/lib/matching'
import type { RoommateScoreView } from '@/components/swipe/ColocScoreModal'

/**
 * Carte de swipe LOGEMENT — la seule carte de la page « Trouver ».
 *
 * Habillage conforme à la maquette : carte claire, photo pleine en haut sans
 * rien par-dessus, puis deux sections séparées par une étiquette centrée —
 * « Infos appart », puis « Infos coloc ».
 *
 * Le bloc « Infos coloc » a deux variantes, dictées par l'état réel du
 * logement et non par un réglage d'affichage :
 *
 *   A. Occupé — au moins un colocataire rattaché à un bail actif. Remplissage
 *      X/Y, avatars des profils en place, pastille verte cliquable portant la
 *      moyenne du visiteur avec chacun d'eux.
 *   B. Vide — aucun colocataire. Aucun algorithme n'est lancé : on candidate
 *      directement.
 *
 * Cas intermédiaire assumé : des occupants déclarés par le loueur mais aucun
 * rattaché à un bail ISALY. Ils existent, donc le logement n'est pas « vide »,
 * mais rien ne permet de les scorer — la carte le dit au lieu d'afficher 0 %
 * ou de faire passer le logement pour libre.
 *
 * L'ancienne carte profil-à-profil (components/swipe/SwipeCard.tsx) n'est pas
 * touchée : elle reste intacte et fonctionnelle pour le jour où le swipe de
 * profils sera tranché.
 */

// [HIDDEN - MAQUETTE SWIPE] La maquette impose une photo « bloc visuel pur » :
// aucun texte, badge ni bouton par-dessus. Les surcouches qui vivaient sur la
// photo (favori, badge de fiabilité du loueur, pastille « Complet », segments
// de progression et chevrons du carrousel) sont donc retirées du rendu, pas
// supprimées : le code est conservé ci-dessous derrière ce drapeau, ainsi que
// le handler `toggleFavorite`. Repasser à true les réaffiche à l'identique.
//
// Ce qui survit sans surcouche visible : la navigation photo par zones de tap
// invisibles et la touche Espace (`nextPhoto`), et l'information « complet »,
// toujours lisible dans « Remplissage : X/Y ».
const SHOW_PHOTO_OVERLAYS: boolean = false

export interface SwipeListing {
  id: string
  title: string
  city: string
  neighborhood: string | null
  /** Loyer mensuel de l'annonce, en euros. */
  rent: number
  surface: number | null
  roomsAvailable: number | null
  /** Date ISO 'YYYY-MM-DD' (listings.available_from) ; null = non renseignée. */
  availableFrom: string | null
  meuble: boolean | null
  animauxOk: boolean | null
  nonFumeur: boolean | null
  photos: string[]
  ownerId: string | null
  description: string
  /** Places déclarées par le loueur (listings.occupants_current / capacity_total). */
  occupancy: { current: number; total: number }
  boostTier?: string | null
}

export interface ListingColocView {
  roommates: RoommateScoreView[]
  averageScore: number | null
  averageDimensions: DimensionScores | null
  unscoredCount: number
}

export type SwipeDirection = 'left' | 'right' | 'super'

export interface ListingSwipeCardHandle {
  swipe: (dir: SwipeDirection) => void
  nextPhoto: () => void
  toggleDetails: () => void
}

interface Props {
  listing: SwipeListing
  coloc: ListingColocView | null
  /** Les colocataires sont encore en cours de chargement. */
  colocLoading: boolean
  onSwipe: (direction: SwipeDirection) => void
  /** Clic sur la pastille de score (variante A uniquement). */
  onOpenScore: () => void
  /** Candidature directe (variante B). */
  onApply: () => void
}

const SWIPE_THRESHOLD = 120
const SPRING_BACK = { type: 'spring' as const, stiffness: 300, damping: 20 }
const OUTFIT = "'Outfit', sans-serif"

// ── Palette de la maquette ────────────────────────────────────────
/** Fond clair de la carte, qui la détache du fond très sombre de la page. */
const CARD_BG = '#E8E4E2'
/** Taupe des blocs d'information et des étiquettes de section. */
const PANEL = '#6D6260'
const PANEL_TEXT = '#FFFFFF'
const RULE = 'rgba(0,0,0,0.13)'
/** Vert de la pastille de compatibilité. */
const SCORE_GREEN = '#4ADE80'

function Stamp({ label, color, rotate }: { label: string; color: string; rotate: number }) {
  return (
    <div
      style={{
        border: `4px solid ${color}`, color, padding: '6px 20px', borderRadius: 10,
        fontSize: 30, fontWeight: 900, letterSpacing: 4, fontFamily: OUTFIT,
        transform: `rotate(${rotate}deg)`, background: 'rgba(255,255,255,0.35)',
        textShadow: '0 2px 12px rgba(0,0,0,0.25)',
      }}
    >
      {label}
    </div>
  )
}

/** Barre fine coupée par une étiquette centrée — séparateur de la maquette. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5" aria-hidden="false">
      <span className="flex-1" style={{ height: 1, background: RULE }} />
      <span
        style={{
          background: PANEL, color: PANEL_TEXT, fontFamily: OUTFIT,
          fontSize: 11.5, fontWeight: 600, letterSpacing: 0.2,
          padding: '3px 16px', borderRadius: 7, whiteSpace: 'nowrap',
        }}
      >
        {children}
      </span>
      <span className="flex-1" style={{ height: 1, background: RULE }} />
    </div>
  )
}

/** Bloc d'information taupe, coins arrondis — conteneur des deux sections. */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: PANEL, color: PANEL_TEXT, borderRadius: 12,
        padding: '10px 14px',
      }}
    >
      {children}
    </div>
  )
}

/** Avatars des colocataires déjà en place, empilés. */
function RoommateStack({ roommates }: { roommates: RoommateScoreView[] }) {
  const shown = roommates.slice(0, 4)
  const extra = roommates.length - shown.length
  return (
    <div className="flex items-center">
      {shown.map((r, i) => (
        <div
          key={r.id}
          className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
          style={{
            width: 28, height: 28, marginLeft: i === 0 ? 0 : -8,
            border: `2px solid ${PANEL}`, zIndex: shown.length - i,
            background: getAvatarColor(r.name),
            fontFamily: OUTFIT, fontSize: 10, fontWeight: 800, color: '#fff',
          }}
          title={r.name}
        >
          {r.avatarUrl
            ? <Image src={r.avatarUrl} alt="" width={28} height={28} className="w-full h-full object-cover" />
            : getInitials(r.name.split(' ')[0], r.name.split(' ')[1])}
        </div>
      ))}
      {extra > 0 && (
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            width: 28, height: 28, marginLeft: -8, border: `2px solid ${PANEL}`,
            background: 'rgba(255,255,255,0.22)', fontFamily: OUTFIT,
            fontSize: 10, fontWeight: 800, color: '#fff',
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  )
}

const ListingSwipeCard = forwardRef<ListingSwipeCardHandle, Props>(function ListingSwipeCard(
  { listing, coloc, colocLoading, onSwipe, onOpenScore, onApply },
  ref,
) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-280, 280], [-12, 12])
  const likeOpacity = useTransform(x, [30, SWIPE_THRESHOLD], [0, 1])
  const nopeOpacity = useTransform(x, [-SWIPE_THRESHOLD, -30], [1, 0])
  const superOpacity = useTransform(y, [-SWIPE_THRESHOLD - 20, -40], [1, 0])

  const [exiting, setExiting] = useState<SwipeDirection | null>(null)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [photoError, setPhotoError] = useState<Record<number, boolean>>({})
  const [showDescription, setShowDescription] = useState(false)
  const [saved, setSaved] = useState(false)
  const isDragging = useRef(false)

  const photos = listing.photos.filter(Boolean)
  const currentPhoto = photos[photoIndex] && !photoError[photoIndex] ? photos[photoIndex] : null

  function fly(dir: SwipeDirection) {
    if (exiting) return
    setExiting(dir)
    if (dir === 'super') {
      animate(y, -700, { duration: 0.35, ease: 'easeOut' })
    } else {
      animate(x, dir === 'right' ? 620 : -620, { duration: 0.35, ease: 'easeOut' })
      animate(y, 40, { duration: 0.35, ease: 'easeOut' })
    }
    onSwipe(dir)
  }

  useImperativeHandle(ref, () => ({
    swipe: fly,
    nextPhoto: () => goPhoto(1),
    toggleDetails: () => setShowDescription(s => !s),
  }))

  function goPhoto(delta: number) {
    if (photos.length < 2) return
    setPhotoIndex(i => (i + delta + photos.length) % photos.length)
  }

  function handleDragEnd(_: unknown, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) {
    setTimeout(() => { isDragging.current = false }, 60)
    if (exiting) return
    const { offset, velocity } = info
    if (offset.y < -SWIPE_THRESHOLD && Math.abs(offset.y) > Math.abs(offset.x)) fly('super')
    else if (offset.x > SWIPE_THRESHOLD || velocity.x > 800) fly('right')
    else if (offset.x < -SWIPE_THRESHOLD || velocity.x < -800) fly('left')
    else {
      animate(x, 0, SPRING_BACK)
      animate(y, 0, SPRING_BACK)
    }
  }

  async function toggleFavorite() {
    setSaved(s => !s)
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_id: listing.id, target_type: 'listing' }),
    }).catch(() => {})
  }

  // ── État du logement (règle isolée dans lib/colocMatching.ts) ──
  const roommates = coloc?.roommates ?? []
  const state = colocCardState({
    identifiedRoommates: roommates.length,
    declaredOccupants: listing.occupancy.current,
  })
  const occupied = state === 'occupied'
  const undisclosedOccupants = state === 'undisclosed'

  const placesLeft = Math.max(0, listing.occupancy.total - listing.occupancy.current)

  // « Autres infos » : uniquement les champs renseignés, séparés par un point
  // milieu. Un champ vide ne laisse ni tiret ni séparateur orphelin.
  const facts = [
    listing.surface && listing.surface > 0 ? `${listing.surface} m²` : null,
    listing.roomsAvailable && listing.roomsAvailable > 0
      ? `${listing.roomsAvailable} chambre${listing.roomsAvailable > 1 ? 's' : ''}`
      : null,
    listing.meuble !== null ? (listing.meuble ? 'Meublé' : 'Non meublé') : null,
    formatAvailability(listing.availableFrom, 'short'),
    listing.animauxOk === true ? 'Animaux OK' : null,
    listing.nonFumeur === true ? 'Non-fumeur' : null,
  ].filter(Boolean) as string[]

  const place = listing.neighborhood ? `${listing.city} · ${listing.neighborhood}` : listing.city

  return (
    <motion.div
      className="absolute inset-0 group select-none"
      style={{ x, y, rotate, cursor: exiting ? 'default' : 'grab', touchAction: 'none' }}
      drag={!exiting}
      dragElastic={0.9}
      dragMomentum={false}
      whileDrag={{ cursor: 'grabbing' }}
      onDragStart={() => { isDragging.current = true }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, y: 12, opacity: 0.6 }}
      animate={{ scale: 1, y: 0, opacity: exiting ? 0 : 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24, opacity: { duration: 0.32, delay: exiting ? 0.08 : 0 } }}
    >
      <div
        className="relative w-full h-full flex flex-col overflow-hidden"
        style={{
          borderRadius: 24,
          background: CARD_BG,
          boxShadow: '0 24px 70px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.3)',
        }}
      >
        {/* ═══════════ Bloc photo ═══════════ */}
        {/* Bloc visuel pur : rien n'est écrit ni posé par-dessus (maquette). */}
        <div className="relative flex-shrink-0" style={{ height: '47%', minHeight: 180 }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #CFCAC7 0%, #A9A29E 100%)' }} />
          {!currentPhoto && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ fontSize: 76 }}>
              <Emoji native="🏠" />
            </div>
          )}
          {currentPhoto && (
            <Image
              src={currentPhoto}
              alt={listing.title}
              fill
              priority={photoIndex === 0}
              sizes="(max-width: 768px) 92vw, 460px"
              className="object-cover"
              draggable={false}
              onError={() => setPhotoError(e => ({ ...e, [photoIndex]: true }))}
            />
          )}

          {/* Navigation photo : zones de tap invisibles, aucun élément visible.
              La touche Espace fait la même chose via `nextPhoto`. */}
          {photos.length > 1 && (
            <>
              <div className="absolute left-0 top-0 bottom-0 w-[30%] z-10" onClick={() => { if (!isDragging.current) goPhoto(-1) }} />
              <div className="absolute right-0 top-0 bottom-0 w-[30%] z-10" onClick={() => { if (!isDragging.current) goPhoto(1) }} />
            </>
          )}

          {/* [HIDDEN - MAQUETTE SWIPE] Surcouches photo, conservées telles quelles. */}
          {SHOW_PHOTO_OVERLAYS && (
            <>
              {photos.length > 1 && (
                <div className="absolute top-3 inset-x-3 flex gap-1.5 z-20">
                  {photos.map((_, i) => (
                    <div key={i} className="flex-1 rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(255,255,255,0.25)' }}>
                      <div style={{ height: '100%', width: i === photoIndex ? '100%' : '0%', background: '#10B981', transition: 'width 0.2s' }} />
                    </div>
                  ))}
                </div>
              )}
              <div className="absolute z-20 flex items-center gap-2" style={{ top: 14, left: 14 }}>
                {listing.ownerId && <ReliabilityBadge userId={listing.ownerId} size={26} />}
                {placesLeft <= 0 && (
                  <span
                    style={{
                      fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 10,
                      background: 'rgba(156,163,175,0.25)', color: '#D1D5DB', border: '1px solid rgba(156,163,175,0.4)',
                    }}
                  >
                    Complet
                  </span>
                )}
              </div>
              <button
                onClick={toggleFavorite}
                className="absolute z-20 flex items-center justify-center w-9 h-9 rounded-full border-none cursor-pointer transition-all"
                style={{
                  top: 14, right: 14,
                  background: saved ? 'rgba(16,185,129,0.9)' : 'rgba(0,0,0,0.4)',
                  color: '#fff', backdropFilter: 'blur(4px)',
                }}
                aria-label={saved ? 'Retirer des favoris' : 'Sauvegarder'}
              >
                <Bookmark size={16} fill={saved ? '#fff' : 'none'} />
              </button>
            </>
          )}
        </div>

        {/* ═══════════ Corps ═══════════ */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4 flex flex-col gap-2.5">

          {/* ── Infos appart ── */}
          <SectionLabel>Infos appart</SectionLabel>
          <Panel>
            <div className="flex items-baseline justify-between gap-3" style={{ fontSize: 13, fontWeight: 600 }}>
              <span className="truncate">Lieu : {place}</span>
              {listing.rent > 0 && (
                <span className="flex-shrink-0">Prix : {listing.rent}€/mois TTC</span>
              )}
            </div>
            {facts.length > 0 && (
              <div className="mt-1.5" style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.88)' }}>
                Autres infos : {facts.join(' · ')}
              </div>
            )}
            {showDescription && listing.description && (
              <p className="mt-2" style={{ fontSize: 12, lineHeight: 1.55, color: 'rgba(255,255,255,0.8)' }}>
                {listing.description}
              </p>
            )}
          </Panel>

          {/* ── Infos coloc ── */}
          <SectionLabel>Infos coloc</SectionLabel>
          <Panel>
            {colocLoading ? (
              <div className="flex items-center gap-2" style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)' }}>
                <span className="inline-block rounded-full animate-pulse" style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.2)' }} />
                Chargement des colocataires…
              </div>
            ) : occupied ? (
              /* ══ Variante A — logement occupé ══ */
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    Remplissage : {listing.occupancy.current}/{listing.occupancy.total}
                  </span>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Profil actuel :</span>
                    <RoommateStack roommates={roommates} />
                  </div>
                </div>

                <button
                  onClick={() => { if (!isDragging.current) onOpenScore() }}
                  className="flex items-center justify-center rounded-full border-none cursor-pointer flex-shrink-0 transition-transform active:scale-95"
                  style={{
                    width: 52, height: 52,
                    background: coloc?.averageScore != null ? SCORE_GREEN : 'rgba(255,255,255,0.22)',
                    fontFamily: OUTFIT, fontSize: coloc?.averageScore != null ? 15 : 18,
                    fontWeight: 800, color: '#fff',
                  }}
                  aria-label="Voir le détail de la compatibilité"
                  title="Voir le détail de la compatibilité"
                >
                  {coloc?.averageScore != null ? `${coloc.averageScore}%` : '?'}
                </button>
              </div>
            ) : (
              /* ══ Variante B — logement vide (ou colocataires hors ISALY) ══ */
              <div className="flex flex-col gap-2.5">
                <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                  {undisclosedOccupants ? (
                    <>
                      Le loueur déclare {listing.occupancy.current} personnes sur place, mais aucune
                      n’est rattachée à un bail ISALY — pas de score de compatibilité possible.
                    </>
                  ) : (
                    <>Aucun colocataire pour l’instant — sois le premier à postuler.</>
                  )}
                </p>
                <button
                  onClick={() => { if (!isDragging.current) onApply() }}
                  className="w-full border-none cursor-pointer transition-transform active:scale-[0.98]"
                  style={{
                    padding: 10, borderRadius: 10, fontSize: 13.5, fontWeight: 700,
                    fontFamily: OUTFIT, color: '#1F2A24', background: SCORE_GREEN,
                  }}
                >
                  Postuler
                </button>
              </div>
            )}
          </Panel>

          {coloc?.averageScore == null && occupied && (
            <p style={{ fontSize: 11.5, lineHeight: 1.45, color: 'rgba(0,0,0,0.45)' }}>
              Score indisponible tant que le questionnaire de compatibilité n’est pas complété
              des deux côtés.
            </p>
          )}
        </div>

        {/* ── Tampons de swipe ──
            Sous la photo, qui doit rester vierge : retour visuel du geste
            uniquement, jamais affiché au repos. */}
        <div className="absolute inset-x-0 z-30 pointer-events-none flex items-center justify-center" style={{ top: '47%', bottom: 0 }}>
          <motion.div className="absolute" style={{ opacity: likeOpacity }}>
            <Stamp label="J'ADORE" color="#10B981" rotate={-12} />
          </motion.div>
          <motion.div className="absolute" style={{ opacity: nopeOpacity }}>
            <Stamp label="PASSE" color="#EF4444" rotate={12} />
          </motion.div>
          <motion.div className="absolute" style={{ opacity: superOpacity }}>
            <Stamp label="★ SUPER" color="#F59E0B" rotate={-6} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
})

export default ListingSwipeCard
