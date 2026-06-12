import { createClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import ReportActions from './ReportActions'

async function getReports() {
  const supabase = createClient()
  const { data } = await supabase
    .from('reports')
    .select(`
      id, target_type, target_id, reason, details, status, created_at,
      profiles:reporter_id (first_name, last_name, email)
    `)
    .order('created_at', { ascending: false })
  return data ?? []
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  open:      { bg: 'rgba(239,68,68,0.12)',   color: '#EF4444', label: 'Ouvert' },
  reviewing: { bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B', label: 'En cours' },
  resolved:  { bg: 'rgba(78,203,160,0.12)',  color: '#4ECBA0', label: 'Résolu' },
  dismissed: { bg: 'rgba(107,114,128,0.12)', color: '#6B7280', label: 'Ignoré' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminSignalements() {
  await getAdminUser()
  let reports: Awaited<ReturnType<typeof getReports>> = []
  try {
    reports = await getReports()
  } catch {
    // reports table might not exist yet (run sql-migrations/06_admin_signalements.sql)
  }

  const openCount = reports.filter(r => r.status === 'open').length

  return (
    <div style={{ padding: '32px 40px', fontFamily: "'Outfit', sans-serif" }}>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
          Signalements
        </h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>
          {openCount} ouvert{openCount !== 1 ? 's' : ''} · {reports.length} total
        </p>
      </div>

      {reports.length === 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '48px', textAlign: 'center', color: '#4B5563' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🚩</div>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Aucun signalement.{reports.length === 0 ? ' (Exécutez sql-migrations/06_admin_signalements.sql si la table n\'existe pas encore.)' : ''}
          </p>
        </div>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
          {/* Head */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 160px', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px' }}>
            {['Signalement', 'Cible', 'Motif', 'Signalé par', 'Statut', 'Actions'].map(h => (
              <div key={h} style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</div>
            ))}
          </div>

          {reports.map((report, i) => {
            const reporterRaw = report.profiles
            const reporter = (Array.isArray(reporterRaw) ? reporterRaw[0] : reporterRaw) as { first_name: string | null; last_name: string | null; email: string | null } | null
            const reporterName = `${reporter?.first_name ?? ''} ${reporter?.last_name ?? ''}`.trim() || reporter?.email || '—'
            const s = STATUS_STYLE[report.status] ?? STATUS_STYLE.open

            return (
              <div
                key={report.id}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 160px', padding: '13px 20px', borderBottom: i < reports.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB', marginBottom: '2px' }}>
                    Signalement #{report.id.slice(0, 8)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#4B5563' }}>{formatDate(report.created_at)}</div>
                </div>

                <div style={{ fontSize: '12px', color: '#9CA3AF', textTransform: 'capitalize' }}>
                  {report.target_type}
                </div>

                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                  {report.reason}
                </div>

                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                  {reporterName}
                </div>

                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: s.bg, color: s.color }}>
                    {s.label}
                  </span>
                </div>

                <ReportActions reportId={report.id} currentStatus={report.status} />
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}
