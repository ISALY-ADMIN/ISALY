'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import CertificationBadge, { CertLevel } from '@/components/ui/CertificationBadge'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/card'

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
  photoUrl?: string | null
  isListing?: boolean
  ownerId?: string
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
  const [saved, setSaved] = useState(false)

  async function toggleFavorite() {
    setSaved(s => !s)
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_id: profile.id, target_type: profile.isListing ? 'listing' : 'profile' }),
    })
  }
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

  const firstName = profile.isListing
    ? "l'annonceur"
    : profile.name.split(' ')[0]

  const hintRotate = hint === 'like' ? 'rotate(2deg)' : hint === 'nope' ? 'rotate(-2deg)' : undefined
  const cardTransform = flying === 'left'
    ? 'translateX(-130%) rotate(-18deg)'
    : flying === 'right'
    ? 'translateX(130%) rotate(18deg)'
    : hintRotate

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
    >
    <Card
      ref={cardRef}
      className="card-entrance select-none overflow-hidden cursor-grab"
      style={{
        width: 'min(440px, 88vw)',
        minHeight: '600px',
        borderRadius: '24px',
        transform: cardTransform,
        opacity: flying ? 0 : 1,
        transition: 'transform 0.36s cubic-bezier(.34,1.56,.64,1), opacity 0.3s',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── PHOTO ZONE ────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ height: '340px' }}>
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(160deg, ${profile.color}EE 0%, ${profile.color}88 100%)` }}
        />
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: '160px',
            color: 'white',
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {profile.name[0]}
        </div>
        {profile.photoUrl && (
          <img
            src={profile.photoUrl}
            alt={profile.name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}
        <div
          className="absolute bottom-0 inset-x-0"
          style={{ height: '130px', background: 'linear-gradient(to top, rgba(0,0,0,.80) 0%, transparent 100%)' }}
        />
        {/* Compatibility badge — centered top */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#4ECBA0',
            borderRadius: '40px',
            padding: '8px 22px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(78,203,160,0.5)',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontSize: '30px', fontWeight: 800, color: '#0A2015', lineHeight: 1 }}>
            {profile.match}%
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#0A2015', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Compatible
          </div>
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
      <div className="px-5 py-5" style={{ background: 'rgba(15,15,15,0.97)' }}>
        <p className="text-2xl font-bold mb-0.5" style={{ color: '#ffffff' }}>
          {profile.name}{profile.age > 0 ? `, ${profile.age}` : ''}
        </p>
        <div className="text-sm flex items-center gap-1.5 flex-wrap mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {profile.job && <span>{profile.job}</span>}
          {profile.city && <><span>·</span><span>📍 {profile.city}</span></>}
          {profile.rent > 0 && <><span>·</span><span>{profile.rent} €/mois</span></>}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {profile.tags.slice(0, 5).map(tag => (
            <Badge key={tag} variant="secondary" className={`text-[11.5px] ${getPillStyle(tag)}`}>
              {tag}
            </Badge>
          ))}
        </div>
        {/* Compatibility bars */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Détail de la compatibilité</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { label: 'Mode de vie',  value: Math.min(100, profile.match + 5),                           color: '#10B981' },
              { label: 'Budget',       value: Math.max(60,  profile.match - 10),                          color: '#6366F1' },
              { label: 'Personnalité', value: Math.min(100, profile.match - 5),                           color: '#F59E0B' },
              { label: 'Intérêts',    value: Math.min(100, Math.round(profile.match * 0.9 + 8)),          color: '#EC4899' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{item.label}</div>
                  <div style={{ fontSize: '12px', color: item.color, fontWeight: 700 }}>{item.value}%</div>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${item.value}%`, background: item.color, borderRadius: '6px', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <p
          className="text-[13px] leading-relaxed mb-1"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: 'rgba(255,255,255,0.5)' }}
        >
          {profile.bio || 'Aucune description pour l\'instant.'}
        </p>
        <button
          onClick={toggleFavorite}
          style={{
            width: '100%', marginBottom: '8px',
            padding: '10px',
            background: saved ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${saved ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '12px',
            color: saved ? '#10B981' : 'rgba(255,255,255,0.6)',
            fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
          }}
        >
          {saved ? '🔖 Sauvegardé' : '🔖 Sauvegarder'}
        </button>
        <Button className="w-full mt-3" size="lg" onClick={() => onMessage(profile.name)}>
          {profile.isListing ? '💬 Contacter le loueur' : `💬 Écrire à ${firstName}`}
        </Button>
      </div>
    </Card>
    </motion.div>
  )
}
