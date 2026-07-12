import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/admin/serviceClient'

/** GET — badges sidebar admin : documents en attente + avis signalés + signalements ouverts. */
export async function GET() {
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

  const admin = createAdminClient()
  const [docsRes, reviewsRes, reportsRes] = await Promise.all([
    admin.from('user_documents').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('user_reviews').select('id', { count: 'exact', head: true }).eq('reported', true),
    admin.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ])

  return NextResponse.json({
    pendingDocuments: docsRes.count ?? 0,
    reportedReviews: reviewsRes.count ?? 0,
    openReports: reportsRes.count ?? 0,
  })
}
