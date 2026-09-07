'use client'

import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { ChevronLeft, ChevronRight, Bookmark, MapPin, Users, Ruler, DoorOpen, Sofa } from 'lucide-react'
import { ReliabilityBadge } from '@/components/ui/ReliabilityScore'
import Emoji from '@/components/ui/Emoji'
import { getAvatarColor, getInitials } from '@/lib/utils'
import { colocCardState } from '@/lib/colocMatching'
import type { DimensionScores } from '@/lib/matching'
import type { RoommateScoreView } from '@/components/swipe/ColocScoreModal'

/**
 * Carte de swipe LOGEMENT — la seule carte de la page « Trouver ».
 *
 * Trois blocs, dans l'ordre de la maquette : photo, « Infos appart »,
 * « Infos coloc ». Ce dernier a deux variantes, dictées par l'état réel du
 * logement et non par un réglage d'affichage :
 *
 *   A. Occupé — au moins un colocataire rattaché à un bail actif. Remplissage
 *      X/Y, avatars empilés, badge de score cliquable (moyenne du visiteur avec
 *      chacun des colocataires en place).
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

export interface SwipeListing {
  id: string
  title: string
  city: string
  neighborhood: string | null
  /** Loyer mensuel de l'annonce, en euros. */
  rent: number
  surface: number | null
  roomsAvailable: number | null
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
  /** Clic sur le badge de score (variante A uniquement). */
  onOpenScore: () => void
  /** Candidature directe (variante B, et bouton secondaire en variante A). */
  onApply: () => void
}

const SWIPE_THRESHOLD = 120
const SPRING_BACK = { type: 'spring' as const, stiffness: 300, damping: 20 }
const OUTFIT = "'Outfit', sans-serif"

function Stamp({ label, color, rotate }: { label: string; color: string; rotate: number }) {
  return (
    <div
      style={{
        border: `4px solid ${color}`, color, padding: '6px 20px', borderRadius: 10,
        fontSize: 30, fontWeight: 900, letterSpacing: 4, fontFamily: OUTFIT,
        transform: `rotate(${rotate}deg)`, background: 'rgba(0,0,0,0.15)',
        textShadow: '0 2px 12px rgba(0,0,0,0.4)',
      }}
    >
      {label}
    </div>
  )
}

/** Avatars empilés des colocataires en place. */
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
            width: 34, height: 34, marginLeft: i === 0 ? 0 : -10,
            border: '2px solid #111111', zIndex: shown.length - i,
            background: getAvatarColor(r.name),
            fontFamily: OUTFIT, fontSize: 12, fontWeight: 800, color: '#fff',
          }}
          title={r.name}
        >
          {r.avatarUrl
            ? <Image src={r.avatarUrl} alt="" width={34} height={34} className="w-full h-full object-cover" />
            : getInitials(r.name.split(' ')[0], r.name.split(' ')[1])}
        </div>
      ))}
      {extra > 0 && (
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            width: 34, height: 34, marginLeft: -10, border: '2px solid #111111',
            background: 'rgba(255,255,255,0.14)', fontFamily: OUTFIT,
            fontSize: 11.5, fontWeight: 800, color: 'rgba(255,255,255,0.8)',
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

  const facts = [
    listing.surface && listing.surface > 0
      ? { icon: <Ruler size={13} />, label: `${listing.surface} m²` }
      : null,
    listing.roomsAvailable && listing.roomsAvailable > 0
      ? { icon: <DoorOpen size={13} />, label: `${listing.roomsAvailable} chambre${listing.roomsAvailable > 1 ? 's' : ''}` }
      : null,
    listing.meuble !== null
      ? { icon: <Sofa size={13} />, label: listing.meuble ? 'Meublé' : 'Non meublé' }
      : null,
    listing.animauxOk === true ? { icon: <Emoji native="🐾" size="13px" />, label: 'Animaux OK' } : null,
    listing.nonFumeur === true ? { icon: <Emoji native="🚭" size="13px" />, label: 'Non-fumeur' } : null,
  ].filter(Boolean) as Array<{ icon: React.ReactNode; label: string }>

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
          background: '#111111',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 70px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.3)',
        }}
      >
        {/* ═══════════ Bloc photo ═══════════ */}
        <div className="relative flex-shrink-0" style={{ height: '46%', minHeight: 190 }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #0f2e24 0%, #04160f 100%)' }} />
          {!currentPhoto && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ fontSize: 88 }}>
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
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#111111] to-transparent pointer-events-none" />

          {/* Segments (stories) */}
          {photos.length > 1 && (
            <div className="absolute top-3 inset-x-3 flex gap-1.5 z-20">
              {photos.map((_, i) => (
                <div key={i} className="flex-1 rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(255,255,255,0.25)' }}>
                  <div style={{ height: '100%', width: i === photoIndex ? '100%' : '0%', background: '#10B981', transition: 'width 0.2s' }} />
                </div>
              ))}
            </div>
          )}

          {/* Zones de tap + chevrons */}
          {photos.length > 1 && (
            <>
              <div className="absolute left-0 top-0 bottom-0 w-[30%] z-10" onClick={() => { if (!isDragging.current) goPhoto(-1) }} />
              <div className="absolute right-0 top-0 bottom-0 w-[30%] z-10" onClick={() => { if (!isDragging.current) goPhoto(1) }} />
              <button
                onClick={() => goPhoto(-1)}
                className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-9 h-9 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer"
                style={{ background: 'rgba(0,0,0,0.4)', color: '#fff', backdropFilter: 'blur(4px)' }}
                aria-label="Photo précédente"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => goPhoto(1)}
                className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 items-center justify-center w-9 h-9 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer"
                style={{ background: 'rgba(0,0,0,0.4)', color: '#fff', backdropFilter: 'blur(4px)' }}
                aria-label="Photo suivante"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}

          {/* Badges */}
          <div className="absolute z-20 flex items-center gap-2" style={{ top: photos.length > 1 ? 20 : 14, left: 14 }}>
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
              top: photos.length > 1 ? 20 : 14, right: 14,
              background: saved ? 'rgba(16,185,129,0.9)' : 'rgba(0,0,0,0.4)',
              color: '#fff', backdropFilter: 'blur(4px)',
            }}
            aria-label={saved ? 'Retirer des favoris' : 'Sauvegarder'}
          >
            <Bookmark size={16} fill={saved ? '#fff' : 'none'} />
          </button>

          {/* Stamps */}
          <motion.div className="absolute top-10 left-6 z-30 pointer-events-none" style={{ opacity: likeOpacity }}>
            <Stamp label="J'ADORE" color="#10B981" rotate={-12} />
          </motion.div>
          <motion.div className="absolute top-10 right-6 z-30 pointer-events-none" style={{ opacity: nopeOpacity }}>
            <Stamp label="PASSE" color="#EF4444" rotate={12} />
          </motion.div>
          <motion.div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none" style={{ opacity: superOpacity }}>
            <Stamp label="★ SUPER" color="#F59E0B" rotate={-6} />
          </motion.div>
        </div>

        {/* ═══════════ Corps ═══════════ */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-3 pb-4 flex flex-col gap-4">

          {/* ── Infos appart ── */}
          <section>
            <h3 className="text-[10.5px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: 'rgba(255,255,255,0.38)' }}>
              Infos appart
            </h3>
            <h2
              className="truncate mb-1.5"
              style={{ fontFamily: OUTFIT, fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}
            >
              {listing.title}
            </h2>
            <div className="flex items-center gap-1.5 text-[13px] mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <MapPin size={13} className="flex-shrink-0" />
              <span className="truncate">
                {listing.neighborhood ? `${listing.city} · ${listing.neighborhood}` : listing.city}
              </span>
            </div>
            {listing.rent > 0 && (
              <div className="mb-2.5" style={{ fontFamily: OUTFIT, fontSize: 19, fontWeight: 800, color: '#10B981' }}>
                {listing.rent} €/mois{' '}
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>TTC</span>
              </div>
            )}
            {facts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {facts.map(f => (
                  <span
                    key={f.label}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium"
                    style={{
                      padding: '4px 10px', borderRadius: 20,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.75)',
                    }}
                  >
                    <span className="inline-flex" style={{ color: 'rgba(255,255,255,0.5)' }}>{f.icon}</span>
                    {f.label}
                  </span>
                ))}
              </div>
            )}
            {listing.description && (
              <>
                <button
                  onClick={() => setShowDescription(s => !s)}
                  className="mt-2.5 border-none cursor-pointer bg-transparent p-0 text-[12px] font-semibold"
                  style={{ color: '#10B981', fontFamily: OUTFIT }}
                >
                  {showDescription ? 'Masquer la description ▾' : 'Voir la description ▸'}
                </button>
                {showDescription && (
                  <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {listing.description}
                  </p>
                )}
              </>
            )}
          </section>

          {/* ── Infos coloc ── */}
          <section
            className="rounded-[16px] p-3.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <h3 className="text-[10.5px] font-bold uppercase tracking-[0.14em] mb-2.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
              Infos coloc
            </h3>

            {colocLoading ? (
              <div className="flex items-center gap-2 text-[12.5px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                <span className="inline-block rounded-full animate-pulse" style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.08)' }} />
                Chargement des colocataires…
              </div>
            ) : occupied ? (
              /* ══ Variante A — logement occupé ══ */
              <>
                <div className="flex items-center gap-1.5 text-[12.5px] mb-3" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  <Users size={13} />
                  Remplissage :{' '}
                  <strong style={{ color: '#fff', fontFamily: OUTFIT }}>
                    {listing.occupancy.current}/{listing.occupancy.total}
                  </strong>
                  {placesLeft > 0 && (
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                      · {placesLeft} place{placesLeft > 1 ? 's' : ''} libre{placesLeft > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <RoommateStack roommates={roommates} />

                  <button
                    onClick={() => { if (!isDragging.current) onOpenScore() }}
                    className="flex items-center gap-2 border-none cursor-pointer transition-all flex-shrink-0"
                    style={{
                      padding: '8px 14px', borderRadius: 20, fontFamily: OUTFIT,
                      background: coloc?.averageScore != null ? 'rgba(16,185,129,0.16)' : 'rgba(255,255,255,0.07)',
                      border: `1px solid ${coloc?.averageScore != null ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.15)'}`,
                    }}
                    title="Voir le détail de la compatibilité"
                  >
                    <span
                      style={{
                        fontSize: 17, fontWeight: 800,
                        color: coloc?.averageScore != null ? '#10B981' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {coloc?.averageScore != null ? `${coloc.averageScore}%` : '?'}
                    </span>
                    <span className="text-[11.5px] font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      Détail
                    </span>
                  </button>
                </div>

                {coloc?.averageScore == null && (
                  <p className="mt-2.5 text-[11.5px] leading-snug" style={{ color: 'rgba(255,255,255,0.42)' }}>
                    Score indisponible tant que le questionnaire de compatibilité n’est pas complété
                    des deux côtés.
                  </p>
                )}
              </>
            ) : (
              /* ══ Variante B — logement vide (ou colocataires hors ISALY) ══ */
              <>
                <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {undisclosedOccupants ? (
                    <>
                      Le loueur déclare {listing.occupancy.current} personnes sur place, mais aucune
                      n’est encore rattachée à un bail ISALY — pas de score de compatibilité
                      possible pour l’instant.
                    </>
                  ) : (
                    <>
                      Aucun colocataire pour l’instant — sois le premier à postuler.
                    </>
                  )}
                </p>
                <button
                  onClick={() => { if (!isDragging.current) onApply() }}
                  className="w-full flex items-center justify-center gap-2 border-none cursor-pointer"
                  style={{
                    padding: 11, borderRadius: 12, fontSize: 14, fontWeight: 700,
                    fontFamily: OUTFIT, color: '#fff',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
                  }}
                >
                  Postuler
                </button>
              </>
            )}
          </section>
        </div>
      </div>
    </motion.div>
  )
})

export default ListingSwipeCard
