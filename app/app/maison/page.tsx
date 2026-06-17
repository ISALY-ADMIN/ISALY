'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import { useLease } from '@/contexts/LeaseContext'
import { createClient } from '@/lib/supabase/client'

interface Roommate {
  id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
}

interface MaintenanceItem {
  id: string
  title: string
  status: string
  urgency: 'low' | 'normal' | 'urgent'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function monthsRemaining(end: string | null): number | null {
  if (!end) return null
  const diff =
    (new Date(end).getFullYear() - new Date().getFullYear()) * 12 +
    new Date(end).getMonth() - new Date().getMonth()
  return Math.max(0, diff)
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
  const initials = name.split(' ').map(p => p[0] ?? '').join('').toUpperCase().slice(0, 2)
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
      style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)' }}
    >
      {initials || '?'}
    </div>
  )
}

export default function MaisonPage() {
  const { lease, loading } = useLease()
  const [roommates, setRoomates]       = useState<Roommate[]>([])
  const [maintenance, setMaintenance]  = useState<MaintenanceItem[]>([])
  const [nextRent, setNextRent]        = useState<number | null>(null)

  useEffect(() => {
    if (!lease) return
    const supabase = createClient()

    async function load() {
      if (!lease) return

      // Colocataires (other tenants on same lease)
      try {
        const { data: leaseData } = await supabase
          .from('leases')
          .select('tenant_id, owner_id')
          .eq('id', lease.id)
          .single()

        if (leaseData) {
          const others = [leaseData.owner_id].filter(Boolean) as string[]
          if (others.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, avatar_url')
              .in('id', others)
            if (profiles) setRoomates(profiles as Roommate[])
          }
        }
      } catch {}

      // Active maintenance
      try {
        const { data } = await supabase
          .from('maintenance_requests')
          .select('id, title, status, urgency')
          .eq('lease_id', lease.id)
          .neq('status', 'resolved')
          .order('created_at', { ascending: false })
          .limit(3)
        if (data) setMaintenance(data as MaintenanceItem[])
      } catch {}

      // Next rent (day 5 of current month)
      setNextRent(lease.monthly_rent)
    }

    load()
  }, [lease])

  if (loading) {
    return (
      <>
        <Topbar title="Ma maison" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[44px]" style={{ animation: 'bop 1s ease infinite' }}>🏠</div>
        </div>
      </>
    )
  }

  // No active lease — CTA to search
  if (!lease) {
    return (
      <>
        <Topbar title="Ma maison" />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center" style={{ maxWidth: '480px', margin: '0 auto' }}>
          <div className="text-[64px] mb-4">🏠</div>
          <h2 className="text-[22px] font-extrabold mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
            Tu n&apos;as pas encore de bail actif
          </h2>
          <p className="text-[14px] mb-6" style={{ color: '#6B7280', lineHeight: '1.6' }}>
            Une fois que tu auras signé un bail, tu pourras suivre ton loyer, tes colocataires et les signalements depuis cette page.
          </p>
          <Link
            href="/app/swipe"
            className="no-underline inline-flex items-center gap-2 px-6 py-3 rounded-full text-[14px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)', boxShadow: '0 4px 20px rgba(78,203,160,.35)' }}
          >
            🔍 Trouver ma coloc
          </Link>
        </div>
      </>
    )
  }

  const remaining = monthsRemaining(lease.end_date)
  const expireSoon = remaining !== null && remaining < 3
  const dueDate = `5 ${new Date().toLocaleDateString('fr-FR', { month: 'long' })}`

  return (
    <>
      <Topbar title="Ma maison" />
      <div className="flex-1 overflow-y-auto p-7" style={{ maxWidth: '780px' }}>

        {/* Expiry alert */}
        {expireSoon && (
          <div
            className="rounded-[14px] px-5 py-4 mb-5 flex items-center justify-between gap-4"
            style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
          >
            <div>
              <div className="text-[13.5px] font-bold mb-0.5" style={{ color: '#92400E' }}>
                ⚠️ Ton bail expire dans {remaining} mois — {lease.end_date && formatDate(lease.end_date)}
              </div>
              <div className="text-[12px]" style={{ color: '#A16207' }}>
                Pense à le renouveler ou à chercher une nouvelle coloc.
              </div>
            </div>
            <Link
              href="/app/swipe"
              className="no-underline flex-shrink-0 px-4 py-2 rounded-full text-[12.5px] font-bold text-white"
              style={{ background: '#D97706' }}
            >
              Chercher
            </Link>
          </div>
        )}

        {/* Bail card */}
        <div
          className="rounded-[18px] p-6 mb-5"
          style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: '#ECFDF5', color: '#2AA87C', border: '1px solid #A7F3D0' }}
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#4ECBA0' }} />
              Bail actif
            </span>
          </div>
          <h3 className="text-[20px] font-extrabold mb-0.5" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
            {lease.address}
            {lease.city ? `, ${lease.city}` : ''}
          </h3>
          <div className="text-[13px] mb-4" style={{ color: '#6B7280' }}>
            Depuis le {formatDate(lease.start_date)}
            {lease.end_date ? ` · Jusqu'au ${formatDate(lease.end_date)}` : ''}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: '💶', label: 'Loyer', value: `${lease.monthly_rent} €/mois` },
              { icon: '👥', label: 'Colocataires', value: `${lease.nb_roommates} pers.` },
              { icon: '📅', label: 'Prochaine échéance', value: dueDate },
            ].map(s => (
              <div key={s.label} className="text-center rounded-[12px] py-4" style={{ background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                <div className="text-[22px] mb-1">{s.icon}</div>
                <div className="text-[13.5px] font-bold" style={{ color: '#111827' }}>{s.value}</div>
                <div className="text-[10.5px] mt-0.5" style={{ color: '#9CA3AF' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Colocataires */}
        {roommates.length > 0 && (
          <div
            className="rounded-[14px] p-5 mb-5"
            style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}
          >
            <div className="text-[15px] font-bold mb-4" style={{ color: '#111827' }}>👥 Mes colocataires</div>
            <div className="flex flex-col gap-3">
              {roommates.map(r => {
                const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || 'Colocataire'
                return (
                  <div key={r.id} className="flex items-center gap-3">
                    <Avatar name={name} url={r.avatar_url} />
                    <span className="text-[13.5px] font-semibold" style={{ color: '#374151' }}>{name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Maintenance */}
        <div
          className="rounded-[14px] p-5 mb-5"
          style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-[15px] font-bold" style={{ color: '#111827' }}>🔧 Signalements</div>
            <Link
              href="/app/maintenance"
              className="no-underline px-3.5 py-1.5 rounded-full text-[12px] font-semibold"
              style={{ background: '#F3F4F6', color: '#374151' }}
            >
              + Signaler
            </Link>
          </div>
          {maintenance.length === 0 ? (
            <div className="text-center py-4">
              <div className="text-[28px] mb-1">✅</div>
              <p className="text-[13px]" style={{ color: '#6B7280' }}>Aucun signalement en cours</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {maintenance.map(m => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-[10px]"
                  style={{ background: '#F9FAFB', border: '1px solid #F3F4F6' }}
                >
                  <span className="text-[13px] font-semibold" style={{ color: '#111827' }}>{m.title}</span>
                  <span
                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                    style={
                      m.urgency === 'urgent'
                        ? { background: '#FEE2E2', color: '#DC2626' }
                        : m.urgency === 'normal'
                        ? { background: '#FEF3C7', color: '#D97706' }
                        : { background: '#ECFDF5', color: '#059669' }
                    }
                  >
                    {m.urgency === 'urgent' ? '🔴 Urgent' : m.urgency === 'normal' ? '🟡 Normal' : '🟢 Faible'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Link to full bail */}
        <Link
          href="/app/bail"
          className="no-underline flex items-center justify-between p-5 rounded-[14px] transition-all"
          style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#4ECBA0'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(78,203,160,.15)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.05)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-[26px]">📄</span>
            <div>
              <div className="text-[14px] font-semibold" style={{ color: '#111827' }}>Voir le détail de mon bail</div>
              <div className="text-[12px]" style={{ color: '#6B7280' }}>Adresse, loyer, dates</div>
            </div>
          </div>
          <span style={{ color: '#4ECBA0', fontSize: '20px' }}>›</span>
        </Link>

      </div>
    </>
  )
}
