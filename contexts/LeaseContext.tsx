'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ActiveLease {
  id: string
  address: string
  city: string
  monthly_rent: number
  start_date: string
  end_date: string | null
  nb_roommates: number
  status: string
  owner_id: string
  tenant_id: string
}

interface LeaseContextValue {
  lease: ActiveLease | null
  loading: boolean
  mode: 'gestion' | 'recherche'
  refresh: () => void
}

const LeaseContext = createContext<LeaseContextValue>({
  lease: null,
  loading: true,
  mode: 'recherche',
  refresh: () => {},
})

export function LeaseProvider({ children }: { children: React.ReactNode }) {
  const [lease, setLease] = useState<ActiveLease | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchLease = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'locataire') { setLoading(false); return }

      const { data } = await supabase
        .from('leases')
        .select('*')
        .eq('tenant_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      setLease((data as ActiveLease) ?? null)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchLease() }, [fetchLease])

  return (
    <LeaseContext.Provider value={{ lease, loading, mode: lease ? 'gestion' : 'recherche', refresh: fetchLease }}>
      {children}
    </LeaseContext.Provider>
  )
}

export function useLease() {
  return useContext(LeaseContext)
}
