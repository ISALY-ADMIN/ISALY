'use client'

export type CertLevel = 0 | 1 | 2 | 3
export type CertStatus = 'verified' | 'pending' | 'rejected'

const CERT = {
  1: { label: 'Profil vérifié',     checks: '✓',    color: '#9CA3AF', bg: '#252525',  border: '#374151' },
  2: { label: 'Identité certifiée', checks: '✓✓',   color: '#60A5FA', bg: '#0D1B3E',  border: '#1D4ED8' },
  3: { label: 'Dossier Gold',       checks: '✓✓✓',  color: '#F59E0B', bg: '#1C1200',  border: '#78350F' },
} as const

interface CertBadgeProps {
  level: CertLevel
  status?: CertStatus
  size?: 'sm' | 'md'
}

export default function CertificationBadge({ level, status = 'verified', size = 'md' }: CertBadgeProps) {
  if (level === 0) return null
  const cfg = CERT[level]
  const pending  = status === 'pending'
  const rejected = status === 'rejected'

  const color  = pending ? '#6B7280' : rejected ? '#EF4444' : cfg.color
  const bg     = pending ? '#1F1F1F' : rejected ? '#1A0000' : cfg.bg
  const border = pending ? '#374151' : rejected ? '#7F1D1D' : cfg.border

  if (size === 'sm') {
    const icon = pending ? '⏳' : rejected ? '✕' : cfg.checks
    return (
      <span
        title={pending ? `${cfg.label} — en attente` : rejected ? `${cfg.label} — refusé` : cfg.label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: '10px',
          fontWeight: 700,
          color,
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: '99px',
          padding: '2px 6px',
          lineHeight: 1.4,
          flexShrink: 0,
          letterSpacing: '0.5px',
        }}
      >
        {icon}
      </span>
    )
  }

  const label = pending ? 'En attente' : rejected ? 'Refusé' : cfg.label
  const icon  = pending ? '⏳' : rejected ? '✕' : cfg.checks

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '12px',
        fontWeight: 700,
        color,
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: '99px',
        padding: '4px 11px',
        lineHeight: 1.5,
        letterSpacing: '0.3px',
      }}
    >
      <span style={{ letterSpacing: '1px' }}>{icon}</span>
      <span>{label}</span>
    </span>
  )
}
