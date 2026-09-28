import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getListingsManagement, getAgency, type PartnerAgency } from '@/lib/managementMode'
import type { ManagementMode } from '@/lib/autogestion'

/**
 * Données serveur de l'espace bailleur (dashboard v2).
 *
 * Un « logement » est une annonce (listings). Ses chambres occupées sont les
 * baux actifs qui lui sont liés (un bail = un locataire principal, et ses
 * colocataires déclarés) ; les chambres libres complètent jusqu'à la capacité
 * de l'annonce. Les baux sans annonce liée forment chacun un logement.
 */
export interface Occupant {
  id: string
  firstName: string
  avatarUrl: string | null
}

export interface Room {
  kind: 'occupied' | 'free'
  leaseId?: string
  occupants?: Occupant[]
  rent?: number
  since?: string | null
  endDate?: string | null
  notice?: string | null
  /** Loyer du mois : payé, en attente, en retard (jours), ou inconnu. */
  pay?: { status: 'paid' | 'pending' | 'late'; paidAt: string | null; lateDays: number; amount: number; paymentId: string | null; month: string } | null
}

export interface Home {
  id: string
  listingId: string | null
  title: string
  address: string
  city: string
  neighborhood: string | null
  meuble: boolean | null
  mode: ManagementMode
  agency: PartnerAgency | null
  delegatedAt: string | null
  rooms: Room[]
  dueDay: number | null
}

const firstNameOf = (p: { first_name?: string | null } | undefined) => (p?.first_name ?? '').trim() || 'Colocataire'

function dueDayOf(p: Record<string, unknown> | undefined): number | null {
  return p?.due_date ? new Date(String(p.due_date)).getDate() : null
}

export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export async function getOwnerHomes(supabase: SupabaseClient, ownerId: string): Promise<Home[]> {
  const [{ data: listings }, { data: leases }] = await Promise.all([
    supabase.from('listings').select('*').eq('owner_id', ownerId).order('created_at', { ascending: true }),
    supabase.from('leases').select('*').eq('owner_id', ownerId).in('status', ['active', 'pending_signature']),
  ])
  const L = (listings ?? []) as Record<string, unknown>[]
  const B = ((leases ?? []) as Record<string, unknown>[]).filter(l => l.status === 'active')
  const leaseIds = B.map(l => l.id as string)

  const [mgmt, roommatesRes, paysRes, preavisRes] = await Promise.all([
    getListingsManagement(supabase, L.map(l => l.id as string)),
    leaseIds.length ? supabase.from('lease_roommates').select('lease_id, profile_id').in('lease_id', leaseIds) : Promise.resolve({ data: [] as { lease_id: string; profile_id: string }[] }),
    leaseIds.length ? supabase.from('rent_payments').select('*').in('lease_id', leaseIds).order('month', { ascending: false }) : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    leaseIds.length ? supabase.from('preavis').select('lease_id, tenant_id, date_fin_effective, status').in('lease_id', leaseIds).eq('status', 'active') : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
  ])
  const roommates = (roommatesRes.data ?? []) as { lease_id: string; profile_id: string }[]
  const peopleIds = Array.from(new Set([...B.map(l => l.tenant_id as string), ...roommates.map(r => r.profile_id)].filter(Boolean)))
  const { data: people } = peopleIds.length
    ? await supabase.from('profiles').select('id, first_name, avatar_url').in('id', peopleIds)
    : { data: [] as { id: string; first_name: string | null; avatar_url: string | null }[] }
  const person = new Map((people ?? []).map(p => [p.id as string, p]))
  const pays = (paysRes.error ? [] : paysRes.data ?? []) as Record<string, unknown>[]
  const preavis = (preavisRes.error ? [] : preavisRes.data ?? []) as Record<string, unknown>[]
  const now = new Date()
  const thisMonth = monthKey(now)

  const roomFor = (lease: Record<string, unknown>): Room => {
    const ids = [lease.tenant_id as string, ...roommates.filter(r => r.lease_id === lease.id).map(r => r.profile_id)].filter(Boolean)
    const occupants = Array.from(new Set(ids)).map(id => {
      const p = person.get(id)
      return { id, firstName: firstNameOf(p ?? undefined), avatarUrl: (p?.avatar_url as string | null) ?? null }
    })
    const p = pays.find(x => x.lease_id === lease.id && x.month === thisMonth) ?? pays.find(x => x.lease_id === lease.id && x.status === 'late')
    let pay: Room['pay'] = null
    if (p) {
      const due = new Date(String(p.due_date ?? p.month))
      const late = p.status === 'late' || (p.status === 'pending' && due.getTime() < now.getTime() - 86400000)
      pay = {
        status: p.status === 'paid' ? 'paid' : late ? 'late' : 'pending',
        paidAt: (p.paid_at as string | null) ?? null,
        lateDays: late ? Math.max(1, Math.floor((now.getTime() - due.getTime()) / 86400000)) : 0,
        amount: Number(p.amount ?? 0),
        paymentId: (p.id as string) ?? null,
        month: String(p.month),
      }
    }
    const pv = preavis.find(x => x.lease_id === lease.id)
    return {
      kind: 'occupied',
      leaseId: lease.id as string,
      occupants,
      rent: Number(lease.monthly_rent ?? 0) + Number(lease.charges_amount ?? 0),
      since: (lease.start_date as string | null) ?? null,
      endDate: (lease.end_date as string | null) ?? null,
      notice: (pv?.date_fin_effective as string | null) ?? null,
      pay,
    }
  }

  const homes: Home[] = L.map(l => {
    const id = l.id as string
    const mine = B.filter(b => b.listing_id === id)
    const rooms = mine.map(roomFor)
    // Chambres libres : celles que le bailleur déclare disponibles sur l'annonce,
    // sinon la capacité moins les baux en cours.
    const capacity = Number(l.capacity_total ?? 0)
    const free = l.rooms_available != null ? Number(l.rooms_available) : Math.max(0, capacity - rooms.length)
    for (let i = 0; i < Math.min(free, 8); i++) rooms.push({ kind: 'free' })
    const m = mgmt[id]
    const first = mine[0]
    return {
      id,
      listingId: id,
      title: (l.title as string | null) || 'Logement',
      address: (first?.address as string | null) || (l.neighborhood as string | null) || (l.title as string | null) || 'Logement',
      city: (l.city as string | null) ?? '',
      neighborhood: (l.neighborhood as string | null) ?? null,
      meuble: (l.meuble as boolean | null) ?? null,
      mode: m?.mode ?? null,
      agency: null,
      delegatedAt: m?.delegatedAt ?? null,
      rooms,
      dueDay: dueDayOf(pays.find(x => mine.some(b => b.id === x.lease_id))),
      _agencyId: m?.agencyId ?? null,
    } as Home & { _agencyId: string | null }
  })

  // Baux sans annonce liée : un logement chacun, géré avec ISALY.
  for (const b of B.filter(x => !x.listing_id)) {
    homes.push({
      id: `lease-${b.id as string}`,
      listingId: null,
      title: (b.address as string) || 'Logement',
      address: (b.address as string) || 'Logement',
      city: (b.city as string | null) ?? '',
      neighborhood: null,
      meuble: (b.meuble as boolean | null) ?? null,
      mode: 'autogestion',
      agency: null,
      delegatedAt: null,
      rooms: [roomFor(b)],
      dueDay: null,
    })
  }

  for (const h of homes as (Home & { _agencyId?: string | null })[]) {
    if (h.mode === 'delegue' && h._agencyId) h.agency = await getAgency(supabase, h._agencyId)
    delete h._agencyId
  }
  return homes
}
