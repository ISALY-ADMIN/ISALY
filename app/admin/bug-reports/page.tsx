import { createClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import BugReportsList, { AdminBugReport } from './BugReportsList'
import Emoji from '@/components/ui/Emoji'

export const metadata = { title: 'Signalements de bugs — ISALY' }
export const dynamic = 'force-dynamic'

async function getBugReports(): Promise<AdminBugReport[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('bug_reports')
    .select(`
      id, description, page_url, status, severity, created_at, user_agent, browser_context,
      profiles:user_id (first_name, last_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(500)
  return (data ?? []) as unknown as AdminBugReport[]
}

export default async function AdminBugReports() {
  await getAdminUser()

  let reports: AdminBugReport[] = []
  let tableMissing = false
  try {
    reports = await getBugReports()
  } catch {
    // La table n'existe pas encore : exécuter sql-migrations/36_bug_reports.sql
    tableMissing = true
  }

  const newCount = reports.filter(r => r.status === 'nouveau').length

  return (
    <div style={{ padding: '32px 40px', fontFamily: "'Outfit', sans-serif" }}>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
          Signalements de bugs
        </h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>
          {newCount} nouveau{newCount !== 1 ? 'x' : ''} · {reports.length} total
        </p>
      </div>

      {reports.length === 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '48px', textAlign: 'center', color: '#4B5563' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}><Emoji native="🐛" /></div>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {tableMissing
              ? "Table absente — exécutez sql-migrations/36_bug_reports.sql dans Supabase."
              : 'Aucun bug signalé pour le moment.'}
          </p>
        </div>
      ) : (
        <BugReportsList reports={reports} />
      )}

    </div>
  )
}
