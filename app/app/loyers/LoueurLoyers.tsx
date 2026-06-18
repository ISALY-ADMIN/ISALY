'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'

interface LeaseRow {
  id: string
  address: string
  city: string | null
  monthly_rent: number
  tenant_id: string | null
  nb_roommates: number
  start_date: string
}

interface Member { id: string; name: string }

interface PaymentRow {
  id: string
  lease_id: string
  tenant_id: string | null
  amount: number
  month: string
  status: 'pending' | 'paid' | 'late'
  paid_at: string | null
  due_date?: string | null
}

interface DisplayRow {
  id: string
  tenant_id: string
  name: string
  amount: number
  status: 'pending' | 'paid' | 'late'
  paidAt: string | null
}

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function pad(n: number) { return String(n).padStart(2, '0') }
function monthKeyOf(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}` }

export default function LoueurLoyers() {
  const router = useRouter()
  const [leases, setLeases] = useState<LeaseRow[]>([])
  const [selectedLeaseId, setSelectedLeaseId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [selectedMonth, setSelectedMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [relanceId, setRelanceId] = useState<string | null>(null)

  const selectedLease = leases.find(l => l.id === selectedLeaseId) ?? null

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data } = await supabase
        .from('leases')
        .select('id, address, city, monthly_rent, tenant_id, nb_roommates, start_date')
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

  const loadLeaseData = useCallback(async () => {
    if (!selectedLease) { setMembers([]); setPayments([]); return }
    const supabase = createClient()

    const { data: roommateRows } = await supabase
      .from('lease_roommates')
      .select('profile_id')
      .eq('lease_id', selectedLease.id)

    const ids = [
      ...(selectedLease.tenant_id ? [selectedLease.tenant_id] : []),
      ...((roommateRows ?? []) as { profile_id: string }[]).map(r => r.profile_id),
    ]

    let memberList: Member[] = []
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', ids)
      memberList = ids.map(id => {
        const p = (profiles ?? []).find((p: { id: string }) => p.id === id)
        const name = p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : 'Locataire'
        return { id, name: name || 'Locataire' }
      })
    }
    setMembers(memberList)

    const { data: pmts } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('lease_id', selectedLease.id)
      .order('month', { ascending: false })
    setPayments((pmts ?? []) as PaymentRow[])
  }, [selectedLease])

  useEffect(() => { loadLeaseData() }, [loadLeaseData])

  if (loading) {
    return (
      <>
        <Topbar title="Mes loyers" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[44px]" style={{ animation: 'bop 1s ease infinite' }}>💳</div>
        </div>
      </>
    )
  }

  if (leases.length === 0) {
    return (
      <>
        <Topbar title="Mes loyers" />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="text-[52px] mb-4">💳</div>
          <h3 className="text-[18px] mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>Aucun bail actif</h3>
          <p className="text-[13px]" style={{ color: '#6B7280' }}>Les loyers apparaîtront ici une fois un bail actif créé.</p>
        </div>
      </>
    )
  }

  const rentShare = members.length > 0 ? Math.round((selectedLease?.monthly_rent ?? 0) / members.length) : (selectedLease?.monthly_rent ?? 0)
  const monthKey = monthKeyOf(selectedMonth)
  const todayKey = monthKeyOf(new Date())
  const isPastOrCurrent = monthKey <= todayKey

  const rows: DisplayRow[] = members.map(m => {
    const existing = payments.find(p => p.tenant_id === m.id && p.month?.startsWith(monthKey))
    if (existing) {
      return { id: existing.id, tenant_id: m.id, name: m.name, amount: existing.amount, status: existing.status, paidAt: existing.paid_at }
    }
    const isLate = isPastOrCurrent && monthKey < todayKey
    return { id: 'new', tenant_id: m.id, name: m.name, amount: rentShare, status: isLate ? 'late' : 'pending', paidAt: null }
  })

  async function markPaid(row: DisplayRow) {
    setBusyId(row.id === 'new' ? row.tenant_id : row.id)
    try {
      const res = await fetch(`/api/loyers/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lease_id: selectedLease?.id, tenant_id: row.tenant_id, month: `${monthKey}-01`, amount: row.amount }),
      })
      if (res.ok) await loadLeaseData()
    } catch {}
    setBusyId(null)
  }

  async function relancer(row: DisplayRow) {
    setRelanceId(row.id === 'new' ? row.tenant_id : row.id)
    try {
      await fetch('/api/loyers/relance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lease_id: selectedLease?.id, tenant_id: row.tenant_id, month: `${monthKey}-01`, amount: row.amount }),
      })
    } catch {}
    setRelanceId(null)
  }

  function shiftMonth(delta: number) {
    setSelectedMonth(prev => {
      const next = new Date(prev)
      next.setMonth(next.getMonth() + delta)
      return next
    })
  }

  // ── Récap annuel ────────────────────────────────────────────
  const year = selectedMonth.getFullYear()
  const leaseStartKey = selectedLease ? monthKeyOf(new Date(selectedLease.start_date)) : '0000-00'
  const yearlyRows = Array.from({ length: 12 }, (_, i) => {
    const mk = `${year}-${pad(i + 1)}`
    const monthPayments = payments.filter(p => p.month?.startsWith(mk))
    const percu = monthPayments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
    const attendu = monthPayments.length > 0
      ? monthPayments.reduce((s, p) => s + p.amount, 0)
      : (mk >= leaseStartKey && mk <= todayKey ? rentShare * Math.max(members.length, 1) : 0)
    return { month: i, percu, attendu }
  })
  const totalPercu = yearlyRows.reduce((s, r) => s + r.percu, 0)
  const totalAttendu = yearlyRows.reduce((s, r) => s + r.attendu, 0)
  const tauxRecouvrement = totalAttendu > 0 ? Math.round((totalPercu / totalAttendu) * 100) : 0

  return (
    <>
      <Topbar title="Mes loyers" />
      <div className="flex-1 overflow-y-auto p-7" style={{ maxWidth: '880px' }} id="loyers-print-area">

        <h2 className="text-[22px] mb-1" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>Mes loyers</h2>
        <p className="text-[13px] mb-5" style={{ color: '#6B7280' }}>Suivi des échéances par contrat.</p>

        {leases.length > 1 && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1 no-print">
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

        {/* Month selector */}
        <div className="flex items-center justify-between mb-4 no-print">
          <button onClick={() => shiftMonth(-1)} className="w-9 h-9 rounded-full border-none cursor-pointer text-[16px]" style={{ background: '#F3F4F6', color: '#374151' }}>‹</button>
          <span className="text-[15px] font-bold capitalize" style={{ color: '#111827' }}>{MONTHS_FR[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}</span>
          <button onClick={() => shiftMonth(1)} disabled={monthKey >= todayKey} className="w-9 h-9 rounded-full border-none cursor-pointer text-[16px] disabled:opacity-30" style={{ background: '#F3F4F6', color: '#374151' }}>›</button>
        </div>

        {/* Monthly list */}
        <div className="rounded-[14px] overflow-hidden mb-7" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
          {rows.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[13px]" style={{ color: '#9CA3AF' }}>Aucun locataire rattaché à ce bail.</p>
            </div>
          ) : (
            rows.map((row, i) => (
              <div key={row.tenant_id} className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: i < rows.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <div>
                  <div className="text-[13.5px] font-semibold" style={{ color: '#111827' }}>{row.name}</div>
                  {row.paidAt && <div className="text-[11.5px] mt-0.5" style={{ color: '#9CA3AF' }}>Payé le {new Date(row.paidAt).toLocaleDateString('fr-FR')}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-bold" style={{ color: '#111827' }}>{row.amount} €</span>
                  {row.status === 'paid' && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#ECFDF5', color: '#059669' }}>✓ Payé</span>}
                  {row.status === 'pending' && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#FFFBEB', color: '#D97706' }}>⏳ Attente</span>}
                  {row.status === 'late' && <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#FEF2F2', color: '#DC2626' }}>🔴 Retard</span>}

                  {row.status !== 'paid' && (
                    <div className="flex items-center gap-1.5 no-print">
                      <button
                        onClick={() => markPaid(row)}
                        disabled={busyId === (row.id === 'new' ? row.tenant_id : row.id)}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-full border-none cursor-pointer text-white disabled:opacity-50"
                        style={{ background: '#4ECBA0' }}
                      >
                        Marquer reçu
                      </button>
                      {row.status === 'late' && (
                        <button
                          onClick={() => relancer(row)}
                          disabled={relanceId === (row.id === 'new' ? row.tenant_id : row.id)}
                          className="text-[11px] font-bold px-3 py-1.5 rounded-full border cursor-pointer disabled:opacity-50"
                          style={{ background: '#FFFFFF', borderColor: '#E5E7EB', color: '#374151' }}
                        >
                          {relanceId === (row.id === 'new' ? row.tenant_id : row.id) ? 'Envoi…' : '✉️ Relancer'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Yearly recap */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-bold" style={{ color: '#111827' }}>📊 Récapitulatif {year}</h3>
          <button
            onClick={() => window.print()}
            className="text-[12px] font-semibold px-3.5 py-1.5 rounded-full border cursor-pointer no-print"
            style={{ background: '#F9FAFB', borderColor: '#E5E7EB', color: '#374151' }}
          >
            📥 Exporter en PDF
          </button>
        </div>

        <div className="rounded-[14px] overflow-hidden mb-3" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
          <div className="grid grid-cols-3 gap-px" style={{ background: '#F3F4F6' }}>
            {yearlyRows.map(r => (
              <div key={r.month} className="px-3 py-2.5" style={{ background: '#FFFFFF' }}>
                <div className="text-[11px] font-bold mb-1" style={{ color: '#374151' }}>{MONTHS_SHORT[r.month]}</div>
                <div className="text-[11px]" style={{ color: r.percu >= r.attendu && r.attendu > 0 ? '#059669' : r.attendu > 0 ? '#DC2626' : '#9CA3AF' }}>
                  {r.percu} € / {r.attendu} €
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total perçu', value: `${totalPercu.toLocaleString('fr-FR')} €`, color: '#2AA87C' },
            { label: 'Total attendu', value: `${totalAttendu.toLocaleString('fr-FR')} €`, color: '#111827' },
            { label: 'Taux de recouvrement', value: `${tauxRecouvrement}%`, color: tauxRecouvrement >= 90 ? '#2AA87C' : '#DC2626' },
          ].map(s => (
            <div key={s.label} className="rounded-[14px] p-4 text-center" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
              <div className="text-[20px] font-extrabold" style={{ color: s.color, fontFamily: "'DM Serif Display', serif" }}>{s.value}</div>
              <div className="text-[10.5px] mt-0.5" style={{ color: '#9CA3AF' }}>{s.label}</div>
            </div>
          ))}
        </div>

      </div>
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </>
  )
}
