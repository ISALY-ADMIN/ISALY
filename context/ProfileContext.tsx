'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UserProfile {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  role: string
  city: string
  initials: string
  email: string
}

interface ProfileCtx {
  profile: UserProfile | null
  loading: boolean
  refresh: () => Promise<void>
}

const Ctx = createContext<ProfileCtx>({ profile: null, loading: true, refresh: async () => {} })

const COLORS = ['#4ECBA0', '#6366F1', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316', '#A855F7']
export function colorFromId(id: string): string {
  const n = Array.from(id).reduce((a, c) => a + c.charCodeAt(0), 0)
  return COLORS[n % COLORS.length]
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, role, city')
        .eq('id', user.id)
        .single()

      const fn = data?.first_name ?? ''
      const ln = data?.last_name ?? ''
      setProfile({
        id: user.id,
        firstName: fn,
        lastName: ln,
        avatarUrl: data?.avatar_url ?? null,
        role: data?.role ?? 'tenant',
        city: data?.city ?? '',
        initials: `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase() || '?',
        email: user.email ?? '',
      })
    } catch {
      // Supabase not configured — leave profile null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return <Ctx.Provider value={{ profile, loading, refresh: load }}>{children}</Ctx.Provider>
}

export const useProfile = () => useContext(Ctx)
