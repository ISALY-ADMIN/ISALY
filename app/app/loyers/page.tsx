import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TenantLoyersClient from './TenantLoyersClient'

export default async function LoyersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_mode')
    .eq('id', user.id)
    .single()

  if (profile?.active_mode === 'loueur') {
    redirect('/app/baux?tab=loyers')
  }

  return <TenantLoyersClient />
}
