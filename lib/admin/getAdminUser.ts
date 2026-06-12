import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export interface AdminUser {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

/** Server-only guard: returns the authenticated admin user or redirects. */
export async function getAdminUser(): Promise<AdminUser> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, avatar_url, is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/app/dashboard-home')

  return {
    id: user.id,
    email: user.email ?? '',
    first_name: profile.first_name,
    last_name: profile.last_name,
    avatar_url: profile.avatar_url,
  }
}
