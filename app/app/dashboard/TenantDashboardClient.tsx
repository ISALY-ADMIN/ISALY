'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import { useLease } from '@/contexts/LeaseContext'
import { createClient } from '@/lib/supabase/client'

interface RentPayment {
  id: string
  amount: number
  month: string
  status: 'pending' | 'paid' | 'late'
  paid_at: string | null
}

interface MaintenanceRequest {
  id: string
  title: string
  category: string
  urgency: 'low' | 'normal' | 'urgent'
  status: 'sent' | 'received' | 'in_progress' | 'resolved'
  created_at: string
}

interface DossierData {
  completion_percent: number
}

const URGENCY_COLOR: Record<string, { bg: string; color: string; label: string }> = {
  urgent:  { bg: '#FEF2F2', color: '#EF4444', label: '🔴 Urgent' },
  normal:  { bg: '#FFFBEB', color: '#D97706', label: '🟡 En cours' },
  low:     { bg: '#ECFDF5', color: '#059669', label: '🟢 Faible' },
}

const STATUS_LABEL: Record<string, string> = {
  sent:        'Envoyé',
  received:    'Reçu',
  in_progress: 'En cours',
  resolved:    'Résolu',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function monthsDiff(start: string, end: Date = new Date()): number {
  const s = new Date(start)
  return Math.max(0, (end.getFullYear() - s.getFullYear()) * 12 + end.getMonth() - s.getMonth())
}

function monthsRemaining(end: string | null): number | null {
  if (!end) return null
  const e = new Date(end)
  const now = new Date()
  const diff = (e.getFullYear() - now.getFullYear()) * 12 + e.getMonth() - now.getMonth()
  return Math.max(0, diff)
}

export default function TenantDashboardClient() {
  const router = useRouter()
  const { lease, loading: leaseLoading } = useLease()
  const [firstName, setFirstName] = useState('')
  const [currentPayment, setCurrentPayment] = useState<RentPayment | null>(null)
  const [recentPayments, setRecentPayments] = useState<RentPayment[]>([])
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceRequest[]>([])
  const [dossier, setDossier] = useState<DossierData | null>(null)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    if (!leaseLoading && !lease) {
      router.replace('/app/swipe')
    }
  }, [lease, leaseLoading, router])

  useEffect(() => {
    if (!lease) return
    const supabase = createClient()

    async function load() {
      if (!lease) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // First name
      const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', user.id).single()
      if (profile) setFirstName(profile.first_name ?? '')

      // Dossier completion
      const { data: dos } = await supabase.from('dossiers').select('completion_percent').eq('user_id', user.id).maybeSingle()
      setDossier(dos ?? null)

      // Rent payments
      try {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

        const { data: payments } = await supabase
          .from('rent_payments')
          .select('*')
          .eq('lease_id', lease.id)
          .order('month', { ascending: false })
          .limit(4)

        if (payments) {
          const current = payments.find(p => p.month.startsWith(monthStart.slice(0, 7))) ?? null
          setCurrentPayment(current as RentPayment | null)
          setRecentPayments((payments.filter(p => !p.month.startsWith(monthStart.slice(0, 7))).slice(0, 3)) as RentPayment[])
        }
      } catch {}

      // Maintenance
      try {
        const { data: reqs } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('lease_id', lease.id)
          .neq('status', 'resolved')
          .order('created_at', { ascending: false })
          .limit(3)
        if (reqs) setMaintenanceItems(reqs as MaintenanceRequest[])
      } catch {}
    }

    load()
  }, [lease])

  async function markAsPaid() {
    if (!lease || marking) return
    setMarking(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const now = new Date()
      const monthDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

      if (currentPayment) {
        await supabase.from('rent_payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', currentPayment.id)
        setCurrentPayment(p => p ? { ...p, status: 'paid', paid_at: new Date().toISOString() } : p)
      } else {
        const { data } = await supabase.from('rent_payments').insert({
          lease_id: lease.id,
          tenant_id: user.id,
          amount: lease.monthly_rent,
          month: monthDate,
          status: 'paid',
          paid_at: new Date().toISOString(),
        }).select().single()
        if (data) setCurrentPayment(data as RentPayment)
      }
    } catch {}
    setMarking(false)
  }

  if (leaseLoading) {
    return (
      <>
        <Topbar title="Tableau de bord" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[44px] mb-3" style={{ animation: 'bop 1s ease infinite' }}>🏠</div>
        </div>
      </>
    )
  }

  if (!lease) return null

  const remaining = monthsRemaining(lease.end_date)
  const expireSoon = remaining !== null && remaining < 3
  const durationMonths = monthsDiff(lease.start_date)

  const payStatus = currentPayment?.status ?? 'pending'
  const dueDay = 5
  const dueLabel = `À payer avant le ${dueDay} ${new Date().toLocaleDateString('fr-FR', { month: 'long' })}`

  return (
    <>
      <Topbar title="Tableau de bord" />
      <div className="flex-1 overflow-y-auto p-7" style={{ maxWidth: '900px' }}>

        {/* ── Expiry Alert ───────────────────────────────────── */}
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
                Pense à le renouveler ou à chercher une nouvelle coloc dès maintenant.
              </div>
            </div>
            <Link
              href="/app/swipe"
              className="no-underline flex-shrink-0 px-4 py-2 rounded-full text-[12.5px] font-bold text-white"
              style={{ background: '#D97706' }}
            >
              Chercher une coloc
            </Link>
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-[26px] mb-1" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
            Bonjour {firstName} 👋
          </h1>
          <p className="text-[14px] mb-2" style={{ color: '#6B7280' }}>
            📍 {lease.address}{lease.city ? `, ${lease.city}` : ''}
          </p>
          <span
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full"
            style={{ background: '#ECFDF5', color: '#2AA87C', border: '1px solid #A7F3D0' }}
          >
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#4ECBA0' }} />
            Bail actif depuis le {formatDate(lease.start_date)}
          </span>
        </div>

        {/* ── Section 1 — Loyer du mois ──────────────────────── */}
        <div
          className="rounded-[18px] p-6 mb-5"
          style={{ background: payStatus === 'paid' ? '#ECFDF5' : payStatus === 'late' ? '#FEF2F2' : '#FFFBEB', border: `1px solid ${payStatus === 'paid' ? '#A7F3D0' : payStatus === 'late' ? '#FECACA' : '#FDE68A'}` }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[13px] font-semibold mb-1" style={{ color: '#6B7280' }}>
                Loyer de {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </div>
              <div className="text-[36px] font-extrabold leading-none" style={{ color: '#111827', fontFamily: "'DM Serif Display', serif" }}>
                {lease.monthly_rent} <span className="text-[18px] font-semibold" style={{ color: '#6B7280' }}>€</span>
              </div>
            </div>
            <div>
              {payStatus === 'paid' && (
                <span className="text-[13px] font-bold px-4 py-2 rounded-full" style={{ background: '#4ECBA0', color: '#fff' }}>✅ Payé</span>
              )}
              {payStatus === 'pending' && (
                <span className="text-[13px] font-bold px-4 py-2 rounded-full" style={{ background: '#F59E0B', color: '#fff' }}>⏳ {dueLabel}</span>
              )}
              {payStatus === 'late' && (
                <span className="text-[13px] font-bold px-4 py-2 rounded-full" style={{ background: '#EF4444', color: '#fff' }}>❌ En retard</span>
              )}
            </div>
          </div>

          {payStatus !== 'paid' && (
            <button
              onClick={markAsPaid}
              disabled={marking}
              className="px-5 py-2.5 rounded-full text-[13px] font-bold text-white border-none cursor-pointer disabled:opacity-60"
              style={{ background: '#4ECBA0' }}
            >
              {marking ? '…' : '✓ Marquer comme payé'}
            </button>
          )}
          {payStatus === 'paid' && currentPayment?.paid_at && (
            <button
              className="px-5 py-2.5 rounded-full text-[13px] font-semibold border cursor-pointer"
              style={{ background: 'transparent', borderColor: '#4ECBA0', color: '#2AA87C' }}
            >
              📄 Voir le reçu
            </button>
          )}

          {/* Recent payments mini-list */}
          {recentPayments.length > 0 && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,.08)' }}>
              <div className="text-[11px] font-extrabold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
                Historique récent
              </div>
              <div className="flex flex-col gap-1">
                {recentPayments.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-[12.5px]">
                    <span style={{ color: '#6B7280' }}>
                      {new Date(p.month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </span>
                    <span style={{ color: p.status === 'paid' ? '#059669' : '#EF4444', fontWeight: 600 }}>
                      {p.status === 'paid' ? `✓ ${p.amount} €` : `✗ ${p.amount} €`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Section 2 — Stats grid ─────────────────────────── */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            {
              icon: '📅',
              label: 'Durée restante',
              value: remaining !== null ? `${remaining} mois` : '—',
              sub: lease.end_date ? `Fin le ${new Date(lease.end_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}` : 'Bail sans fin',
            },
            {
              icon: '👥',
              label: 'Colocataires',
              value: `${lease.nb_roommates} pers.`,
              sub: `Depuis ${durationMonths} mois`,
            },
            {
              icon: '📋',
              label: 'Dossier',
              value: `${dossier?.completion_percent ?? 0}%`,
              sub: 'Complété',
            },
            {
              icon: '🔧',
              label: 'Maintenance',
              value: `${maintenanceItems.length}`,
              sub: maintenanceItems.length === 0 ? 'Aucun signalement' : 'En cours',
            },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-[14px] p-4 text-center"
              style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}
            >
              <div className="text-[24px] mb-1">{stat.icon}</div>
              <div className="text-[20px] font-extrabold mb-0.5" style={{ color: '#111827', fontFamily: "'DM Serif Display', serif" }}>
                {stat.value}
              </div>
              <div className="text-[10.5px]" style={{ color: '#9CA3AF' }}>{stat.label}</div>
              <div className="text-[10px] mt-0.5" style={{ color: '#6B7280' }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Section 3 — Maintenance ────────────────────────── */}
        <div className="rounded-[14px] p-5 mb-5" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[15px] font-bold" style={{ color: '#111827' }}>🔧 Signalements en cours</div>
            <Link
              href="/app/maintenance"
              className="no-underline px-3.5 py-1.5 rounded-full text-[12px] font-semibold"
              style={{ background: '#F3F4F6', color: '#374151' }}
            >
              + Signaler
            </Link>
          </div>

          {maintenanceItems.length === 0 ? (
            <div className="text-center py-5">
              <div className="text-[32px] mb-2">✅</div>
              <p className="text-[13px]" style={{ color: '#6B7280' }}>Aucun signalement en cours</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {maintenanceItems.map(req => {
                const u = URGENCY_COLOR[req.urgency] ?? URGENCY_COLOR.normal
                return (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 rounded-[10px]"
                    style={{ background: u.bg }}
                  >
                    <div>
                      <div className="text-[13px] font-semibold" style={{ color: '#111827' }}>{req.title}</div>
                      <div className="text-[11.5px] mt-0.5" style={{ color: '#6B7280' }}>
                        {req.category} · {formatDate(req.created_at)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10.5px] font-bold" style={{ color: u.color }}>{u.label}</span>
                      <span className="text-[10.5px]" style={{ color: '#9CA3AF' }}>{STATUS_LABEL[req.status]}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Section 4 — Documents ──────────────────────────── */}
        <div className="rounded-[14px] p-5 mb-5" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
          <div className="text-[15px] font-bold mb-4" style={{ color: '#111827' }}>📄 Documents du bail</div>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: '📄', label: 'Bail signé', action: 'Télécharger', available: !!lease },
              { icon: '🔑', label: "État des lieux d'entrée", action: 'Voir', available: true },
              { icon: '📸', label: 'État des lieux de sortie', action: 'Non effectué', available: false },
              { icon: '📋', label: 'Règlement intérieur', action: 'Voir', available: true },
            ].map(doc => (
              <div
                key={doc.label}
                className="flex items-center justify-between p-3.5 rounded-[10px]"
                style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
              >
                <div className="flex items-center gap-2">
                  <span>{doc.icon}</span>
                  <span className="text-[12.5px] font-medium" style={{ color: '#374151' }}>{doc.label}</span>
                </div>
                <button
                  className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full border-none cursor-pointer"
                  style={
                    doc.available
                      ? { background: '#4ECBA0', color: '#fff' }
                      : { background: '#F3F4F6', color: '#9CA3AF' }
                  }
                >
                  {doc.action}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 5 — Lien vers bail complet ────────────── */}
        <Link
          href="/app/bail"
          className="no-underline flex items-center justify-between p-5 rounded-[14px] transition-all"
          style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#4ECBA0'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(78,203,160,.15)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.05)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-[28px]">📄</span>
            <div>
              <div className="text-[14px] font-semibold" style={{ color: '#111827' }}>Voir le détail de mon bail</div>
              <div className="text-[12px]" style={{ color: '#6B7280' }}>Adresse, loyer, dates, propriétaire</div>
            </div>
          </div>
          <span style={{ color: '#4ECBA0', fontSize: '20px' }}>›</span>
        </Link>

      </div>
    </>
  )
}
