'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import type { IsalyScoreResult } from '@/lib/isalyScore'

/** Cache mémoire par session (mêmes données affichées jauge + badges). */
const cache = new Map<string, IsalyScoreResult>()

export function useIsalyScore(userId: string | null | undefined) {
  const [data, setData] = useState<IsalyScoreResult | null>(userId ? cache.get(userId) ?? null : null)

  useEffect(() => {
    if (!userId) return
    if (cache.has(userId)) { setData(cache.get(userId)!); return }
    let cancelled = false
    fetch(`/api/isaly-score/${userId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(json => {
        if (json && !cancelled) {
          cache.set(userId, json)
          setData(json)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [userId])

  return data
}

function scoreBadge(score: number): { label: string; style: React.CSSProperties; star?: boolean } | null {
  if (score >= 90) return {
    label: 'Super membre',
    star: true,
    style: {
      background: 'linear-gradient(135deg, #F59E0B, #D97706)',
      color: '#fff', border: 'none',
      boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
    },
  }
  if (score >= 75) return {
    label: 'Profil de confiance',
    style: { background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.4)' },
  }
  if (score >= 60) return {
    label: 'Membre actif',
    style: { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.18)' },
  }
  return null
}

/** Grande jauge circulaire 120px — mon profil + profil public. */
export function IsalyScoreGauge({ userId }: { userId: string }) {
  const data = useIsalyScore(userId)
  if (!data) return null

  const r = 50
  const c = 2 * Math.PI * r
  const badge = scoreBadge(data.score)

  const pills = [
    `Dossier ${data.completion}%`,
    data.certLevel > 0 ? `Vérifié N${data.certLevel}` : 'Non vérifié',
    data.avgRating != null ? `Note ${data.avgRating}/5` : null,
    data.avgResponseHours != null ? `Répond en ~${data.avgResponseHours < 1 ? 1 : Math.round(data.avgResponseHours)}h` : null,
  ].filter(Boolean) as string[]

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px', padding: '24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
    }}>
      {/* Jauge animée */}
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id="isalyScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          <motion.circle
            cx="60" cy="60" r={r} fill="none"
            stroke="url(#isalyScoreGrad)" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - data.score / 100) }}
            transition={{ type: 'spring', stiffness: 45, damping: 16, duration: 1.2 }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '32px', fontWeight: 700, color: '#10B981', lineHeight: 1 }}>
            {data.score}
          </span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>/100</span>
        </div>
      </div>

      <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.5px' }}>
        ISALY Score
      </div>

      {badge && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontSize: '12px', fontWeight: 800, padding: '6px 14px', borderRadius: '20px',
          fontFamily: "'Outfit', sans-serif",
          ...badge.style,
        }}>
          {badge.star && <Star size={12} fill="currentColor" />} {badge.label}
        </span>
      )}

      {/* Sous-métriques */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {pills.map(p => (
          <span key={p} style={{
            fontSize: '11.5px', fontWeight: 600, padding: '5px 11px', borderRadius: '14px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.65)',
          }}>
            {p}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Petit cercle score 32px — cards swipe / recherche / favoris. */
export function IsalyScoreBadge({ userId, size = 32 }: { userId: string | null | undefined; size?: number }) {
  const data = useIsalyScore(userId)
  if (!data) return null

  return (
    <span
      title="ISALY Score"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #10B981, #059669)',
        border: '2px solid rgba(255,255,255,0.25)',
        fontSize: 11, fontWeight: 700, color: '#fff',
        fontFamily: "'Outfit', sans-serif", cursor: 'default',
        boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
      }}
    >
      {data.score}
    </span>
  )
}
