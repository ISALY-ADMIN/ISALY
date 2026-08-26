import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import { BUG_REPORT_COLUMNS } from '../columns'
import type { AdminBugReport } from '../shared'
import ArchivedList from './ArchivedList'
import Emoji from '@/components/ui/Emoji'

export const metadata = { title: 'Tickets archivés — ISALY' }
export const dynamic = 'force-dynamic'

/** Uniquement les tickets écartés à la main depuis la vue principale. */
async function getArchivedReports(): Promise<AdminBugReport[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('bug_reports')
    .select(BUG_REPORT_COLUMNS)
    .eq('status', 'rejete')
    .order('created_at', { ascending: false })
    .limit(500)
  return (data ?? []) as unknown as AdminBugReport[]
}

export default async function AdminBugReportsArchives() {
  await getAdminUser()

  let reports: AdminBugReport[] = []
  let tableMissing = false
  try {
    reports = await getArchivedReports()
  } catch {
    // La table n'existe pas encore : exécuter sql-migrations/36_bug_reports.sql
    tableMissing = true
  }

  return (
    <div style={{ padding: '32px 40px', fontFamily: "'Outfit', sans-serif" }}>

      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/admin/bug-reports"
          className="inline-flex items-center gap-1.5 no-underline"
          style={{ fontSize: '12.5px', fontWeight: 600, color: '#6B7280', marginBottom: '10px' }}
        >
          <ArrowLeft size={13} />
          Retour aux signalements actifs
        </Link>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
          Tickets archivés
        </h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>
          Signalements écartés manuellement. Un rejet erroné se restaure en un clic — le ticket
          repart alors en « nouveau » dans la vue principale.
        </p>
      </div>

      {reports.length === 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '48px', textAlign: 'center', color: '#4B5563' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}><Emoji native="🗂️" /></div>
          <p style={{ margin: 0, fontSize: '14px' }}>
            {tableMissing
              ? "Table absente — exécutez sql-migrations/36_bug_reports.sql dans Supabase."
              : 'Aucun ticket archivé pour le moment.'}
          </p>
        </div>
      ) : (
        <ArchivedList reports={reports} />
      )}

    </div>
  )
}
