'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import type { ReliabilityResult } from '@/lib/reliabilityScore'

/** Fetch partagé (cache mémoire par session pour éviter les refetchs). */
const cache = new Map<string, ReliabilityResult>()

export function useReliability(userId: string | null | undefined) {
  const [data, setData] = useState<ReliabilityResult | null>(userId ? cache.get(userId) ?? null : null)

  useEffect(() => {
    if (!userId) return
    if (cache.has(userId)) { setData(cache.get(userId)!); return }
    let cancelled = false
    fetch(`/api/reliability/${userId}`)
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

/** Jauge circulaire complète — profil public loueur. */
export function ReliabilityGauge({ userId }: { userId: string }) {
  const data = useReliability(userId)
  if (!data) return null

  const r = 34
  const c = 2 * Math.PI * r
  const pct = data.score / 100

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap',
    }}>
      {/* Jauge */}
      <div style={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
        <svg width="84" height="84" viewBox="0 0 84 84" style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id="relGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
          <circle
            cx="42" cy="42" r={r} fill="none" stroke="url(#relGrad)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: 800, color: '#10B981', lineHeight: 1 }}>{data.score}</span>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>/100</span>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>
            Score de fiabilité
          </span>
          {data.score >= 95 ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px',
              background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.4)',
            }}>
              <Star size={11} fill="#F59E0B" color="#F59E0B" /> Super Loueur
            </span>
          ) : data.score >= 80 ? (
            <span style={{
              fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '20px',
              background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.4)',
            }}>
              Loueur de confiance
            </span>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          {data.avgResponseHours != null && (
            <Metric label={`Répond en ~${data.avgResponseHours < 1 ? '1' : Math.round(data.avgResponseHours)}h`} />
          )}
          {data.avgRating != null && <Metric label={`Note ${data.avgRating}/5 (${data.reviewCount} avis)`} />}
          <Metric label={`Membre depuis ${Math.max(1, data.monthsOnPlatform)} mois`} />
        </div>
      </div>
    </div>
  )
}

function Metric({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: '12px', color: 'rgba(255,255,255,0.6)',
      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px', padding: '5px 10px',
    }}>
      {label}
    </span>
  )
}

/** Mini badge numérique discret — cards annonce (photo du loueur). */
export function ReliabilityBadge({ userId, size = 26 }: { userId: string | null | undefined; size?: number }) {
  const data = useReliability(userId)
  if (!data) return null

  return (
    <span
      title="Score de fiabilité ISALY"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: '#0A0A0A', border: '2px solid #10B981',
        fontSize: size * 0.42, fontWeight: 800, color: '#10B981',
        fontFamily: "'Outfit', sans-serif", cursor: 'default',
      }}
    >
      {data.score}
    </span>
  )
}
