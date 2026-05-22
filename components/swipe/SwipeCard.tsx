'use client'

import { useRef, useState } from 'react'
import CertificationBadge, { CertLevel } from '@/components/ui/CertificationBadge'

export interface SwipeProfile {
  id: string
  name: string
  age: number
  job: string
  city: string
  rent: number
  match: number
  emoji: string
  color: string
  tags: string[]
  bio: string
  certLevel?: CertLevel
}

interface SwipeCardProps {
  profile: SwipeProfile
  onSwipe: (direction: 'left' | 'right' | 'super') => void
  onMessage: (name: string) => void
  hint?: 'like' | 'nope' | 'super' | null
}

function getPillStyle(tag: string): string {
  const t = tag.toLowerCase()
  if (t.includes('tard') || t.includes('tôt') || t.includes('lève') || t.includes('couche') || t.includes('horaire'))
    return 'bg-blue-50 text-blue-600'
  if (t.includes('animal') || t.includes('chat') || t.includes('chien') || t.includes('nature') || t.includes('végé'))
    return 'bg-emerald-50 text-emerald-600'
  if (t.includes('fumeur'))
    return 'bg-red-50 text-red-500'
  if (t.includes('travail') || t.includes('télétravail') || t.includes('studieux') || t.includes('calme'))
    return 'bg-purple-50 text-purple-600'
  if (t.includes('musique') || t.includes('art') || t.includes('créatif') || t.includes('guitare') || t.includes('nocturne'))
    return 'bg-violet-50 text-violet-600'
  if (t.includes('sport') || t.includes('gym') || t.includes('course') || t.includes('yoga') || t.includes('vélo') || t.includes('fitness'))
    return 'bg-orange-50 text-orange-500'
  if (t.includes('cuisine') || t.includes('cuisinier') || t.includes('festif'))
    return 'bg-yellow-50 text-yellow-600'
  if (t.includes('gaming') || t.includes('jeux'))
    return 'bg-indigo-50 text-indigo-600'
  if (t.includes('voyage') || t.includes('travel') || t.includes('backpack'))
    return 'bg-pink-50 text-pink-500'
  if (t.includes('tech') || t.includes('code') || t.includes('développ') || t.includes('informatiq'))
    return 'bg-sky-50 text-sky-600'
  return 'bg-gray-100 text-gray-600'
}

export default function SwipeCard({ profile, onSwipe, onMessage, hint }: SwipeCardProps) {
  const cardRef    = useRef<HTMLDivElement>(null)
  const [flying, setFlying] = useState<'left' | 'right' | null>(null)
  const startX     = useRef(0)
  const isDragging = useRef(false)

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    isDragging.current = true
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!isDragging.current) return
    const diff = e.changedTouches[0].clientX - startX.current
    if (Math.abs(diff) > 80) triggerSwipe(diff > 0 ? 'right' : 'left')
    isDragging.current = false
  }

  function triggerSwipe(dir: 'left' | 'right' | 'super') {
    setFlying(dir === 'super' ? 'right' : dir)
    setTimeout(() => { setFlying(null); onSwipe(dir) }, 400)
  }

  const firstName = profile.name.split(' ')[0]

  const hintRotate = hint === 'like' ? 'rotate(2deg)' : hint === 'nope' ? 'rotate(-2deg)' : undefined
  const cardTransform = flying === 'left'
    ? 'translateX(-130%) rotate(-18deg)'
    : flying === 'right'
    ? 'translateX(130%) rotate(18deg)'
    : hintRotate

  return (
    <div
      ref={cardRef}
      className="card-entrance select-none rounded-2xl shadow-xl overflow-hidden bg-white cursor-grab"
      style={{
        width: '380px',
        minHeight: '520px',
        transform: cardTransform,
        opacity: flying ? 0 : 1,
        transition: 'transform 0.36s cubic-bezier(.34,1.56,.64,1), opacity 0.3s',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── PHOTO ZONE ────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ height: '280px' }}>

        {/* Dynamic gradient */}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(160deg, ${profile.color}EE 0%, ${profile.color}88 100%)` }}
        />

        {/* Large initial watermark */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none font-serif"
          style={{ fontSize: '120px', color: 'white', opacity: 0.14, lineHeight: 1 }}
        >
          {profile.name[0]}
        </div>

        {/* Emoji */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ fontSize: '72px', opacity: 0.82 }}
        >
          {profile.emoji}
        </div>

        {/* Bottom black overlay gradient for text legibility */}
        <div
          className="absolute bottom-0 inset-x-0"
          style={{ height: '120px', background: 'linear-gradient(to top, rgba(0,0,0,.76) 0%, transparent 100%)' }}
        />

        {/* Name + age + job/city */}
        <div className="absolute bottom-0 inset-x-0 px-5 pb-4">
          <div className="text-[22px] font-bold leading-tight text-white font-serif">
            {profile.name}{profile.age > 0 ? `, ${profile.age}` : ''}
          </div>
          <div className="text-[13px] mt-0.5 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,.82)' }}>
            {profile.job && (
              <><span>💼</span><span>{profile.job}</span><span className="opacity-40">·</span></>
            )}
            <span>📍</span>{profile.city}
          </div>
        </div>

        {/* Match score badge — top right */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-white rounded-full px-3 py-1 text-xs font-extrabold shadow-md" style={{ color: '#2AA87C' }}>
          ♥ {profile.match}%
        </div>

        {/* Cert badge — top left */}
        {(profile.certLevel ?? 0) > 0 && (
          <div className="absolute top-3 left-3">
            <CertificationBadge level={profile.certLevel!} size="sm" />
          </div>
        )}

        {/* LIKE / NOPE / SUPER stamps */}
        {hint === 'like' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(34,197,94,.15)' }}>
            <div className="stamp-like px-5 py-2 rounded-lg text-4xl font-black tracking-wider">LIKE ✓</div>
          </div>
        )}
        {hint === 'nope' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(239,68,68,.15)' }}>
            <div className="stamp-nope px-5 py-2 rounded-lg text-4xl font-black tracking-wider">NOPE ✕</div>
          </div>
        )}
        {hint === 'super' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(99,102,241,.15)' }}>
            <div className="stamp-super px-5 py-2 rounded-lg text-4xl font-black tracking-wider">SUPER ⭐</div>
          </div>
        )}
      </div>

      {/* ── INFO ZONE ─────────────────────────────────────── */}
      <div className="bg-white px-5 pt-4 pb-5">

        {/* Budget */}
        <div className="text-base font-bold text-gray-900 mb-3">
          {profile.rent > 0 ? (
            <>{profile.rent} <span className="text-xs font-normal text-gray-400">€/mois</span></>
          ) : (
            <span className="text-sm font-normal text-gray-400">Budget non renseigné</span>
          )}
        </div>

        {/* Pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {profile.tags.slice(0, 5).map(tag => (
            <span
              key={tag}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${getPillStyle(tag)}`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Bio */}
        <p
          className="text-sm text-gray-500 leading-relaxed mb-4"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {profile.bio || "Aucune description pour l'instant."}
        </p>

        {/* CTA */}
        <button
          onClick={() => onMessage(profile.name)}
          className="w-full py-3 mt-1 rounded-full text-sm font-semibold text-white border-none cursor-pointer flex items-center justify-center gap-2 transition-all"
          style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)', boxShadow: '0 4px 16px rgba(78,203,160,.32)' }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = '0 8px 28px rgba(78,203,160,.55)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(78,203,160,.32)'
            e.currentTarget.style.transform = ''
          }}
        >
          💬 Écrire à {firstName}
        </button>
      </div>
    </div>
  )
}
