'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { useLease } from '@/contexts/LeaseContext'
import { createClient } from '@/lib/supabase/client'

interface RentPayment {
  id: string
  amount: number
  month: string
  status: 'pending' | 'paid' | 'late'
  paid_at: string | null
  receipt_url: string | null
}

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

function monthLabel(iso: string) {
  const d = new Date(iso)
  return `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`
}

function formatAmount(n: number) {
  return n.toLocaleString('fr-FR')
}

export default function LoyersPage() {
  const router = useRouter()
  const { lease, loading: leaseLoading } = useLease()
  const [payments, setPayments] = useState<RentPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!leaseLoading && !lease) router.replace('/app/swipe')
  }, [lease, leaseLoading, router])

  useEffect(() => {
    if (!lease) return
    async function load() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('rent_payments')
          .select('*')
          .eq('lease_id', lease!.id)
          .order('month', { ascending: false })
        if (data) setPayments(data as RentPayment[])
      } catch {}
      setLoading(false)
    }
    load()
  }, [lease])

  if (leaseLoading || !lease) {
    return (
      <>
        <Topbar title="Mes loyers" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[44px]" style={{ animation: 'bop 1s ease infinite' }}>💳</div>
        </div>
      </>
    )
  }

  // Build 12-month chart data (current year)
  const year = new Date().getFullYear()
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const monthStr = `${year}-${String(i + 1).padStart(2, '0')}`
    const p = payments.find(p => p.month.startsWith(monthStr))
    return { month: i, paid: p?.status === 'paid', amount: p?.amount ?? 0, future: i > new Date().getMonth() }
  })

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const paidCount = payments.filter(p => p.status === 'paid').length
  const lateCount = payments.filter(p => p.status === 'late').length
  const maxBar = Math.max(lease.monthly_rent, 1)

  return (
    <>
      <Topbar title="Mes loyers" />
      <div className="flex-1 overflow-y-auto p-7" style={{ maxWidth: '760px' }}>

        {/* Header stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: '💰', label: 'Total payé cette année', value: `${formatAmount(totalPaid)} €`, color: '#2AA87C' },
            { icon: '✅', label: 'Mois payés', value: `${paidCount}`, color: '#111827' },
            { icon: '⚠️', label: 'Retards', value: `${lateCount}`, color: lateCount > 0 ? '#EF4444' : '#111827' },
          ].map(s => (
            <div key={s.label} className="rounded-[14px] p-5 text-center" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
              <div className="text-[24px] mb-1">{s.icon}</div>
              <div className="text-[24px] font-extrabold" style={{ color: s.color, fontFamily: "'DM Serif Display', serif" }}>{s.value}</div>
              <div className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="rounded-[14px] p-5 mb-5" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[14px] font-bold" style={{ color: '#111827' }}>Historique {year}</div>
            <div className="flex items-center gap-3 text-[11px]" style={{ color: '#9CA3AF' }}>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#4ECBA0' }} /> Payé</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#EF4444' }} /> Impayé</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: '#F3F4F6' }} /> À venir</span>
            </div>
          </div>
          <div className="flex items-end gap-2" style={{ height: '100px' }}>
            {chartData.map(d => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-[4px] transition-all duration-500"
                  style={{
                    height: d.future ? '20px' : d.amount > 0 ? `${Math.round((d.amount / maxBar) * 80)}px` : '20px',
                    minHeight: '8px',
                    background: d.future ? '#F3F4F6' : d.paid ? '#4ECBA0' : d.amount > 0 ? '#EF4444' : '#F3F4F6',
                  }}
                />
                <span className="text-[9px]" style={{ color: '#9CA3AF' }}>{MONTHS_FR[d.month]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment list */}
        <div className="rounded-[14px] overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E5E7EB' }}>
            <div className="text-[14px] font-bold" style={{ color: '#111827' }}>Tous les paiements</div>
            <button
              className="px-4 py-2 rounded-full text-[12px] font-semibold border cursor-pointer"
              style={{ background: '#F9FAFB', borderColor: '#E5E7EB', color: '#374151' }}
            >
              📥 Exporter PDF
            </button>
          </div>

          {payments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-[40px] mb-3">📭</div>
              <p className="text-[14px] font-semibold mb-1" style={{ color: '#111827' }}>Aucun paiement enregistré</p>
              <p className="text-[12.5px]" style={{ color: '#9CA3AF' }}>Les loyers payés apparaîtront ici.</p>
            </div>
          ) : (
            <div>
              {payments.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-5 py-3.5"
                  style={{ borderBottom: i < payments.length - 1 ? '1px solid #F3F4F6' : 'none' }}
                >
                  <div>
                    <div className="text-[13.5px] font-semibold" style={{ color: '#111827' }}>{monthLabel(p.month)}</div>
                    {p.paid_at && (
                      <div className="text-[11.5px] mt-0.5" style={{ color: '#9CA3AF' }}>
                        Payé le {new Date(p.paid_at).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[15px] font-bold" style={{ color: '#111827' }}>{formatAmount(p.amount)} €</span>
                    {p.status === 'paid' && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#ECFDF5', color: '#059669' }}>✓ Payé</span>
                    )}
                    {p.status === 'pending' && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#FFFBEB', color: '#D97706' }}>⏳ En attente</span>
                    )}
                    {p.status === 'late' && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#FEF2F2', color: '#DC2626' }}>❌ En retard</span>
                    )}
                    {p.receipt_url && (
                      <a href={p.receipt_url} target="_blank" rel="noreferrer" className="text-[11px] font-semibold px-2.5 py-1 rounded-full no-underline" style={{ background: '#F3F4F6', color: '#374151' }}>
                        📄 Reçu
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  )
}
