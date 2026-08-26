import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Actions admin manuelles sur un ticket bug_reports.
 *
 * Volontairement limité aux transitions que l'humain décide : rejeter un
 * faux bug, ou reprendre la main après un échec de l'agent. Les statuts
 * 'en_analyse' et 'corrige' restent pilotés par la chaîne auto-fix.
 */
const VALID_STATUSES = ['rejete', 'en_correction', 'nouveau'] as const
type ValidStatus = typeof VALID_STATUSES[number]

export async function POST(request: Request) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!adminProfile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let bugReportId: string, status: string
  try {
    ;({ bugReportId, status } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!bugReportId || !VALID_STATUSES.includes(status as ValidStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // La policy bug_reports_admin_all (FOR ALL) couvre cette écriture : pas
  // besoin du client service-role, la session admin suffit.
  const { error } = await supabase
    .from('bug_reports')
    .update({ status })
    .eq('id', bugReportId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('admin_actions').insert({
    admin_id: user.id,
    action: `bug_report_${status}`,
    target_type: 'bug_report',
    target_id: bugReportId,
    details: { status },
  })

  return NextResponse.json({ success: true })
}
