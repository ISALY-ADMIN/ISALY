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
      className="card-entrance select-none rounded-2xl overflow-hidden bg-white cursor-grab"
      style={{
        width: 'min(380px, 90vw)',
        minHeight: '530px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.07)',
        transform: cardTransform,
        opacity: flying ? 0 : 1,
        transition: 'transform 0.36s cubic-bezier(.34,1.56,.64,1), opacity 0.3s',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── PHOTO ZONE ────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ height: '290px' }}>
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(160deg, ${profile.color}EE 0%, ${profile.color}88 100%)` }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: '130px',
            color: 'white',
            opacity: 0.13,
            lineHeight: 1,
          }}
        >
          {profile.name[0]}
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ fontSize: '76px', opacity: 0.85 }}
        >
          {profile.emoji}
        </div>
        <div
          className="absolute bottom-0 inset-x-0"
          style={{ height: '130px', background: 'linear-gradient(to top, rgba(0,0,0,.80) 0%, transparent 100%)' }}
        />
        <div className="absolute bottom-0 inset-x-0 px-5 pb-4">
          <div
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: '24px',
              fontWeight: 400,
              color: '#ffffff',
              lineHeight: 1.2,
              marginBottom: '4px',
            }}
          >
            {profile.name}{profile.age > 0 ? `, ${profile.age}` : ''}
          </div>
          <div className="text-[13px] flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,.80)' }}>
            {profile.job && (
              <><span>💼</span><span>{profile.job}</span><span className="opacity-40">·</span></>
            )}
            <span>📍</span>{profile.city}
          </div>
        </div>
        <div
          className="absolute top-3 right-3 flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 shadow-lg"
          style={{ color: '#059669', fontSize: '12px', fontWeight: 700 }}
        >
          ❤️ {profile.match}%
        </div>
        {(profile.certLevel ?? 0) > 0 && (
          <div className="absolute top-3 left-3">
            <CertificationBadge level={profile.certLevel!} size="sm" />
          </div>
        )}
        {hint === 'like' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-2xl" style={{ background: 'rgba(16,185,129,.13)' }}>
            <div style={{ border: '4px solid #10B981', color: '#10B981', padding: '6px 18px', borderRadius: '8px', fontSize: '36px', fontWeight: 900, letterSpacing: '3px', transform: 'rotate(-15deg)', fontFamily: "'DM Serif Display', serif" }}>LIKE ✓</div>
          </div>
        )}
        {hint === 'nope' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-2xl" style={{ background: 'rgba(239,68,68,.10)' }}>
            <div style={{ border: '4px solid #EF4444', color: '#EF4444', padding: '6px 18px', borderRadius: '8px', fontSize: '36px', fontWeight: 900, letterSpacing: '3px', transform: 'rotate(15deg)', fontFamily: "'DM Serif Display', serif" }}>NOPE ✕</div>
          </div>
        )}
        {hint === 'super' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-2xl" style={{ background: 'rgba(99,102,241,.12)' }}>
            <div style={{ border: '4px solid #6366F1', color: '#6366F1', padding: '6px 18px', borderRadius: '8px', fontSize: '36px', fontWeight: 900, letterSpacing: '3px', transform: 'rotate(-10deg)', fontFamily: "'DM Serif Display', serif" }}>SUPER ⭐</div>
          </div>
        )}
      </div>

      {/* ── INFO ZONE ─────────────────────────────────────── */}
      <div className="bg-white px-5 pt-4 pb-5">
        <div className="mb-3">
          {profile.rent > 0 ? (
            <span>
              <span style={{ fontSize: '17px', fontWeight: 700, color: '#111827' }}>{profile.rent}</span>
              <span style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: '3px' }}>€/mois</span>
            </span>
          ) : (
            <span style={{ fontSize: '13px', color: '#9CA3AF' }}>Budget non renseigné</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {profile.tags.slice(0, 5).map(tag => (
            <span
              key={tag}
              className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-full ${getPillStyle(tag)}`}
            >
              {tag}
            </span>
          ))}
        </div>
        <p
          className="text-[13px] leading-relaxed mb-4"
          style={{ color: '#9CA3AF', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {profile.bio || 'Aucune description pour l\'instant.'}
        </p>
        <button
          onClick={() => onMessage(profile.name)}
          className="w-full py-3 rounded-[12px] text-sm font-semibold text-white border-none cursor-pointer flex items-center justify-center gap-2 transition-all"
          style={{
            background: 'linear-gradient(135deg, #10B981, #059669)',
            boxShadow: '0 4px 14px rgba(16,185,129,0.38)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = '0 6px 22px rgba(16,185,129,0.55)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(16,185,129,0.38)'
            e.currentTarget.style.transform = ''
          }}
        >
          💬 Écrire à {firstName}
        </button>
      </div>
    </div>
  )
}
