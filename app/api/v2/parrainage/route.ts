import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/admin/serviceClient'

export const dynamic = 'force-dynamic'

/**
 * Parrainage (dashboard v2) : code et lien existants (profiles.referral_code),
 * filleuls inscrits avec ce code (profiles.referred_by) et récompense débloquée
 * quand un filleul signe son premier bail sur ISALY.
 */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('profiles').select('referral_code, referral_count').eq('id', user.id).maybeSingle()
  const code = (me?.referral_code as string | null) ?? ''
  let kids: { id: string; firstName: string; signed: boolean }[] = []
  if (code) {
    try {
      // Service : les profils des filleuls ne sont pas lisibles sous RLS. Seuls
      // le prénom et l'état du bail sortent de cette route.
      const admin = createAdminClient()
      const { data: rows } = await admin.from('profiles').select('id, first_name').eq('referred_by', code).limit(50)
      const ids = (rows ?? []).map(r => r.id as string)
      const { data: leases } = ids.length
        ? await admin.from('leases').select('tenant_id').in('tenant_id', ids).in('status', ['active', 'ended'])
        : { data: [] as { tenant_id: string }[] }
      const signed = new Set((leases ?? []).map(l => l.tenant_id as string))
      kids = (rows ?? []).map(r => ({ id: r.id as string, firstName: (r.first_name as string | null) || 'Filleul', signed: signed.has(r.id as string) }))
    } catch {
      kids = []
    }
  }
  return NextResponse.json({ code, count: Number(me?.referral_count ?? kids.length), kids })
}
