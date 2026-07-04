import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TenantDashboardClient from './TenantDashboardClient'
import LoueurDashboard from './LoueurDashboard'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'loueur') {
    return <LoueurDashboard ownerId={user.id} />
  }

  return <TenantDashboardClient />
}
