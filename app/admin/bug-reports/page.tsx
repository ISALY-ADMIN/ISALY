import { createClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin/getAdminUser'
// [HIDDEN] ancien tableau de bord (thème sombre), plus rendu : import BugReportsDashboard from './BugReportsDashboard'
import type { BugStats } from './BugReportsDashboard'
import { BugTable } from './v2'
import { formatDuration } from './shared'
import { EmptyState } from '@/components/ui-v2'
import type { AdminBugReport } from './shared'
import { BUG_REPORT_COLUMNS } from './columns'
export const metadata = { title: 'Signalements de bugs — ISALY' }
export const dynamic = 'force-dynamic'

/**
 * Vue principale : les tickets rejetés sont exclus dès la requête. Ils ne
 * pèsent donc ni sur la liste, ni sur les stats, ni sur le total du sous-titre
 * — ils vivent dans /admin/bug-reports/archives.
 */
async function getActiveBugReports(): Promise<AdminBugReport[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('bug_reports')
    .select(BUG_REPORT_COLUMNS)
    .neq('status', 'rejete')
    .order('created_at', { ascending: false })
    .limit(500)
  return (data ?? []) as unknown as AdminBugReport[]
}

/** Compteur des archives, pour le lien vers l'onglet dédié. */
async function getArchivedCount(): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('bug_reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'rejete')
  return count ?? 0
}

/**
 * Statistiques calculées côté serveur : la liste est déjà chargée, autant
 * éviter de refaire le travail dans le navigateur à chaque re-render.
 */
function computeStats(reports: AdminBugReport[], archivedCount: number): BugStats {
  const byStatus: Record<string, number> = {}
  for (const r of reports) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1

  const corrige = byStatus.corrige ?? 0
  const besoinPrecision = byStatus.besoin_precision ?? 0

  // Dénominateur : les deux issues que produit l'agent. Les tickets encore en
  // vol (nouveau / en_analyse / en_correction) et les rejets manuels sont
  // exclus — ils ne disent rien de la réussite de la correction automatique.
  const traites = corrige + besoinPrecision
  const autoFixRate = traites > 0 ? Math.round((corrige / traites) * 100) : null

  // Durée de traitement : created_at → updated_at sur les tickets aboutis.
  const durations = reports
    .filter(r => (r.status === 'corrige' || r.status === 'besoin_precision') && r.updated_at)
    .map(r => new Date(r.updated_at).getTime() - new Date(r.created_at).getTime())
    .filter(ms => Number.isFinite(ms) && ms >= 0)

  const avgMs = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null

  return {
    total: reports.length,
    byStatus,
    autoFixRate,
    autoFixBase: traites,
    avgHandlingMs: avgMs,
    avgHandlingCount: durations.length,
    archivedCount,
  }
}

export default async function AdminBugReports() {
  await getAdminUser()

  let reports: AdminBugReport[] = []
  let archivedCount = 0
  let tableMissing = false
  try {
    ;[reports, archivedCount] = await Promise.all([getActiveBugReports(), getArchivedCount()])
  } catch {
    // La table n'existe pas encore : exécuter sql-migrations/36_bug_reports.sql
    tableMissing = true
  }

  const stats = computeStats(reports, archivedCount)
  const avg = stats.avgHandlingMs != null ? formatDuration(stats.avgHandlingMs) : '-'

  return (
    <>
      <section className="panel kpis">
        <div className="kpi"><div className="l">Tickets actifs</div><div className="v num">{stats.total}</div><div className="d">{`${stats.archivedCount} archivés`}</div></div>
        <div className="kpi"><div className="l">À traiter</div><div className="v num">{stats.byStatus.besoin_precision ?? 0}</div><div className="d">intervention humaine requise</div></div>
        <div className="kpi"><div className="l">Correction automatique</div><div className="v num">{stats.autoFixRate != null ? `${stats.autoFixRate} %` : '-'}</div><div className="d">{`sur ${stats.autoFixBase} tickets traités`}</div></div>
        <div className="kpi"><div className="l">Durée moyenne</div><div className="v num">{avg}</div><div className="d">{`sur ${stats.avgHandlingCount} tickets aboutis`}</div></div>
      </section>
      <div className="mt">
        {reports.length === 0 ? (
          <EmptyState
            icon="bug"
            title={tableMissing ? 'Table absente' : archivedCount > 0 ? 'Aucun ticket actif' : 'Aucun retour pour le moment'}
            text={tableMissing
              ? 'Exécute sql-migrations/36_bug_reports.sql dans Supabase.'
              : archivedCount > 0 ? 'Les tickets rejetés sont dans les archives.' : undefined}
          />
        ) : (
          <BugTable reports={reports} archivedCount={archivedCount} />
        )}
      </div>
    </>
  )
}

/* [HIDDEN] Ancienne version (avant le site v2), conservée pour référence :
import { createClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import BugReportsDashboard, { BugStats } from './BugReportsDashboard'
import type { AdminBugReport } from './shared'
import { BUG_REPORT_COLUMNS } from './columns'
import Emoji from '@/components/ui/Emoji'

export const metadata = { title: 'Signalements de bugs — ISALY' }
export const dynamic = 'force-dynamic'

/**
 * Vue principale : les tickets rejetés sont exclus dès la requête. Ils ne
 * pèsent donc ni sur la liste, ni sur les stats, ni sur le total du sous-titre
 * — ils vivent dans /admin/bug-reports/archives.
 * /
async function getActiveBugReports(): Promise<AdminBugReport[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('bug_reports')
    .select(BUG_REPORT_COLUMNS)
    .neq('status', 'rejete')
    .order('created_at', { ascending: false })
    .limit(500)
  return (data ?? []) as unknown as AdminBugReport[]
}

/** Compteur des archives, pour le lien vers l'onglet dédié. * /
async function getArchivedCount(): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('bug_reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'rejete')
  return count ?? 0
}

/**
 * Statistiques calculées côté serveur : la liste est déjà chargée, autant
 * éviter de refaire le travail dans le navigateur à chaque re-render.
 * /
function computeStats(reports: AdminBugReport[], archivedCount: number): BugStats {
  const byStatus: Record<string, number> = {}
  for (const r of reports) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1

  const corrige = byStatus.corrige ?? 0
  const besoinPrecision = byStatus.besoin_precision ?? 0

  // Dénominateur : les deux issues que produit l'agent. Les tickets encore en
  // vol (nouveau / en_analyse / en_correction) et les rejets manuels sont
  // exclus — ils ne disent rien de la réussite de la correction automatique.
  const traites = corrige + besoinPrecision
  const autoFixRate = traites > 0 ? Math.round((corrige / traites) * 100) : null

  // Durée de traitement : created_at → updated_at sur les tickets aboutis.
  const durations = reports
    .filter(r => (r.status === 'corrige' || r.status === 'besoin_precision') && r.updated_at)
    .map(r => new Date(r.updated_at).getTime() - new Date(r.created_at).getTime())
    .filter(ms => Number.isFinite(ms) && ms >= 0)

  const avgMs = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null

  return {
    total: reports.length,
    byStatus,
    autoFixRate,
    autoFixBase: traites,
    avgHandlingMs: avgMs,
    avgHandlingCount: durations.length,
    archivedCount,
  }
}

export default async function AdminBugReports() {
  await getAdminUser()

  let reports: AdminBugReport[] = []
  let archivedCount = 0
  let tableMissing = false
  try {
    ;[reports, archivedCount] = await Promise.all([getActiveBugReports(), getArchivedCount()])
  } catch {
    // La table n'existe pas encore : exécuter sql-migrations/36_bug_reports.sql
    tableMissing = true
  }

  const stats = computeStats(reports, archivedCount)

  return (
    <div style={{ padding: '32px 40px', fontFamily: "'Outfit', sans-serif" }}>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
          Signalements de bugs
        </h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>
          Pilotage de la correction assistée par IA · {stats.total} ticket{stats.total !== 1 ? 's' : ''} actif{stats.total !== 1 ? 's' : ''}
          {archivedCount > 0 && ` · ${archivedCount} archivé${archivedCount !== 1 ? 's' : ''}`}
        </p>
      </div>

      {reports.length === 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '48px', textAlign: 'center', color: '#4B5563' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}><Emoji native="🐛" /></div>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {tableMissing
              ? "Table absente — exécutez sql-migrations/36_bug_reports.sql dans Supabase."
              : archivedCount > 0
                ? 'Aucun ticket actif. Les tickets rejetés sont dans les archives.'
                : 'Aucun bug signalé pour le moment.'}
          </p>
        </div>
      ) : (
        <BugReportsDashboard reports={reports} stats={stats} />
      )}

    </div>
  )
}
*/
