'use client'

import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Bookmark, MessageCircle, MapPin, Users } from 'lucide-react'
import CertificationBadge, { CertLevel } from '@/components/ui/CertificationBadge'
import { ReliabilityBadge } from '@/components/ui/ReliabilityScore'
import Emoji from '@/components/ui/Emoji'
import type { UiBreakdown } from '@/lib/matching'

export interface SwipeProfile {
  id: string
  name: string
  age: number
  job: string
  city: string
  rent: number
  /** Score de compatibilité réel — null si l'un des deux tests n'est pas complété. */
  match: number | null
  /** Sous-scores réels (Mode de vie / Budget / Personnalité / Intérêts). */
  subScores?: UiBreakdown | null
  emoji: string
  color: string
  tags: string[]
  bio: string
  certLevel?: CertLevel
  photoUrl?: string | null
  photos?: string[]
  isListing?: boolean
  ownerId?: string
  /** Places sur l'annonce : X déjà sur place / Y capacité totale. */
  occupancy?: { current: number; total: number } | null
}

export type SwipeDirection = 'left' | 'right' | 'super'

export interface SwipeCardHandle {
  swipe: (dir: SwipeDirection) => void
  nextPhoto: () => void
  toggleDetails: () => void
}

interface SwipeCardProps {
  profile: SwipeProfile
  onSwipe: (direction: SwipeDirection) => void
  onMessage: (name: string) => void
}

const SWIPE_THRESHOLD = 120
const SPRING_BACK = { type: 'spring' as const, stiffness: 300, damping: 20 }

function Stamp({ label, color, rotate, style }: { label: string; color: string; rotate: number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        border: `4px solid ${color}`,
        color,
        padding: '6px 20px',
        borderRadius: '10px',
        fontSize: '34px',
        fontWeight: 900,
        letterSpacing: '4px',
        transform: `rotate(${rotate}deg)`,
        fontFamily: "'Outfit', sans-serif",
        textShadow: '0 2px 12px rgba(0,0,0,0.4)',
        background: 'rgba(0,0,0,0.15)',
        ...style,
      }}
    >
      {label}
    </div>
  )
}

/** Cercle SVG de progression pour le score de compatibilité (null = test non complété) */
function MatchRing({ value }: { value: number | null }) {
  const r = 24
  const c = 2 * Math.PI * r
  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: 60, height: 60 }}
      title={value === null ? 'Test de compatibilité non complété' : `${Math.round(value)}% de compatibilité`}
    >
      <svg width={60} height={60} viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={30} cy={30} r={r} fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.18)" strokeWidth={4} />
        {value !== null && (
          <circle
            cx={30} cy={30} r={r}
            fill="none" stroke="#10B981" strokeWidth={4} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c - (c * Math.min(100, Math.max(0, value))) / 100}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{ fontSize: value === null ? '17px' : '15px', fontWeight: 800, color: value === null ? 'rgba(255,255,255,0.5)' : '#fff', fontFamily: "'Outfit', sans-serif" }}>
          {value === null ? '?' : `${Math.round(value)}%`}
        </span>
      </div>
    </div>
  )
}

const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(function SwipeCard(
  { profile, onSwipe, onMessage },
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
  const [showDetails, setShowDetails] = useState(false)
  const [saved, setSaved] = useState(false)
  const isDragging = useRef(false)

  const photos = (profile.photos && profile.photos.length > 0
    ? profile.photos
    : profile.photoUrl ? [profile.photoUrl] : []
  ).filter(Boolean) as string[]
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
    toggleDetails: () => setShowDetails(s => !s),
  }))

  function goPhoto(delta: number) {
    if (photos.length < 2) return
    setPhotoIndex(i => (i + delta + photos.length) % photos.length)
  }

  function handleDragEnd(_: unknown, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) {
    setTimeout(() => { isDragging.current = false }, 60)
    if (exiting) return
    const { offset, velocity } = info
    if (offset.y < -SWIPE_THRESHOLD && Math.abs(offset.y) > Math.abs(offset.x)) {
      fly('super')
    } else if (offset.x > SWIPE_THRESHOLD || velocity.x > 800) {
      fly('right')
    } else if (offset.x < -SWIPE_THRESHOLD || velocity.x < -800) {
      fly('left')
    } else {
      animate(x, 0, SPRING_BACK)
      animate(y, 0, SPRING_BACK)
    }
  }

  async function toggleFavorite() {
    setSaved(s => !s)
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_id: profile.id, target_type: profile.isListing ? 'listing' : 'profile' }),
    })
  }

  const firstName = profile.isListing ? 'le loueur' : profile.name.split(' ')[0]

  // Sous-scores réels issus du moteur de compatibilité — jamais dérivés artificiellement
  const subScores = profile.subScores
    ? ([
        { label: 'Mode de vie', value: profile.subScores.modeDeVie, color: '#10B981' },
        { label: 'Budget', value: profile.subScores.budget, color: '#6366F1' },
        { label: 'Personnalité', value: profile.subScores.personnalite, color: '#F59E0B' },
        { label: 'Intérêts', value: profile.subScores.interets, color: '#EC4899' },
      ] as Array<{ label: string; value: number | null; color: string }>).filter(s => s.value !== null)
    : null

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
        className="relative w-full h-full overflow-hidden"
        style={{
          borderRadius: '24px',
          background: '#111111',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 70px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.3)',
        }}
      >
        {/* ── Photo plein format ── */}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(160deg, ${profile.color}EE 0%, ${profile.color}66 100%)` }}
        />
        {!currentPhoto && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ fontFamily: "'Outfit', sans-serif", fontSize: '150px', color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}
          >
            {profile.isListing ? <Emoji native="🏠" /> : profile.name[0]}
          </div>
        )}
        {currentPhoto && (
          <Image
            src={currentPhoto}
            alt={profile.name}
            fill
            priority={photoIndex === 0}
            sizes="(max-width: 768px) 92vw, 460px"
            className="object-cover"
            draggable={false}
            onError={() => setPhotoError(e => ({ ...e, [photoIndex]: true }))}
          />
        )}
        {/* Gradient overlay bas */}
        <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

        {/* ── Segments de progression (stories) ── */}
        {photos.length > 1 && (
          <div className="absolute top-3 inset-x-3 flex gap-1.5 z-20">
            {photos.map((_, i) => (
              <div key={i} className="flex-1 rounded-full overflow-hidden" style={{ height: '3px', background: 'rgba(255,255,255,0.25)' }}>
                <div style={{ height: '100%', width: i === photoIndex ? '100%' : '0%', background: '#10B981', transition: 'width 0.2s' }} />
              </div>
            ))}
          </div>
        )}

        {/* ── Tap zones carousel ── */}
        {photos.length > 1 && (
          <>
            <div
              className="absolute left-0 top-0 bottom-[35%] w-[30%] z-10"
              onClick={() => { if (!isDragging.current) goPhoto(-1) }}
            />
            <div
              className="absolute right-0 top-0 bottom-[35%] w-[30%] z-10"
              onClick={() => { if (!isDragging.current) goPhoto(1) }}
            />
            {/* Chevrons hover desktop */}
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

        {/* ── Badges haut ── */}
        <div className="absolute z-20 flex items-center gap-2" style={{ top: photos.length > 1 ? '20px' : '14px', left: '14px' }}>
          {(profile.certLevel ?? 0) > 0 && <CertificationBadge level={profile.certLevel!} size="sm" />}
          {profile.isListing && profile.ownerId && <ReliabilityBadge userId={profile.ownerId} size={26} />}
        </div>
        <button
          onClick={toggleFavorite}
          className="absolute z-20 flex items-center justify-center w-9 h-9 rounded-full border-none cursor-pointer transition-all"
          style={{
            top: photos.length > 1 ? '20px' : '14px', right: '14px',
            background: saved ? 'rgba(16,185,129,0.9)' : 'rgba(0,0,0,0.4)',
            color: '#fff', backdropFilter: 'blur(4px)',
          }}
          aria-label={saved ? 'Retirer des favoris' : 'Sauvegarder'}
        >
          <Bookmark size={16} fill={saved ? '#fff' : 'none'} />
        </button>

        {/* ── STAMPS ── */}
        <motion.div className="absolute top-14 left-6 z-30 pointer-events-none" style={{ opacity: likeOpacity }}>
          <Stamp label="J'ADORE" color="#10B981" rotate={-12} />
        </motion.div>
        <motion.div className="absolute top-14 right-6 z-30 pointer-events-none" style={{ opacity: nopeOpacity }}>
          <Stamp label="PASSE" color="#EF4444" rotate={12} />
        </motion.div>
        <motion.div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none" style={{ opacity: superOpacity }}>
          <Stamp label="★ SUPER" color="#F59E0B" rotate={-6} />
        </motion.div>

        {/* ── Contenu bas ── */}
        <div className="absolute inset-x-0 bottom-0 z-20 px-5 pb-4 pt-2">
          <div className="flex items-end justify-between gap-3 mb-2">
            <div className="min-w-0">
              <h2
                className="truncate"
                style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 700, color: '#fff', lineHeight: 1.15, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
              >
                {profile.name}{profile.age > 0 ? `, ${profile.age}` : ''}
              </h2>
              <div className="flex items-center gap-1.5 flex-wrap mt-1" style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.75)' }}>
                <MapPin size={13} className="flex-shrink-0" />
                <span className="truncate">{profile.city}</span>
                {profile.rent > 0 && <><span>·</span><span className="font-semibold" style={{ color: '#10B981' }}>{profile.rent}€/mois</span></>}
                {profile.occupancy ? (
                  <>
                    <span>·</span>
                    <span
                      className="flex items-center gap-1"
                      title={`${profile.occupancy.current} colocataire${profile.occupancy.current > 1 ? 's' : ''} sur ${profile.occupancy.total} place${profile.occupancy.total > 1 ? 's' : ''}`}
                    >
                      <Users size={13} /> {profile.occupancy.current} / {profile.occupancy.total}
                    </span>
                    {profile.occupancy.total - profile.occupancy.current <= 0 && (
                      <span
                        style={{
                          fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                          background: 'rgba(156,163,175,0.25)', color: '#D1D5DB', border: '1px solid rgba(156,163,175,0.4)',
                        }}
                      >
                        Complet
                      </span>
                    )}
                  </>
                ) : (
                  profile.job && <><span>·</span><span>{profile.job}</span></>
                )}
              </div>
            </div>
            <MatchRing value={profile.match} />
          </div>

          {/* Chip détails compatibilité */}
          <button
            onClick={() => setShowDetails(s => !s)}
            className="border-none cursor-pointer transition-all"
            style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              background: showDetails ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.12)',
              border: `1px solid ${showDetails ? '#10B981' : 'rgba(255,255,255,0.2)'}`,
              color: showDetails ? '#10B981' : 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(8px)',
            }}
          >
            Détails compatibilité {showDetails ? '▾' : '▸'}
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div
                  className="mt-3 p-3.5 rounded-2xl"
                  style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}
                >
                  {subScores && subScores.length > 0 ? (
                    <div className="flex flex-col gap-2 mb-3">
                      {subScores.map(item => (
                        <div key={item.label}>
                          <div className="flex justify-between items-center mb-0.5">
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{item.label}</span>
                            <span style={{ fontSize: '11px', color: item.color, fontWeight: 700 }}>{item.value}%</span>
                          </div>
                          <div className="rounded-full overflow-hidden" style={{ height: '3px', background: 'rgba(255,255,255,0.12)' }}>
                            <div style={{ height: '100%', width: `${item.value}%`, background: item.color, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mb-3" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                      Test de compatibilité non complété — les scores s&apos;afficheront quand vous aurez tous les deux répondu au questionnaire.
                    </p>
                  )}
                  {profile.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {profile.tags.slice(0, 5).map(tag => (
                        <span
                          key={tag}
                          style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '14px', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {profile.bio && (
                    <p className="mb-3" style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, maxHeight: '72px', overflow: 'hidden' }}>
                      {profile.bio}
                    </p>
                  )}
                  <button
                    onClick={() => onMessage(profile.name)}
                    className="w-full flex items-center justify-center gap-2 border-none cursor-pointer transition-all"
                    style={{
                      padding: '9px', borderRadius: '12px', fontSize: '13px', fontWeight: 700,
                      fontFamily: "'Outfit', sans-serif", color: '#fff',
                      background: 'linear-gradient(135deg, #10B981, #059669)',
                      boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
                    }}
                  >
                    <MessageCircle size={15} />
                    {profile.isListing ? 'Contacter le loueur' : `Écrire à ${firstName}`}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
})

export default SwipeCard
