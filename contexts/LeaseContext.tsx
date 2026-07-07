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
  mode: 'locataire' | 'loueur'
  hasActiveListing: boolean
  setMode: (mode: 'locataire' | 'loueur') => void
  refresh: () => void
}

const LeaseContext = createContext<LeaseContextValue>({
  lease: null,
  loading: true,
  mode: 'locataire',
  hasActiveListing: false,
  setMode: () => {},
  refresh: () => {},
})

export function LeaseProvider({ children }: { children: React.ReactNode }) {
  const [lease, setLease]                       = useState<ActiveLease | null>(null)
  const [loading, setLoading]                   = useState(true)
  const [activeMode, setActiveMode]             = useState<'locataire' | 'loueur'>('locataire')
  const [hasActiveListing, setHasActiveListing] = useState(false)

  const fetchLease = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      // role = colonne de référence du mode (NULL = locataire)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'locataire' || profile?.role === 'loueur') {
        setActiveMode(profile.role)
      }

      // Check if user has at least one active listing (enables switcher)
      const { count: listingCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .eq('is_active', true)
      setHasActiveListing((listingCount ?? 0) > 0)

      // Fetch active lease (used by lease-detail pages).
      // Le locataire peut être partie principale (tenant_id) OU colocataire (lease_roommates).
      const { data: roommateRows } = await supabase
        .from('lease_roommates')
        .select('lease_id')
        .eq('profile_id', user.id)

      const roommateLeaseIds = (roommateRows ?? []).map(r => r.lease_id)
      const partyFilter = roommateLeaseIds.length > 0
        ? `tenant_id.eq.${user.id},id.in.(${roommateLeaseIds.join(',')})`
        : `tenant_id.eq.${user.id}`

      // Cherche 'active' ET 'pending_signature' — chaque page décide ensuite
      // (ex : /app/declarer-probleme n'accepte que 'active', /app/maison affiche les deux).
      const { data } = await supabase
        .from('leases')
        .select('*')
        .or(partyFilter)
        .in('status', ['active', 'pending_signature'])
        .order('status', { ascending: true }) // 'active' avant 'pending_signature'
        .limit(1)
        .maybeSingle()

      setLease((data as ActiveLease) ?? null)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchLease() }, [fetchLease])

  // Realtime : tout changement sur un bail dont l'utilisateur est partie (signature,
  // passage pending_signature → active…) re-synchronise le contexte sans reload.
  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || cancelled) return
      channel = supabase
        .channel(`leases-updates-${user.id}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'leases', filter: `tenant_id=eq.${user.id}` },
          () => fetchLease())
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'leases', filter: `owner_id=eq.${user.id}` },
          () => fetchLease())
        .subscribe()
    })

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [fetchLease])

  return (
    <LeaseContext.Provider value={{
      lease,
      loading,
      mode: activeMode,
      hasActiveListing,
      setMode: setActiveMode,
      refresh: fetchLease,
    }}>
      {children}
    </LeaseContext.Provider>
  )
}

export function useLease() {
  return useContext(LeaseContext)
}
