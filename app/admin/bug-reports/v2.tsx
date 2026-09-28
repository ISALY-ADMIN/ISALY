'use client'

/**
 * Site v2 : retours bêta dans le style de l'administration (vAdmBugs de la
 * maquette). Même données, mêmes filtres, mêmes actions (/api/admin/update-
 * bug-report) et même capture signée que BugReportsDashboard / shared.tsx,
 * conservés tels quels.
 */
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Icon, Modal, Pill, type Tone } from '@/components/ui-v2'
import type { BugReportSeverity, BugReportStatus } from '@/types/database'
import {
  ACTIVE_STATUS_ORDER, ATTENTION_RANK, GITHUB_REPO, SEVERITY_META, STATUS_META,
  fullDate, reporterName, relativeTime, shortPath, truncate, type AdminBugReport,
} from './shared'

const TONE: Record<BugReportStatus, Tone> = {
  nouveau: 'info',
  en_analyse: 'brand',
  en_correction: 'brand',
  corrige: 'ok',
  besoin_precision: 'warn',
  rejete: '',
}

type SortMode = 'attention' | 'recent' | 'ancien'

/* ── Actions (mêmes transitions que TicketActions) ────────────────── */
export function TicketActionsV2({ report, onChanged }: {
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

  const actions: { key: BugReportStatus; label: string }[] = report.status === 'rejete'
    ? [{ key: 'nouveau', label: 'Restaurer' }]
    : [
        ...(report.status !== 'en_correction' ? [{ key: 'en_correction' as BugReportStatus, label: 'Je reprends' }] : []),
        { key: 'rejete', label: 'Rejeter' },
      ]

  return (
    <span className="acts">
      {actions.map(a => (
        <button key={a.key} className="btn btn-ghost btn-sm" type="button" disabled={loading !== null} onClick={e => { e.stopPropagation(); update(a.key) }}>
          {loading === a.key ? 'Enregistrement…' : a.label}
        </button>
      ))}
    </span>
  )
}

/* ── Capture d'écran : URL signée du bucket privé, 5 minutes ─────── */
function Screenshot({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    setUrl(null)
    setFailed(false)
    createClient().storage.from('bug-screenshots').createSignedUrl(path, 300)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data?.signedUrl) setFailed(true)
        else setUrl(data.signedUrl)
      })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [path])
  if (failed) return <div className="note"><Icon name="image" size={18} /><span>Capture indisponible : fichier manquant ou lien expiré.</span></div>
  if (!url) return <div className="docprev">Chargement de la capture…</div>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Capture d’écran jointe au retour" style={{ width: '100%', borderRadius: 14, border: '1px solid var(--line)' }} onError={() => setFailed(true)} />
    </a>
  )
}

function Field({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="field">
      <span className="flabel">{label}</span>
      <div className="soft" style={{ whiteSpace: 'pre-wrap', wordBreak: mono ? 'break-all' : 'normal', fontFamily: mono ? 'ui-monospace, Menlo, Consolas, monospace' : undefined, fontSize: mono ? 13 : undefined }}>{children}</div>
    </div>
  )
}

/* ── Détail d'un retour ───────────────────────────────────────────── */
export function BugDetailV2({ report, onClose, onChanged }: {
  report: AdminBugReport
  onClose: () => void
  onChanged: (id: string, status: BugReportStatus) => void
}) {
  const meta = STATUS_META[report.status] ?? STATUS_META.nouveau
  const sev = SEVERITY_META[report.severity] ?? SEVERITY_META.non_classee
  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={`Ticket ${report.id.slice(0, 8)}`}
      lead={`${reporterName(report.profiles)}, sévérité ${sev.label.toLowerCase()}`}
      footer={<TicketActionsV2 report={report} onChanged={(id, s) => { onChanged(id, s); if (s === 'rejete' || s === 'nouveau') onClose() }} />}
    >
      <div className="form">
        <div className="chips"><Pill tone={TONE[report.status]}>{meta.label}</Pill><span className="s">{meta.hint}</span></div>
        <Field label="Description">{report.description}</Field>
        <Field label="Page concernée" mono>{report.page_url}</Field>
        <div className="kv">
          <div><span>Créé le</span><b>{fullDate(report.created_at)}</b></div>
          <div><span>Mis à jour le</span><b>{report.updated_at ? fullDate(report.updated_at) : '-'}</b></div>
        </div>
        {report.screenshot_url && <Field label="Capture d’écran"><Screenshot path={report.screenshot_url} /></Field>}
        {report.user_agent && <Field label="Navigateur" mono>{report.user_agent}</Field>}
        {report.browser_context && <Field label="Contexte technique" mono>{JSON.stringify(report.browser_context, null, 2)}</Field>}
        {report.ai_diagnosis && <Field label="Diagnostic de l’agent">{report.ai_diagnosis}</Field>}
        {report.ai_plan && <Field label="Plan de correction">{report.ai_plan}</Field>}
        {report.ai_report && <Field label="Rapport final">{report.ai_report}</Field>}
        {report.commit_sha && (
          <Field label="Commit">
            <a className="link" href={`${GITHUB_REPO}/commit/${report.commit_sha}`} target="_blank" rel="noopener noreferrer">{report.commit_sha.slice(0, 12)}</a>
          </Field>
        )}
      </div>
    </Modal>
  )
}

/* ── Tableau des retours (vue principale et archives) ─────────────── */
export function BugTable({ reports, archived, archivedCount = 0 }: { reports: AdminBugReport[]; archived?: boolean; archivedCount?: number }) {
  const [statusFilter, setStatusFilter] = useState<'all' | BugReportStatus>('all')
  const [severityFilter, setSeverityFilter] = useState<'all' | BugReportSeverity>('all')
  const [sort, setSort] = useState<SortMode>(archived ? 'recent' : 'attention')
  const [openId, setOpenId] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Record<string, BugReportStatus>>({})

  // Un ticket rejeté (ou restauré depuis les archives) quitte la vue tout de suite.
  const effective = useMemo(
    () => reports
      .map(r => (overrides[r.id] ? { ...r, status: overrides[r.id] } : r))
      .filter(r => (archived ? r.status === 'rejete' : r.status !== 'rejete')),
    [reports, overrides, archived],
  )
  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const r of effective) m[r.status] = (m[r.status] ?? 0) + 1
    return m
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
      const d = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sort === 'ancien' ? d : -d
    })
  }, [effective, statusFilter, severityFilter, sort])
  const open = openId ? effective.find(r => r.id === openId) ?? null : null
  const archivedNow = archivedCount + Object.values(overrides).filter(s => s === 'rejete').length
  const changed = (id: string, s: BugReportStatus) => setOverrides(p => ({ ...p, [id]: s }))

  return (
    <>
      <div className="tbar">
        {!archived && (
          <div className="seg" role="group" aria-label="Filtrer par statut">
            {(['all', ...ACTIVE_STATUS_ORDER] as const).map(v => (
              <button key={v} type="button" aria-pressed={statusFilter === v} onClick={() => setStatusFilter(v)}>
                {v === 'all' ? 'Tous' : STATUS_META[v].label}
                <span className="n">{v === 'all' ? effective.length : counts[v] ?? 0}</span>
              </button>
            ))}
          </div>
        )}
        <span className="acts">
          <label className="sr" htmlFor="bug-sev">Sévérité</label>
          <select id="bug-sev" className="select" style={{ height: 42, width: 'auto' }} value={severityFilter} onChange={e => setSeverityFilter(e.target.value as 'all' | BugReportSeverity)}>
            <option value="all">Toutes les sévérités</option>
            {(['critique', 'moyen', 'mineur', 'non_classee'] as const).map(s => <option key={s} value={s}>{SEVERITY_META[s].label}</option>)}
          </select>
          <button className="btn btn-glass btn-sm" type="button" onClick={() => setSort(s => (s === 'attention' ? 'recent' : s === 'recent' ? 'ancien' : 'attention'))}>
            {sort === 'attention' ? 'À traiter d’abord' : sort === 'recent' ? 'Plus récents' : 'Plus anciens'}
          </button>
          {archived
            ? <Link className="btn btn-glass btn-sm" href="/admin/bug-reports"><Icon name="back" size={16} />Retours actifs</Link>
            : <Link className="btn btn-glass btn-sm" href="/admin/bug-reports/archives"><Icon name="inbox" size={16} />{`Archives (${archivedNow})`}</Link>}
        </span>
      </div>

      <div className="panel" style={{ padding: '8px 8px 4px' }}>
        <div className="tscroll">
          <table className="tbl">
            <thead><tr><th>Retour</th><th>Page</th><th>Statut</th><th>Reçu</th><th><span className="sr">Actions</span></th></tr></thead>
            <tbody>
              {visible.map(r => {
                const meta = STATUS_META[r.status] ?? STATUS_META.nouveau
                return (
                  <tr key={r.id}>
                    <td><b>{truncate(r.description, 90)}</b><br /><span className="s">{`${reporterName(r.profiles)}, ${(SEVERITY_META[r.severity] ?? SEVERITY_META.non_classee).label.toLowerCase()}`}</span></td>
                    <td>{shortPath(r.page_url)}</td>
                    <td><Pill tone={TONE[r.status]}>{meta.label}</Pill></td>
                    <td>{relativeTime(r.created_at)}</td>
                    <td>
                      <span className="acts">
                        <button className="btn btn-glass btn-sm" type="button" onClick={() => setOpenId(r.id)}>Ouvrir</button>
                        <TicketActionsV2 report={r} onChanged={changed} />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && <p className="soft" style={{ padding: '18px 12px', textAlign: 'center' }}>Aucun ticket ne correspond à ces filtres.</p>}
      </div>

      {open && <BugDetailV2 report={open} onClose={() => setOpenId(null)} onChanged={changed} />}
    </>
  )
}
