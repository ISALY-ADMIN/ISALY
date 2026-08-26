'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ArrowUpDown } from 'lucide-react'
import type { BugReportStatus, BugReportSeverity } from '@/types/database'

interface ReporterRef {
  first_name: string | null
  last_name: string | null
  email: string | null
}

export interface AdminBugReport {
  id: string
  description: string
  page_url: string
  status: BugReportStatus
  severity: BugReportSeverity
  created_at: string
  user_agent: string | null
  browser_context: Record<string, unknown> | null
  profiles: ReporterRef | ReporterRef[] | null
}

/* Palette alignée sur /admin/signalements : même vocabulaire visuel. */
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  nouveau:          { bg: 'rgba(239,68,68,0.12)',   color: '#EF4444', label: 'Nouveau' },
  en_analyse:       { bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B', label: 'En analyse' },
  en_correction:    { bg: 'rgba(99,102,241,0.12)',  color: '#6366F1', label: 'En correction' },
  corrige:          { bg: 'rgba(16,185,129,0.12)',  color: '#10B981', label: 'Corrigé' },
  rejete:           { bg: 'rgba(107,114,128,0.12)', color: '#6B7280', label: 'Rejeté' },
  besoin_precision: { bg: 'rgba(139,92,246,0.12)',  color: '#8B5CF6', label: 'Besoin de précision' },
}

const SEVERITY_STYLE: Record<string, { color: string; label: string }> = {
  non_classee: { color: '#4B5563', label: 'Non classée' },
  mineur:      { color: '#6B7280', label: 'Mineur' },
  moyen:       { color: '#F59E0B', label: 'Moyen' },
  critique:    { color: '#EF4444', label: 'Critique' },
}

const STATUS_ORDER: BugReportStatus[] = [
  'nouveau', 'en_analyse', 'en_correction', 'besoin_precision', 'corrige', 'rejete',
]

const GRID = '2.4fr 1.3fr 1fr 0.9fr 0.9fr 32px'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

/** Chemin seul : l'origine est toujours la même, elle n'apporte rien à la lecture. */
function shortPath(url: string) {
  try {
    const u = new URL(url)
    return `${u.pathname}${u.search}`
  } catch {
    return url
  }
}

function truncate(text: string, max = 110) {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

export default function BugReportsList({ reports }: { reports: AdminBugReport[] }) {
  const [statusFilter, setStatusFilter] = useState<'all' | BugReportStatus>('all')
  const [sortDesc, setSortDesc] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const r of reports) map[r.status] = (map[r.status] ?? 0) + 1
    return map
  }, [reports])

  const visible = useMemo(() => {
    const list = statusFilter === 'all' ? reports : reports.filter(r => r.status === statusFilter)
    return [...list].sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sortDesc ? -diff : diff
    })
  }, [reports, statusFilter, sortDesc])

  return (
    <>
      {/* ── Filtres par statut + tri ── */}
      <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: '16px' }}>
        {(['all', ...STATUS_ORDER] as const).map(value => {
          const active = statusFilter === value
          const s = value === 'all' ? null : STATUS_STYLE[value]
          const label = value === 'all' ? 'Tous' : s!.label
          const count = value === 'all' ? reports.length : (counts[value] ?? 0)
          return (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className="cursor-pointer transition-all"
              style={{
                padding: '6px 12px', borderRadius: '9px', fontSize: '12.5px',
                fontFamily: "'Outfit', sans-serif", fontWeight: active ? 700 : 500,
                border: `1px solid ${active ? (s?.color ?? '#10B981') : 'rgba(255,255,255,0.08)'}`,
                background: active ? (s?.bg ?? 'rgba(16,185,129,0.12)') : 'rgba(255,255,255,0.03)',
                color: active ? (s?.color ?? '#10B981') : '#9CA3AF',
              }}
            >
              {label} <span style={{ opacity: 0.6 }}>{count}</span>
            </button>
          )
        })}

        <button
          onClick={() => setSortDesc(v => !v)}
          className="flex items-center gap-1.5 cursor-pointer transition-all"
          style={{
            marginLeft: 'auto', padding: '6px 12px', borderRadius: '9px', fontSize: '12.5px',
            fontFamily: "'Outfit', sans-serif", fontWeight: 500,
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#9CA3AF',
          }}
        >
          <ArrowUpDown size={13} />
          {sortDesc ? 'Plus récents' : 'Plus anciens'}
        </button>
      </div>

      {/* ── Liste ── */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: GRID, borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px', gap: '12px' }}>
          {['Description', 'Page', 'Signalé par', 'Sévérité', 'Statut', ''].map((h, i) => (
            <div key={i} style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</div>
          ))}
        </div>

        {visible.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#4B5563' }}>
            Aucun ticket avec ce statut.
          </div>
        ) : visible.map((report, i) => {
          const raw = report.profiles
          const reporter = (Array.isArray(raw) ? raw[0] : raw) ?? null
          const reporterName = reporter
            ? (`${reporter.first_name ?? ''} ${reporter.last_name ?? ''}`.trim() || reporter.email || '—')
            : 'Anonyme'
          const s = STATUS_STYLE[report.status] ?? STATUS_STYLE.nouveau
          const sev = SEVERITY_STYLE[report.severity] ?? SEVERITY_STYLE.non_classee
          const isOpen = expanded === report.id

          return (
            <div key={report.id} style={{ borderBottom: i < visible.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              {/* Ligne compacte — cliquable pour dérouler le contexte technique.
                  La vue détail dédiée (diagnostic + plan IA) arrivera à l'étape suivante. */}
              <div
                onClick={() => setExpanded(isOpen ? null : report.id)}
                className="cursor-pointer transition-colors"
                style={{ display: 'grid', gridTemplateColumns: GRID, gap: '12px', padding: '13px 20px', alignItems: 'center', background: isOpen ? 'rgba(255,255,255,0.02)' : undefined }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB', marginBottom: '2px' }}>
                    {truncate(report.description)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#4B5563' }}>{formatDate(report.created_at)}</div>
                </div>

                <div style={{ fontSize: '12px', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={report.page_url}>
                  {shortPath(report.page_url)}
                </div>

                <div style={{ fontSize: '12px', color: reporter ? '#9CA3AF' : '#4B5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {reporterName}
                </div>

                <div style={{ fontSize: '12px', fontWeight: 600, color: sev.color }}>
                  {sev.label}
                </div>

                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
                    {s.label}
                  </span>
                </div>

                <ChevronDown
                  size={15}
                  style={{ color: '#4B5563', transform: isOpen ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s ease' }}
                />
              </div>

              {isOpen && (
                <div style={{ padding: '4px 20px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '13px', color: '#D1D5DB', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {report.description}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#6B7280', wordBreak: 'break-all' }}>
                    <strong style={{ color: '#4B5563' }}>URL</strong> {report.page_url}
                  </div>
                  {report.user_agent && (
                    <div style={{ fontSize: '11.5px', color: '#6B7280', wordBreak: 'break-all' }}>
                      <strong style={{ color: '#4B5563' }}>User agent</strong> {report.user_agent}
                    </div>
                  )}
                  {report.browser_context && (
                    <pre style={{ fontSize: '11px', color: '#6B7280', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 12px', overflowX: 'auto', margin: 0 }}>
                      {JSON.stringify(report.browser_context, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
