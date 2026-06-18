'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'

interface LeaseRow {
  id: string
  address: string
  city: string | null
  monthly_rent: number
  start_date: string
  nb_roommates: number
  tenant_id: string | null
}

interface TenantCard {
  id: string
  name: string
  avatarUrl: string | null
  joinedAt: string
  rentShare: number
  identityVerified: boolean
  completionPercent: number
}

const COLORS = ['#4ECBA0', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6']

function initials(name: string) {
  return name.split(' ').map(p => p[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function LocatairesPage() {
  const router = useRouter()
  const [leases, setLeases] = useState<LeaseRow[]>([])
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null)
  const [tenants, setTenants] = useState<TenantCard[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTenants, setLoadingTenants] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data } = await supabase
        .from('leases')
        .select('id, address, city, monthly_rent, start_date, nb_roommates, tenant_id')
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

  useEffect(() => {
    if (!selectedLeaseId) { setTenants([]); return }
    const lease = leases.find(l => l.id === selectedLeaseId)
    if (!lease) return

    async function loadTenants() {
      setLoadingTenants(true)
      const supabase = createClient()

      const { data: roommateRows } = await supabase
        .from('lease_roommates')
        .select('profile_id, joined_at')
        .eq('lease_id', lease!.id)

      const memberIds = [
        ...(lease!.tenant_id ? [{ id: lease!.tenant_id, joined_at: lease!.start_date }] : []),
        ...((roommateRows ?? []) as { profile_id: string; joined_at: string }[]).map(r => ({ id: r.profile_id, joined_at: r.joined_at })),
      ]

      if (memberIds.length === 0) { setTenants([]); setLoadingTenants(false); return }

      const ids = memberIds.map(m => m.id)
      const [{ data: profiles }, { data: dossiers }] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name, avatar_url').in('id', ids),
        supabase.from('dossiers').select('user_id, identity_verified, completion_percent').in('user_id', ids),
      ])

      const rentShare = Math.round((lease!.monthly_rent ?? 0) / Math.max(memberIds.length, 1))

      const cards: TenantCard[] = memberIds.map(m => {
        const p = (profiles ?? []).find((p: { id: string }) => p.id === m.id)
        const d = (dossiers ?? []).find((d: { user_id: string }) => d.user_id === m.id)
        const name = p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Locataire' : 'Locataire'
        return {
          id: m.id,
          name,
          avatarUrl: p?.avatar_url ?? null,
          joinedAt: m.joined_at,
          rentShare,
          identityVerified: d?.identity_verified ?? false,
          completionPercent: d?.completion_percent ?? 0,
        }
      })

      setTenants(cards)
      setLoadingTenants(false)
    }
    loadTenants()
  }, [selectedLeaseId, leases])

  if (loading) {
    return (
      <>
        <Topbar title="Mes locataires" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[44px]" style={{ animation: 'bop 1s ease infinite' }}>👥</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar title="Mes locataires" />
      <div className="flex-1 overflow-y-auto p-7" style={{ maxWidth: '820px' }}>

        <div className="mb-6">
          <h2 className="text-[22px] mb-1" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
            Mes locataires
          </h2>
          <p className="text-[13px]" style={{ color: '#6B7280' }}>
            {leases.length === 0 ? 'Aucun bail actif pour le moment.' : `${leases.length} bail${leases.length > 1 ? 'x' : ''} actif${leases.length > 1 ? 's' : ''}`}
          </p>
        </div>

        {leases.length === 0 ? (
          <div className="text-center py-16 rounded-[18px]" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <div className="text-[52px] mb-4">🏠</div>
            <h3 className="text-[18px] mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
              Pas encore de locataires
            </h3>
            <p className="text-[13px]" style={{ color: '#6B7280' }}>
              Les locataires apparaîtront ici une fois un bail actif créé sur l&apos;un de vos biens.
            </p>
          </div>
        ) : (
          <>
            {leases.length > 1 && (
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {leases.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLeaseId(l.id)}
                    className="flex-shrink-0 px-4 py-2 rounded-full text-[12.5px] font-semibold border-[1.5px] cursor-pointer transition-all"
                    style={
                      selectedLeaseId === l.id
                        ? { background: '#ECFDF5', borderColor: '#4ECBA0', color: '#2AA87C' }
                        : { background: '#FFFFFF', borderColor: '#E5E7EB', color: '#6B7280' }
                    }
                  >
                    {l.address}{l.city ? `, ${l.city}` : ''}
                  </button>
                ))}
              </div>
            )}

            {loadingTenants ? (
              <div className="text-center py-10">
                <div className="text-[36px]" style={{ animation: 'bop 1s ease infinite' }}>👥</div>
              </div>
            ) : tenants.length === 0 ? (
              <div className="text-center py-16 rounded-[18px]" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                <p className="text-[13px]" style={{ color: '#6B7280' }}>Aucun locataire rattaché à ce bail.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {tenants.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => router.push(`/app/locataires/${t.id}?lease=${selectedLeaseId}`)}
                    className="flex items-center gap-4 p-5 rounded-[14px] w-full text-left border-none cursor-pointer"
                    style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}
                  >
                    {t.avatarUrl ? (
                      <img src={t.avatarUrl} alt={t.name} className="w-[56px] h-[56px] rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div
                        className="w-[56px] h-[56px] rounded-full flex items-center justify-center font-extrabold text-lg text-white flex-shrink-0"
                        style={{ background: COLORS[i % COLORS.length] }}
                      >
                        {initials(t.name)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[15px] font-bold" style={{ color: '#111827' }}>{t.name}</span>
                        {t.identityVerified && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#ECFDF5', color: '#059669' }}>
                            ✓ Identité vérifiée
                          </span>
                        )}
                      </div>
                      <div className="text-[12.5px]" style={{ color: '#6B7280' }}>
                        Entré le {formatDate(t.joinedAt)} · Part de loyer : {t.rentShare} €/mois
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: '#F3F4F6', maxWidth: '140px' }}>
                          <div className="h-1.5 rounded-full" style={{ width: `${t.completionPercent}%`, background: '#4ECBA0' }} />
                        </div>
                        <span className="text-[10.5px]" style={{ color: '#9CA3AF' }}>Dossier {t.completionPercent}%</span>
                      </div>
                    </div>

                    <span style={{ color: '#4ECBA0', fontSize: '20px' }}>›</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
