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

// ── Tag colour system ─────────────────────────────────────────
function tagStyle(tag: string): { bg: string; color: string } {
  const t = tag.toLowerCase()
  if (t.includes('couche') || t.includes('lève') || t.includes('tôt'))
    return { bg: '#EFF6FF', color: '#3B82F6' }
  if (t.includes('sport') || t.includes('gym') || t.includes('course') || t.includes('yoga') || t.includes('vélo'))
    return { bg: '#FFF7ED', color: '#F97316' }
  if (t.includes('animal') || t.includes('chat') || t.includes('chien') || t.includes('télétravail') || t.includes('végé'))
    return { bg: '#ECFDF5', color: '#059669' }
  if (t.includes('musique') || t.includes('art') || t.includes('créatif') || t.includes('guitare') || t.includes('nocturne'))
    return { bg: '#F5F3FF', color: '#8B5CF6' }
  if (t.includes('cuisinier') || t.includes('cuisine') || t.includes('studieux') || t.includes('festif'))
    return { bg: '#FFFBEB', color: '#F59E0B' }
  if (t.includes('gaming') || t.includes('jeux') || t.includes('indigo'))
    return { bg: '#EEF2FF', color: '#6366F1' }
  if (t.includes('fumeur'))
    return { bg: '#FEF2F2', color: '#EF4444' }
  return { bg: '#F0FDF4', color: '#16A34A' }
}

export default function SwipeCard({ profile, onSwipe, onMessage, hint }: SwipeCardProps) {
  const cardRef   = useRef<HTMLDivElement>(null)
  const [flying, setFlying] = useState<'left' | 'right' | null>(null)
  const startX    = useRef(0)
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

  return (
    <div
      ref={cardRef}
      className="card-entrance select-none"
      style={{
        width: '380px',
        minHeight: '520px',
        borderRadius: '24px',
        overflow: 'hidden',
        background: '#FFFFFF',
        boxShadow: '0 16px 56px rgba(0,0,0,.16)',
        transform: flying === 'left'
          ? 'translateX(-130%) rotate(-18deg)'
          : flying === 'right'
          ? 'translateX(130%) rotate(18deg)'
          : hintRotate,
        opacity: flying ? 0 : 1,
        transition: 'transform 0.36s cubic-bezier(.34,1.56,.64,1), opacity 0.3s',
        cursor: 'grab',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── PHOTO ZONE ────────────────────────────────────── */}
      <div className="relative" style={{ height: '286px', overflow: 'hidden' }}>
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(160deg, ${profile.color}DD 0%, ${profile.color}66 100%)` }}
        />

        {/* Large semi-transparent initial */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{ fontSize: '140px', fontFamily: "'DM Serif Display', serif", color: 'white', opacity: 0.16, lineHeight: 1 }}
        >
          {profile.name[0]}
        </div>

        {/* Emoji (decorative) */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ fontSize: '76px', opacity: 0.75, marginTop: '-8px' }}
        >
          {profile.emoji}
        </div>

        {/* Bottom gradient overlay for text readability */}
        <div
          className="absolute bottom-0 inset-x-0"
          style={{ height: '110px', background: 'linear-gradient(to top, rgba(0,0,0,.72) 0%, transparent 100%)' }}
        />

        {/* Name + age over gradient */}
        <div className="absolute bottom-0 inset-x-0 px-5 pb-5">
          <div className="text-[24px] font-bold leading-tight" style={{ color: '#FFFFFF' }}>
            {profile.name}, {profile.age}
          </div>
          <div className="text-[13px] mt-1 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,.8)' }}>
            <span>💼</span>{profile.job}
            <span style={{ opacity: 0.5 }}>·</span>
            <span>📍</span>{profile.city}
          </div>
        </div>

        {/* Cert badge — top left */}
        {(profile.certLevel ?? 0) > 0 && (
          <div className="absolute top-3.5 left-3.5">
            <CertificationBadge level={profile.certLevel!} size="sm" />
          </div>
        )}

        {/* LIKE / NOPE / SUPER stamp */}
        {hint === 'like' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(34,197,94,.15)', pointerEvents: 'none' }}>
            <div className="stamp-like px-5 py-2 rounded-[8px] text-[36px] font-black tracking-wider">LIKE ✓</div>
          </div>
        )}
        {hint === 'nope' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(239,68,68,.15)', pointerEvents: 'none' }}>
            <div className="stamp-nope px-5 py-2 rounded-[8px] text-[36px] font-black tracking-wider">NOPE ✕</div>
          </div>
        )}
        {hint === 'super' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(99,102,241,.15)', pointerEvents: 'none' }}>
            <div className="stamp-super px-5 py-2 rounded-[8px] text-[36px] font-black tracking-wider">SUPER ⭐</div>
          </div>
        )}
      </div>

      {/* ── INFO ZONE ─────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-5" style={{ background: '#FFFFFF' }}>
        {/* Rent + match score row */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-[16px] font-bold" style={{ color: '#111827' }}>
            {profile.rent}<span className="text-[12px] font-normal ml-0.5" style={{ color: '#9CA3AF' }}>€/mois</span>
          </div>
          <div
            className="flex items-center gap-1 text-[12px] font-extrabold px-2.5 py-1 rounded-full"
            style={{ background: '#ECFDF5', color: '#2AA87C' }}
          >
            ✨ {profile.match}% compatible
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {profile.tags.slice(0, 5).map(tag => {
            const s = tagStyle(tag)
            return (
              <span
                key={tag}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: s.bg, color: s.color }}
              >
                {tag}
              </span>
            )
          })}
        </div>

        {/* Bio */}
        <p
          className="text-[13px] leading-relaxed mb-4"
          style={{ color: '#6B7280', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {profile.bio}
        </p>

        {/* CTA button */}
        <button
          onClick={() => onMessage(profile.name)}
          className="w-full py-3 rounded-full text-[13.5px] font-bold text-white border-none cursor-pointer flex items-center justify-center gap-2 transition-all"
          style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)', boxShadow: '0 4px 16px rgba(78,203,160,.3)' }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 28px rgba(78,203,160,.55)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(78,203,160,.3)')}
        >
          💬 Écrire à {firstName}
        </button>
      </div>
    </div>
  )
}
