'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { AnimatePresence } from 'framer-motion'
import { ArrowUpDown, Inbox, Archive } from 'lucide-react'
import type { BugReportStatus, BugReportSeverity } from '@/types/database'
import {
  AdminBugReport, STATUS_META, SEVERITY_META, ACTIVE_STATUS_ORDER, ATTENTION_RANK,
  TicketCard, DetailModal, SpinnerStyles, formatDuration,
} from './shared'

export type { AdminBugReport }

export interface BugStats {
  total: number
  byStatus: Record<string, number>
  autoFixRate: number | null
  autoFixBase: number
  avgHandlingMs: number | null
  avgHandlingCount: number
  archivedCount: number
}

/* ═══════════════════════ Rangée de statistiques ═══════════════════════ */

function StatCard({ label, value, suffix, sub, color, accent }: {
  label: string
  value: string | number
  suffix?: string
  sub?: string
  color?: string
  accent?: boolean
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${accent && color ? `${color}55` : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '16px',
        padding: '18px 20px',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color ?? '#4B5563', flexShrink: 0 }} />
        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: color ?? '#fff', lineHeight: 1 }}>
        {value}
        {suffix && <span style={{ fontSize: '15px', fontWeight: 600, color: '#6B7280', marginLeft: '3px' }}>{suffix}</span>}
      </div>
      {sub && <div style={{ fontSize: '11.5px', color: '#4B5563', marginTop: '6px' }}>{sub}</div>}
    </div>
  )
}

function StatsRow({ stats }: { stats: BugStats }) {
  const s = stats.byStatus
  const cards = [
    { key: 'besoin_precision', label: 'À traiter', accent: true },
    { key: 'nouveau', label: 'Nouveaux', accent: false },
    { key: 'en_analyse', label: 'En analyse', accent: false },
    { key: 'corrige', label: 'Corrigés', accent: false },
  ] as const

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))',
        gap: '12px',
        marginBottom: '24px',
      }}
    >
      {cards.map(c => {
        const meta = STATUS_META[c.key as BugReportStatus]
        const count = s[c.key] ?? 0
        return (
          <StatCard
            key={c.key}
            label={c.label}
            value={count}
            color={meta.color}
            accent={c.accent && count > 0}
            sub={meta.hint}
          />
        )
      })}

      <StatCard
        label="Résolution auto"
        value={stats.autoFixRate === null ? '—' : stats.autoFixRate}
        suffix={stats.autoFixRate === null ? undefined : '%'}
        color="#10B981"
        sub={
          stats.autoFixBase > 0
            ? `${stats.byStatus.corrige ?? 0} corrigés sur ${stats.autoFixBase} traités`
            : 'Aucun ticket encore abouti'
        }
      />

      <StatCard
        label="Temps moyen"
        value={stats.avgHandlingMs === null ? '—' : formatDuration(stats.avgHandlingMs)}
        color="#9CA3AF"
        sub={
          stats.avgHandlingCount > 0
            ? `Signalement → issue, sur ${stats.avgHandlingCount} ticket${stats.avgHandlingCount > 1 ? 's' : ''}`
            : 'Pas encore mesurable'
        }
      />
    </div>
  )
}

/* ═══════════════════════ Tableau de bord ═══════════════════════ */

type SortMode = 'recent' | 'ancien' | 'attention'

export default function BugReportsDashboard({ reports, stats }: {
  reports: AdminBugReport[]
  stats: BugStats
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | BugReportStatus>('all')
  const [severityFilter, setSeverityFilter] = useState<'all' | BugReportSeverity>('all')
  const [sort, setSort] = useState<SortMode>('attention')
  const [openId, setOpenId] = useState<string | null>(null)
  // Statuts modifiés depuis l'interface : évite d'attendre le router.refresh().
  const [overrides, setOverrides] = useState<Record<string, BugReportStatus>>({})

  // Un ticket rejeté depuis cette page part aux archives : on le retire
  // immédiatement de la vue au lieu d'attendre le rechargement serveur.
  const effective = useMemo(
    () => reports
      .map(r => (overrides[r.id] ? { ...r, status: overrides[r.id] } : r))
      .filter(r => r.status !== 'rejete'),
    [reports, overrides],
  )

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const r of effective) map[r.status] = (map[r.status] ?? 0) + 1
    return map
  }, [effective])

  const visible = useMemo(() => {
    let list = effective
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter)
    if (severityFilter !== 'all') list = list.filter(r => r.severity === severityFilter)

    return [...list].sort((a, b) => {
      if (sort === 'attention') {
        const rank = ATTENTION_RANK[a.status] - ATTENTION_RANK[b.status]
        if (rank !== 0) return rank
      }
      const delta = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sort === 'ancien' ? delta : -delta
    })
  }, [effective, statusFilter, severityFilter, sort])

  const openReport = openId ? effective.find(r => r.id === openId) ?? null : null
  const toTreat = counts.besoin_precision ?? 0
  const onlyToTreat = statusFilter === 'besoin_precision'
  const archived = stats.archivedCount + Object.values(overrides).filter(s => s === 'rejete').length

  function handleChanged(id: string, status: BugReportStatus) {
    setOverrides(prev => ({ ...prev, [id]: status }))
  }

  return (
    <>
      <SpinnerStyles />

      <StatsRow stats={stats} />

      {/* ── Barre de filtres ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>

        <div className="flex flex-wrap items-center" style={{ gap: '8px' }}>
          {/* Raccourci « À traiter » : un clic pour ne voir que ce qui bloque. */}
          <button
            onClick={() => setStatusFilter(onlyToTreat ? 'all' : 'besoin_precision')}
            className="flex items-center gap-2 cursor-pointer transition-all"
            style={{
              padding: '7px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700,
              fontFamily: "'Outfit', sans-serif",
              border: `1px solid ${onlyToTreat ? '#F59E0B' : 'rgba(245,158,11,0.35)'}`,
              background: onlyToTreat ? 'rgba(245,158,11,0.16)' : 'rgba(245,158,11,0.06)',
              color: '#F59E0B',
            }}
          >
            <Inbox size={13} />
            À traiter
            <span style={{ opacity: 0.75 }}>{toTreat}</span>
          </button>

          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

          {(['all', ...ACTIVE_STATUS_ORDER] as const).map(value => {
            const active = statusFilter === value
            const meta = value === 'all' ? null : STATUS_META[value]
            const count = value === 'all' ? effective.length : (counts[value] ?? 0)
            return (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className="cursor-pointer transition-all"
                style={{
                  padding: '6px 12px', borderRadius: '9px', fontSize: '12.5px',
                  fontFamily: "'Outfit', sans-serif", fontWeight: active ? 700 : 500,
                  border: `1px solid ${active ? (meta?.color ?? '#10B981') : 'rgba(255,255,255,0.08)'}`,
                  background: active ? (meta?.bg ?? 'rgba(16,185,129,0.12)') : 'rgba(255,255,255,0.03)',
                  color: active ? (meta?.color ?? '#10B981') : '#9CA3AF',
                }}
              >
                {value === 'all' ? 'Tous' : meta!.label} <span style={{ opacity: 0.6 }}>{count}</span>
              </button>
            )
          })}

          {/* Les rejetés ne sont plus filtrables ici : ils vivent aux archives. */}
          <Link
            href="/admin/bug-reports/archives"
            className="flex items-center gap-1.5 no-underline transition-all"
            style={{
              marginLeft: 'auto', padding: '6px 12px', borderRadius: '9px', fontSize: '12.5px',
              fontFamily: "'Outfit', sans-serif", fontWeight: 500,
              border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#6B7280',
            }}
          >
            <Archive size={13} />
            Archives <span style={{ opacity: 0.7 }}>{archived}</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center" style={{ gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Sévérité
          </span>
          {(['all', 'critique', 'moyen', 'mineur', 'non_classee'] as const).map(value => {
            const active = severityFilter === value
            const meta = value === 'all' ? null : SEVERITY_META[value]
            return (
              <button
                key={value}
                onClick={() => setSeverityFilter(value)}
                className="cursor-pointer transition-all"
                style={{
                  padding: '5px 11px', borderRadius: '8px', fontSize: '12px',
                  fontFamily: "'Outfit', sans-serif", fontWeight: active ? 700 : 500,
                  border: `1px solid ${active ? (meta?.color ?? '#10B981') : 'rgba(255,255,255,0.07)'}`,
                  background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: active ? (meta?.color ?? '#10B981') : '#6B7280',
                }}
              >
                {value === 'all' ? 'Toutes' : meta!.label}
              </button>
            )
          })}

          <button
            onClick={() => setSort(s => (s === 'attention' ? 'recent' : s === 'recent' ? 'ancien' : 'attention'))}
            className="flex items-center gap-1.5 cursor-pointer transition-all"
            style={{
              marginLeft: 'auto', padding: '6px 12px', borderRadius: '9px', fontSize: '12.5px',
              fontFamily: "'Outfit', sans-serif", fontWeight: 500,
              border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#9CA3AF',
            }}
          >
            <ArrowUpDown size={13} />
            {sort === 'attention' ? 'À traiter d’abord' : sort === 'recent' ? 'Plus récents' : 'Plus anciens'}
          </button>
        </div>
      </div>

      {/* ── Liste ── */}
      {visible.length === 0 ? (
        <div
          style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '18px', padding: '40px', textAlign: 'center', fontSize: '13px', color: '#4B5563',
          }}
        >
          Aucun ticket ne correspond à ces filtres.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {visible.map(report => (
            <TicketCard
              key={report.id}
              report={report}
              onOpen={() => setOpenId(report.id)}
              onChanged={handleChanged}
            />
          ))}
        </div>
      )}

      {/* ── Panneau de détail ── */}
      <AnimatePresence>
        {openReport && (
          <DetailModal
            report={openReport}
            onClose={() => setOpenId(null)}
            onChanged={handleChanged}
          />
        )}
      </AnimatePresence>
    </>
  )
}
