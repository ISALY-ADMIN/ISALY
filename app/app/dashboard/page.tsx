import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TenantDashboardClient from './TenantDashboardClient'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Le bento loueur vit sur /app/dashboard-home — cette page reste la gestion
  // locative du locataire (liens « Mon bail » du bento, retour /app/bail…).
  if (profile?.role === 'loueur') redirect('/app/dashboard-home')

  return <TenantDashboardClient />
}
