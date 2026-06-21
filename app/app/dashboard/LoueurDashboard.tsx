import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/layout/Topbar'

interface ListingRow {
  id: string
  title: string | null
  city: string | null
  neighborhood: string | null
  rent: number | null
  photos: string[] | null
  is_active: boolean
}

interface LeaseRow {
  id: string
  address: string
  city: string | null
  monthly_rent: number
  start_date: string
  end_date: string | null
  nb_roommates: number
  status: string
  tenant_id: string | null
  listing_id?: string | null
  created_at: string
}

interface RentPaymentRow {
  id: string
  lease_id: string
  amount: number
  month: string
  status: string
  paid_at: string | null
  tenant_id: string | null
}

interface MaintenanceRow {
  id: string
  lease_id: string
  title: string
  category: string | null
  status: string
  created_at: string
  tenant_id: string | null
}

interface ProfileRow {
  id: string
  first_name: string | null
  last_name: string | null
}

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.round(hours / 24)
  if (days < 30) return `il y a ${days} j`
  return formatDate(iso)
}

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function tenantName(profiles: ProfileRow[], id: string | null) {
  if (!id) return 'Locataire'
  const p = profiles.find(p => p.id === id)
  if (!p) return 'Locataire'
  return `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Locataire'
}

export default async function LoueurDashboard({ ownerId }: { ownerId: string }) {
  const supabase = createClient()

  const [{ data: profile }, { data: listingsData }, { data: leasesData }] = await Promise.all([
    supabase.from('profiles').select('first_name').eq('id', ownerId).single(),
    supabase.from('listings').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }),
    supabase.from('leases').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }),
  ])

  const listings = (listingsData ?? []) as ListingRow[]
  const leases = (leasesData ?? []) as LeaseRow[]
  const activeLeases = leases.filter(l => l.status === 'active')
  const activeListings = listings.filter(l => l.is_active)
  const leaseIds = leases.map(l => l.id)

  let rentPayments: RentPaymentRow[] = []
  let maintenanceItems: MaintenanceRow[] = []
  const roommatesCount = new Map<string, number>()

  if (leaseIds.length > 0) {
    const [{ data: rp }, { data: mr }, { data: rm }] = await Promise.all([
      supabase.from('rent_payments').select('*').in('lease_id', leaseIds),
      supabase.from('maintenance_requests').select('*').in('lease_id', leaseIds).order('created_at', { ascending: false }),
      supabase.from('lease_roommates').select('lease_id').in('lease_id', leaseIds),
    ])
    rentPayments = (rp ?? []) as RentPaymentRow[]
    maintenanceItems = (mr ?? []) as MaintenanceRow[]
    for (const row of (rm ?? []) as { lease_id: string }[]) {
      roommatesCount.set(row.lease_id, (roommatesCount.get(row.lease_id) ?? 0) + 1)
    }
  }

  const tenantIds = Array.from(new Set(leases.map(l => l.tenant_id).filter(Boolean))) as string[]
  let profiles: ProfileRow[] = []
  if (tenantIds.length > 0) {
    const { data: pr } = await supabase.from('profiles').select('id, first_name, last_name').in('id', tenantIds)
    profiles = (pr ?? []) as ProfileRow[]
  }

  // ── KPIs ──────────────────────────────────────────────────
  const thisMonth = monthKey()
  const monthPayments = rentPayments.filter(p => p.month?.startsWith(thisMonth))
  const revenueThisMonth = monthPayments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount ?? 0), 0)
  const occupancyRate = activeListings.length > 0
    ? Math.round((activeLeases.length / activeListings.length) * 100)
    : (activeLeases.length > 0 ? 100 : 0)
  const activeTenantIds = new Set<string>()
  activeLeases.forEach(l => { if (l.tenant_id) activeTenantIds.add(l.tenant_id) })
  const activeTenantsCount = activeTenantIds.size + activeLeases.reduce((s, l) => s + (roommatesCount.get(l.id) ?? 0), 0)
  const pendingThisMonth = monthPayments.filter(p => p.status === 'pending' || p.status === 'late').length

  const kpis = [
    { icon: '💰', label: 'Revenus du mois', value: `${revenueThisMonth.toLocaleString('fr-FR')} €` },
    { icon: '🏠', label: "Taux d'occupation", value: `${occupancyRate}%` },
    { icon: '👥', label: 'Locataires actifs', value: `${activeTenantsCount}` },
    { icon: '⏳', label: 'Loyers en attente', value: `${pendingThisMonth}` },
  ]

  // ── Mes biens ─────────────────────────────────────────────
  const biens = listings.map(listing => {
    const matchedLease = activeLeases.find(l => l.listing_id === listing.id)
    const occupied = !!matchedLease
    const tenantsHere = matchedLease ? 1 + (roommatesCount.get(matchedLease.id) ?? 0) : 0
    return {
      id: listing.id,
      photo: listing.photos?.[0] ?? null,
      address: listing.title || `${listing.neighborhood ? listing.neighborhood + ', ' : ''}${listing.city ?? ''}`,
      city: listing.city,
      rent: listing.rent ?? 0,
      occupied,
      tenantsHere,
    }
  })

  // ── Alertes actives ───────────────────────────────────────
  type Alert = { icon: string; text: string; href: string; color: string; bg: string }
  const alerts: Alert[] = []

  rentPayments
    .filter(p => p.status === 'late')
    .forEach(p => {
      const lease = leases.find(l => l.id === p.lease_id)
      alerts.push({
        icon: '🔴',
        text: `Loyer en retard — ${tenantName(profiles, p.tenant_id)} (${lease?.address ?? 'bien'}) — ${p.amount} €`,
        href: '/app/loyers',
        color: '#DC2626',
        bg: '#FEF2F2',
      })
    })

  maintenanceItems
    .filter(m => m.status !== 'resolved')
    .forEach(m => {
      const lease = leases.find(l => l.id === m.lease_id)
      alerts.push({
        icon: '🔧',
        text: `Signalement ouvert — ${m.title} (${lease?.address ?? 'bien'})`,
        href: '/app/maintenance',
        color: '#D97706',
        bg: '#FFFBEB',
      })
    })

  activeLeases
    .filter(l => l.end_date && daysUntil(l.end_date) >= 0 && daysUntil(l.end_date) < 60)
    .forEach(l => {
      alerts.push({
        icon: '📅',
        text: `Bail expire dans ${daysUntil(l.end_date as string)} j — ${l.address}`,
        href: '/app/locataires',
        color: '#7C3AED',
        bg: '#F5F3FF',
      })
    })

  // ── Activité récente ──────────────────────────────────────
  type Activity = { icon: string; text: string; at: string }
  const activity: Activity[] = []

  rentPayments
    .filter(p => p.paid_at)
    .forEach(p => {
      const lease = leases.find(l => l.id === p.lease_id)
      activity.push({
        icon: '✅',
        text: `Paiement reçu — ${tenantName(profiles, p.tenant_id)} — ${p.amount} € (${lease?.address ?? 'bien'})`,
        at: p.paid_at as string,
      })
    })

  maintenanceItems.forEach(m => {
    activity.push({ icon: '🔧', text: `Nouveau signalement — ${m.title}`, at: m.created_at })
  })

  leases.forEach(l => {
    activity.push({ icon: '🆕', text: `Nouveau locataire — ${tenantName(profiles, l.tenant_id)} (${l.address})`, at: l.created_at })
  })

  activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const recentActivity = activity.slice(0, 5)

  const firstName = profile?.first_name ?? ''

  return (
    <>
      <Topbar title="Tableau de bord" />
      <div className="flex-1 overflow-y-auto p-7" style={{ maxWidth: '980px' }}>

        <div className="mb-6">
          <h1 className="text-[26px] mb-1" style={{ fontFamily: "'DM Serif Display', serif", color: '#fff' }}>
            Bonjour {firstName} 👋
          </h1>
          <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Voici un aperçu de votre activité de bailleur.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {kpis.map(k => (
            <div
              key={k.label}
              className="rounded-[14px] p-4 text-center"
              style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}
            >
              <div className="text-[24px] mb-1">{k.icon}</div>
              <div className="text-[20px] font-extrabold mb-0.5" style={{ color: '#111827', fontFamily: "'DM Serif Display', serif" }}>
                {k.value}
              </div>
              <div className="text-[10.5px]" style={{ color: '#9CA3AF' }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Mes biens */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-bold" style={{ color: '#fff' }}>🏠 Mes biens</h2>
            <Link href="/app/mes-annonces" className="text-[12.5px] font-semibold no-underline" style={{ color: '#2AA87C' }}>
              Gérer mes annonces →
            </Link>
          </div>

          {biens.length === 0 ? (
            <div className="text-center py-10 rounded-[14px]" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
              <div className="text-[36px] mb-2">📢</div>
              <p className="text-[13px] mb-3" style={{ color: '#6B7280' }}>Aucune annonce publiée pour le moment.</p>
              <Link href="/app/annonce" className="no-underline inline-flex px-4 py-2 rounded-full text-[12.5px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)' }}>
                + Publier une annonce
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {biens.map(b => (
                <Link
                  key={b.id}
                  href={`/annonce/${b.id}`}
                  className="no-underline flex gap-3 rounded-[14px] overflow-hidden p-3"
                  style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}
                >
                  <div className="w-[64px] h-[64px] rounded-[10px] flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6EE7B7, #047857)' }}>
                    {b.photo ? <Image src={b.photo} alt={b.address ?? ''} width={64} height={64} className="w-full h-full object-cover" /> : <span className="text-[24px]">🏠</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-bold truncate" style={{ color: '#111827' }}>{b.address || b.city || 'Bien'}</div>
                    <div className="text-[12px] mt-0.5" style={{ color: '#6B7280' }}>{b.rent} €/mois</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className="text-[10.5px] font-bold px-2 py-0.5 rounded-full"
                        style={b.occupied ? { background: '#ECFDF5', color: '#059669' } : { background: '#F3F4F6', color: '#9CA3AF' }}
                      >
                        {b.occupied ? '● Occupé' : '○ Libre'}
                      </span>
                      {b.occupied && <span className="text-[10.5px]" style={{ color: '#9CA3AF' }}>{b.tenantsHere} loc.</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Alertes actives */}
        <div className="mb-6">
          <h2 className="text-[16px] font-bold mb-3" style={{ color: '#fff' }}>🔔 Alertes actives</h2>
          {alerts.length === 0 ? (
            <div className="text-center py-8 rounded-[14px]" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
              <div className="text-[32px] mb-2">✅</div>
              <p className="text-[13px]" style={{ color: '#6B7280' }}>Aucune alerte pour le moment.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {alerts.map((a, i) => (
                <Link
                  key={i}
                  href={a.href}
                  className="no-underline flex items-center justify-between p-3.5 rounded-[12px]"
                  style={{ background: a.bg }}
                >
                  <div className="flex items-center gap-2.5">
                    <span>{a.icon}</span>
                    <span className="text-[13px] font-semibold" style={{ color: a.color }}>{a.text}</span>
                  </div>
                  <span style={{ color: a.color, fontSize: '16px' }}>›</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activité récente */}
        <div className="mb-6">
          <h2 className="text-[16px] font-bold mb-3" style={{ color: '#fff' }}>🕓 Activité récente</h2>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 rounded-[14px]" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
              <p className="text-[13px]" style={{ color: '#6B7280' }}>Aucune activité récente.</p>
            </div>
          ) : (
            <div className="rounded-[14px] overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
              {recentActivity.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-5 py-3.5"
                  style={{ borderBottom: i < recentActivity.length - 1 ? '1px solid #F3F4F6' : 'none' }}
                >
                  <div className="flex items-center gap-2.5">
                    <span>{a.icon}</span>
                    <span className="text-[13px]" style={{ color: '#374151' }}>{a.text}</span>
                  </div>
                  <span className="text-[11.5px] flex-shrink-0" style={{ color: '#9CA3AF' }}>{relativeTime(a.at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  )
}
