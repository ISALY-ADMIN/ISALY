'use client'

import Link from 'next/link'
import Emoji from '@/components/ui/Emoji'

// ── Stat card ─────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: number
  href: string
  color: string
  bg: string
  icon: string
  alert?: boolean
  suffix?: string
  sub?: string
}

export function StatCard({ label, value, href, color, bg, icon, alert, suffix, sub }: StatCardProps) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${alert ? color + '50' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: '16px',
          padding: '22px',
          transition: 'background 0.15s',
          cursor: 'pointer',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
            <Emoji native={icon} size="18px" />
          </div>
          {alert && (
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
          )}
        </div>
        <div style={{ fontSize: '32px', fontWeight: 700, color: '#fff', lineHeight: 1, marginBottom: '6px' }}>
          {value.toLocaleString('fr-FR')}{suffix && <span style={{ fontSize: '18px', fontWeight: 600, color: '#9CA3AF', marginLeft: '3px' }}>{suffix}</span>}
        </div>
        <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>
          {label}
        </div>
        {sub && (
          <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '3px' }}>
            {sub}
          </div>
        )}
      </div>
    </Link>
  )
}

// ── Quick link ────────────────────────────────────────────────
interface QuickLinkProps {
  href: string
  label: string
  icon: string
  desc: string
}

export function QuickLink({ href, label, icon, desc }: QuickLinkProps) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => {
          const d = e.currentTarget as HTMLDivElement
          d.style.borderColor = 'rgba(78,203,160,0.3)'
          d.style.background = 'rgba(78,203,160,0.05)'
        }}
        onMouseLeave={e => {
          const d = e.currentTarget as HTMLDivElement
          d.style.borderColor = 'rgba(255,255,255,0.06)'
          d.style.background = 'rgba(255,255,255,0.03)'
        }}
      >
        <span style={{ fontSize: '24px' }}><Emoji native={icon} size="24px" /></span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB', marginBottom: '2px' }}>{label}</div>
          <div style={{ fontSize: '12px', color: '#6B7280' }}>{desc}</div>
        </div>
      </div>
    </Link>
  )
}
