'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import DocumentsStorage from '@/components/documents/DocumentsStorage'

const BailGenerator = dynamic(() => import('@/components/documents/BailGenerator'), { ssr: false })

interface LeaseRow {
  id: string
  address: string
  city: string | null
  monthly_rent: number
  start_date: string
  tenant_id: string | null
}

interface Member { id: string; name: string }

export default function DocumentsPage() {
  const router = useRouter()
  const [leases, setLeases] = useState<LeaseRow[]>([])
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  const selectedLease = leases.find(l => l.id === selectedLeaseId) ?? null

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data } = await supabase
        .from('leases')
        .select('id, address, city, monthly_rent, start_date, tenant_id')
        .eq('owner_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      const rows = (data ?? []) as LeaseRow[]
      setLeases(rows)
      if (rows.length > 0) setSelectedLeaseId(rows[0].id)
      setLoading(false)
    }
    load()
  }, [router])

  const loadMembers = useCallback(async () => {
    if (!selectedLease) { setMembers([]); return }
    const supabase = createClient()
    const { data: roommateRows } = await supabase.from('lease_roommates').select('profile_id').eq('lease_id', selectedLease.id)
    const ids = [
      ...(selectedLease.tenant_id ? [selectedLease.tenant_id] : []),
      ...((roommateRows ?? []) as { profile_id: string }[]).map(r => r.profile_id),
    ]
    if (ids.length === 0) { setMembers([]); return }
    const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', ids)
    setMembers(ids.map(id => {
      const p = (profiles ?? []).find((p: { id: string }) => p.id === id)
      const name = p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : 'Locataire'
      return { id, name: name || 'Locataire' }
    }))
  }, [selectedLease])

  useEffect(() => { loadMembers() }, [loadMembers])

  if (loading) {
    return (
      <>
        <Topbar title="Mes documents" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[44px]" style={{ animation: 'bop 1s ease infinite' }}>📁</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar title="Mes documents" />
      <div className="flex-1 overflow-y-auto p-7" style={{ maxWidth: '900px' }}>
        <h2 className="text-[22px] mb-1" style={{ fontFamily: "'DM Serif Display', serif", color: '#fff' }}>Mes documents</h2>
        <p className="text-[13px] mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>Stockage de documents et création de bail par contrat.</p>

        {leases.length === 0 ? (
          <div className="text-center py-16 rounded-[18px]" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <div className="text-[52px] mb-4">📁</div>
            <h3 className="text-[18px] mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>Aucun bail actif</h3>
            <p className="text-[13px]" style={{ color: '#6B7280' }}>Créez d&apos;abord un bail pour gérer ses documents.</p>
          </div>
        ) : (
          <>
            {leases.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                {leases.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLeaseId(l.id)}
                    className="flex-shrink-0 px-4 py-2 rounded-full text-[12.5px] font-semibold border-[1.5px] cursor-pointer transition-all"
                    style={selectedLeaseId === l.id ? { background: '#ECFDF5', borderColor: '#4ECBA0', color: '#2AA87C' } : { background: '#FFFFFF', borderColor: '#E5E7EB', color: '#6B7280' }}
                  >
                    {l.address}{l.city ? `, ${l.city}` : ''}
                  </button>
                ))}
              </div>
            )}

            {selectedLease && (
              <>
                <DocumentsStorage lease={selectedLease} />
                <BailGenerator lease={selectedLease} members={members} />
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
