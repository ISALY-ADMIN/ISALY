'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ChevronDown, GitCommit, ExternalLink, Loader2, X, Ban, Wrench, Undo2,
} from 'lucide-react'
import type { BugReportStatus, BugReportSeverity } from '@/types/database'

/* ═══════════════════════════════════════════════════════════════════════════
 * Briques partagées entre la vue principale /admin/bug-reports et l'onglet
 * /admin/bug-reports/archives : mêmes couleurs, mêmes cartes, même panneau
 * de détail, mêmes actions. Une seule définition à maintenir.
 * ═══════════════════════════════════════════════════════════════════════════ */

export const GITHUB_REPO = 'https://github.com/ISALY-ADMIN/ISALY'
export const ACTIONS_URL = `${GITHUB_REPO}/actions/workflows/auto-fix-bug.yml`

/* ═══════════════════════════ Types ═══════════════════════════ */

export interface ReporterRef {
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
  updated_at: string
  user_agent: string | null
  browser_context: Record<string, unknown> | null
  ai_diagnosis: string | null
  ai_plan: string | null
  ai_report: string | null
  commit_sha: string | null
  profiles: ReporterRef | ReporterRef[] | null
}

/* ═══════════════════════ Palette de statuts ═══════════════════════
 * Pas de feu de circulation : le mint est réservé à la réussite, l'ambre
 * signale ce qui réclame l'admin, et tout le reste reste neutre ou indigo
 * (« en vol »). Aucun rouge.
 * ═════════════════════════════════════════════════════════════════ */

export interface StatusMeta { label: string; color: string; bg: string; hint: string }

export const STATUS_META: Record<BugReportStatus, StatusMeta> = {
  nouveau: {
    label: 'Nouveau', color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)',
    hint: 'En attente de prise en charge',
  },
  en_analyse: {
    label: 'En analyse', color: '#6366F1', bg: 'rgba(99,102,241,0.12)',
    hint: "L'agent analyse le code",
  },
  en_correction: {
    label: 'En correction', color: '#818CF8', bg: 'rgba(129,140,248,0.12)',
    hint: 'Correction en cours',
  },
  corrige: {
    label: 'Corrigé', color: '#10B981', bg: 'rgba(16,185,129,0.12)',
    hint: 'Correction poussée sur main',
  },
  besoin_precision: {
    label: 'À traiter', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',
    hint: 'Intervention humaine requise',
  },
  rejete: {
    label: 'Rejeté', color: '#6B7280', bg: 'rgba(107,114,128,0.10)',
    hint: 'Écarté manuellement',
  },
}

export const SEVERITY_META: Record<BugReportSeverity, { label: string; color: string }> = {
  non_classee: { label: 'Non classée', color: '#4B5563' },
  mineur: { label: 'Mineur', color: '#6B7280' },
  moyen: { label: 'Moyen', color: '#F59E0B' },
  critique: { label: 'Critique', color: '#FB923C' },
}

/** Statuts actifs : 'rejete' vit dans l'onglet archives, pas ici. */
export const ACTIVE_STATUS_ORDER: BugReportStatus[] = [
  'besoin_precision', 'nouveau', 'en_analyse', 'en_correction', 'corrige',
]

/** Priorité de tri « à traiter d'abord » : ce qui bloque l'admin remonte. */
export const ATTENTION_RANK: Record<BugReportStatus, number> = {
  besoin_precision: 0, nouveau: 1, en_analyse: 2, en_correction: 3, corrige: 4, rejete: 5,
}

export const IN_FLIGHT: BugReportStatus[] = ['en_analyse', 'en_correction']

/* ═══════════════════════════ Helpers ═══════════════════════════ */

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d < 31) return `il y a ${d} j`
  const mo = Math.floor(d / 30)
  return `il y a ${mo} mois`
}

export function fullDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} min`
  const h = min / 60
  if (h < 24) return `${h.toFixed(h < 10 ? 1 : 0)} h`
  return `${(h / 24).toFixed(1)} j`
}

/** Chemin seul : l'origine est toujours la même, elle n'apporte rien. */
export function shortPath(url: string): string {
  try {
    const u = new URL(url)
    return `${u.pathname}${u.search}`
  } catch {
    return url
  }
}

export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

export function reporterName(raw: AdminBugReport['profiles']): string {
  const p = (Array.isArray(raw) ? raw[0] : raw) ?? null
  if (!p) return 'Anonyme'
  return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email || '—'
}

/** Keyframes du spinner — à inclure une fois par page. */
export function SpinnerStyles() {
  return (
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
      .animate-spin { animation: spin 1s linear infinite; }
    `}</style>
  )
}

/* ═══════════════════════ Actions admin ═══════════════════════ */

export function TicketActions({ report, onChanged }: {
  report: AdminBugReport
  onChanged: (id: string, status: BugReportStatus) => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function update(next: BugReportStatus) {
    setLoading(next)
    try {
      const res = await fetch('/api/admin/update-bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bugReportId: report.id, status: next }),
      })
      if (!res.ok) throw new Error()
      onChanged(report.id, next)
      router.refresh()
    } catch {
      alert('Erreur lors de la mise à jour du ticket.')
    } finally {
      setLoading(null)
    }
  }

  const actions: { key: BugReportStatus; label: string; icon: typeof Ban; color: string }[] = []

  if (report.status === 'rejete') {
    // Un rejet peut être une erreur : on remet le ticket dans le circuit.
    actions.push({ key: 'nouveau', label: 'Restaurer', icon: Undo2, color: '#10B981' })
  } else {
    actions.push({ key: 'rejete', label: 'Rejeter', icon: Ban, color: '#6B7280' })
    if (report.status !== 'en_correction') {
      actions.push({ key: 'en_correction', label: 'Je reprends', icon: Wrench, color: '#818CF8' })
    }
  }

  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {actions.map(a => {
        const Icon = a.icon
        const busy = loading === a.key
        return (
          <button
            key={a.key}
            onClick={e => { e.stopPropagation(); update(a.key) }}
            disabled={loading !== null}
            className="flex items-center gap-1.5 cursor-pointer transition-all"
            style={{
              padding: '5px 11px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              border: `1px solid ${a.color}55`, background: 'transparent', color: a.color,
              opacity: loading !== null ? 0.5 : 1,
              cursor: loading !== null ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
            {a.label}
          </button>
        )
      })}
    </div>
  )
}

/* ═══════════════════════ Carte d'un ticket ═══════════════════════ */

export function TicketCard({ report, onOpen, onChanged }: {
  report: AdminBugReport
  onOpen: () => void
  onChanged: (id: string, status: BugReportStatus) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = STATUS_META[report.status] ?? STATUS_META.nouveau
  const sev = SEVERITY_META[report.severity] ?? SEVERITY_META.non_classee
  const inFlight = IN_FLIGHT.includes(report.status)
  const isLong = report.description.replace(/\s+/g, ' ').trim().length > 160

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${report.status === 'besoin_precision' ? 'rgba(245,158,11,0.28)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '18px',
        padding: '16px 18px',
        backdropFilter: 'blur(12px)',
        // Les archives sont volontairement en retrait visuel.
        opacity: report.status === 'rejete' ? 0.78 : 1,
      }}
    >
      {/* Ligne d'en-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap', marginBottom: '10px' }}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '7px',
            background: meta.bg, color: meta.color, whiteSpace: 'nowrap',
          }}
        >
          {inFlight && <Loader2 size={11} className="animate-spin" />}
          {meta.label}
        </span>

        {report.severity !== 'non_classee' && (
          <span style={{ fontSize: '11px', fontWeight: 600, color: sev.color }}>{sev.label}</span>
        )}

        <span
          title={report.page_url}
          style={{
            fontSize: '11px', fontFamily: 'ui-monospace, monospace', padding: '3px 8px',
            borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: '#9CA3AF',
            maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {shortPath(report.page_url)}
        </span>

        <span style={{ marginLeft: 'auto', fontSize: '11.5px', color: '#4B5563', whiteSpace: 'nowrap' }} title={fullDate(report.created_at)}>
          {relativeTime(report.created_at)} · {reporterName(report.profiles)}
        </span>
      </div>

      {/* Description, dépliable */}
      <div
        onClick={() => isLong && setExpanded(v => !v)}
        style={{
          fontSize: '13.5px', color: '#E5E7EB', lineHeight: 1.6,
          whiteSpace: expanded ? 'pre-wrap' : 'normal',
          cursor: isLong ? 'pointer' : 'default',
        }}
      >
        {expanded ? report.description : truncate(report.description, 160)}
        {isLong && (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
            className="inline-flex items-center gap-1 cursor-pointer"
            style={{
              marginLeft: '8px', background: 'transparent', border: 'none', padding: 0,
              fontSize: '12px', fontWeight: 600, color: '#10B981', fontFamily: "'Outfit', sans-serif",
            }}
          >
            {expanded ? 'Réduire' : 'Développer'}
            <ChevronDown size={12} style={{ transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s ease' }} />
          </button>
        )}
      </div>

      {/* ── Bloc contextuel selon le statut ── */}

      {/* Échec : le motif est l'information la plus utile, jamais repliée. */}
      {report.status === 'besoin_precision' && report.ai_report && (
        <div
          style={{
            marginTop: '12px', padding: '12px 14px', borderRadius: '12px',
            background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.22)',
          }}
        >
          <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
            Pourquoi l&apos;agent s&apos;est arrêté
          </div>
          <div style={{ fontSize: '12.5px', color: '#D1D5DB', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
            {report.ai_report}
          </div>
        </div>
      )}

      {/* Succès : résumé court + lien commit, sans clic supplémentaire. */}
      {report.status === 'corrige' && (report.ai_report || report.commit_sha) && (
        <div
          style={{
            marginTop: '12px', padding: '12px 14px', borderRadius: '12px',
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
          }}
        >
          {report.ai_report && (
            <div style={{ fontSize: '12.5px', color: '#D1D5DB', lineHeight: 1.6, marginBottom: report.commit_sha ? '10px' : 0 }}>
              {truncate(report.ai_report, 260)}
            </div>
          )}
          {report.commit_sha && (
            <a
              href={`${GITHUB_REPO}/commit/${report.commit_sha}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 no-underline"
              style={{
                fontSize: '11.5px', fontWeight: 600, color: '#10B981',
                fontFamily: 'ui-monospace, monospace',
                padding: '4px 9px', borderRadius: '7px',
                background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.3)',
              }}
            >
              <GitCommit size={12} />
              {report.commit_sha.slice(0, 7)}
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      )}

      {/* En vol : état distinct + entrée vers les runs GitHub. */}
      {inFlight && (
        <div
          style={{
            marginTop: '12px', padding: '10px 14px', borderRadius: '12px',
            background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap',
          }}
        >
          <Loader2 size={13} className="animate-spin" style={{ color: '#818CF8' }} />
          <span style={{ fontSize: '12.5px', color: '#A5B4FC' }}>
            Traitement automatique en cours — {meta.hint.toLowerCase()}.
          </span>
          <a
            href={ACTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1 no-underline"
            style={{ marginLeft: 'auto', fontSize: '11.5px', fontWeight: 600, color: '#818CF8' }}
          >
            Voir les exécutions <ExternalLink size={10} />
          </a>
        </div>
      )}

      {/* Pied : détail + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '13px', flexWrap: 'wrap' }}>
        <button
          onClick={onOpen}
          className="cursor-pointer transition-all"
          style={{
            padding: '5px 11px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 600,
            fontFamily: "'Outfit', sans-serif",
            border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#D1D5DB',
          }}
        >
          Détail complet
        </button>
        <div style={{ marginLeft: 'auto' }}>
          <TicketActions report={report} onChanged={onChanged} />
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════ Panneau de détail ═══════════════════════ */

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: mono ? '11.5px' : '13px', color: '#D1D5DB', lineHeight: 1.65,
          whiteSpace: 'pre-wrap', wordBreak: mono ? 'break-all' : 'normal',
          fontFamily: mono ? 'ui-monospace, monospace' : undefined,
        }}
      >
        {value}
      </div>
    </div>
  )
}

export function DetailModal({ report, onClose, onChanged }: {
  report: AdminBugReport
  onClose: () => void
  onChanged: (id: string, status: BugReportStatus) => void
}) {
  const meta = STATUS_META[report.status] ?? STATUS_META.nouveau
  const sev = SEVERITY_META[report.severity] ?? SEVERITY_META.non_classee

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0"
        style={{ zIndex: 80, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
      />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label="Détail du signalement"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="fixed top-0 right-0 bottom-0 flex flex-col overflow-hidden"
        style={{
          zIndex: 81, width: 'min(560px, 94vw)', background: '#0E0E0E',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-12px 0 48px rgba(0,0,0,0.6)',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        {/* En-tête */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '10px' }}>
            <span
              style={{
                fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '7px',
                background: meta.bg, color: meta.color,
              }}
            >
              {meta.label}
            </span>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="flex items-center justify-center border-none cursor-pointer rounded-full"
              style={{ width: 30, height: 30, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
            >
              <X size={15} />
            </button>
          </div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>
            Ticket #{report.id.slice(0, 8)}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '3px' }}>
            {reporterName(report.profiles)} · sévérité {sev.label.toLowerCase()}
          </div>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <DetailField label="Description" value={report.description} />
          <DetailField label="Page concernée" value={report.page_url} mono />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <DetailField label="Créé le" value={fullDate(report.created_at)} />
            <DetailField label="Mis à jour le" value={report.updated_at ? fullDate(report.updated_at) : '—'} />
          </div>

          {report.user_agent && <DetailField label="User agent" value={report.user_agent} mono />}

          {report.browser_context && (
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
                Contexte navigateur
              </div>
              <pre
                style={{
                  fontSize: '11px', color: '#9CA3AF', background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px',
                  padding: '12px 14px', overflowX: 'auto', margin: 0,
                }}
              >
                {JSON.stringify(report.browser_context, null, 2)}
              </pre>
            </div>
          )}

          {(report.ai_diagnosis || report.ai_plan || report.ai_report) && (
            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
          )}

          {report.ai_diagnosis && <DetailField label="Diagnostic de l'agent" value={report.ai_diagnosis} />}
          {report.ai_plan && <DetailField label="Plan de correction" value={report.ai_plan} />}
          {report.ai_report && <DetailField label="Rapport final" value={report.ai_report} />}

          {report.commit_sha && (
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                Commit
              </div>
              <a
                href={`${GITHUB_REPO}/commit/${report.commit_sha}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 no-underline"
                style={{
                  fontSize: '12px', fontWeight: 600, color: '#10B981',
                  fontFamily: 'ui-monospace, monospace',
                  padding: '6px 11px', borderRadius: '8px',
                  background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.3)',
                }}
              >
                <GitCommit size={13} />
                {report.commit_sha.slice(0, 12)}
                <ExternalLink size={11} />
              </a>
            </div>
          )}
        </div>

        {/* Pied : actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <TicketActions report={report} onChanged={onChanged} />
        </div>
      </motion.aside>
    </>
  )
}
