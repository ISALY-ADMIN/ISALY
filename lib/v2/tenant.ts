import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { computeCompatibility, hasCompletedTest, DIMENSIONS, type DimensionScores } from '@/lib/matching'
import { aggregateColocScores } from '@/lib/colocMatching'
import { getListingManagement, getAgency, type PartnerAgency } from '@/lib/managementMode'
import type { ManagementMode } from '@/lib/autogestion'
import type { CandidatureStatus } from '@/types/database'

/**
 * Données serveur de l'espace locataire (dashboard v2), partagées par le
 * tableau de bord, Demandes, Ma maison et Mon profil. Toutes les lectures
 * passent par le client de l'utilisateur (RLS).
 */

export interface Mate {
  id: string
  firstName: string
  avatarUrl: string | null
  /** Compatibilité avec moi, null si l'un des tests manque. */
  score: number | null
  dimensions: DimensionScores | null
}

export interface TenantLease {
  id: string
  status: 'active' | 'pending_signature'
  address: string
  city: string
  listingId: string | null
  ownerId: string
  ownerFirstName: string
  monthlyRent: number
  charges: number
  deposit: number | null
  startDate: string | null
  endDate: string | null
  meuble: boolean | null
  signedAt: string | null
  mates: Mate[]
  management: { mode: ManagementMode; agency: PartnerAgency | null; delegatedAt: string | null }
  conversationId: string | null
}

const firstNameOf = (p: { first_name?: string | null } | null | undefined) => (p?.first_name ?? '').trim() || 'Colocataire'

/** Bail du locataire : partie principale ou colocataire (même règle que LeaseContext). */
export async function resolveTenantLease(supabase: SupabaseClient, userId: string): Promise<TenantLease | null> {
  const { data: roommateRows } = await supabase.from('lease_roommates').select('lease_id').eq('profile_id', userId)
  const ids = (roommateRows ?? []).map(r => r.lease_id as string)
  const party = ids.length ? `tenant_id.eq.${userId},id.in.(${ids.join(',')})` : `tenant_id.eq.${userId}`
  const { data: rows } = await supabase
    .from('leases')
    .select('*')
    .or(party)
    .in('status', ['active', 'pending_signature'])
    .order('status', { ascending: true })
    .limit(1)
  const lease = (rows ?? [])[0] as Record<string, unknown> | undefined
  if (!lease) return null

  const leaseId = lease.id as string
  const [{ data: owner }, { data: mateRows }, { data: me }, { data: conv }] = await Promise.all([
    supabase.from('profiles').select('first_name').eq('id', lease.owner_id as string).maybeSingle(),
    supabase.from('lease_roommates').select('profile_id').eq('lease_id', leaseId),
    supabase.from('profiles').select('matching_data').eq('id', userId).maybeSingle(),
    supabase.from('conversations').select('id').eq('lease_id', leaseId).limit(1),
  ])

  const mateIds = Array.from(new Set([lease.tenant_id as string | null, ...(mateRows ?? []).map(r => r.profile_id as string)]))
    .filter((x): x is string => !!x && x !== userId)
  let mates: Mate[] = []
  if (mateIds.length) {
    const { data: people } = await supabase.from('profiles').select('id, first_name, avatar_url, matching_data').in('id', mateIds)
    mates = (people ?? []).map(p => {
      const c = computeCompatibility(me?.matching_data ?? null, p.matching_data)
      return { id: p.id as string, firstName: firstNameOf(p), avatarUrl: (p.avatar_url as string | null) ?? null, score: c?.score ?? null, dimensions: c?.dimensions ?? null }
    })
  }

  const listingId = (lease.listing_id as string | null) ?? null
  let management: TenantLease['management'] = { mode: 'autogestion', agency: null, delegatedAt: null }
  if (listingId) {
    const m = await getListingManagement(supabase, listingId)
    management = { mode: m.mode ?? 'autogestion', agency: await getAgency(supabase, m.agencyId), delegatedAt: m.delegatedAt }
  }

  const ts = lease.tenant_signature as { signed_at?: string } | null
  const os = lease.owner_signature as { signed_at?: string } | null
  return {
    id: leaseId,
    status: lease.status as 'active' | 'pending_signature',
    address: (lease.address as string) ?? '',
    city: (lease.city as string) ?? '',
    listingId,
    ownerId: lease.owner_id as string,
    ownerFirstName: firstNameOf(owner),
    monthlyRent: Number(lease.monthly_rent ?? 0),
    charges: Number(lease.charges_amount ?? 0),
    deposit: lease.deposit_amount != null ? Number(lease.deposit_amount) : null,
    startDate: (lease.start_date as string | null) ?? null,
    endDate: (lease.end_date as string | null) ?? null,
    meuble: (lease.meuble as boolean | null) ?? null,
    signedAt: ts?.signed_at && os?.signed_at ? (ts.signed_at > os.signed_at ? ts.signed_at : os.signed_at) : ts?.signed_at ?? null,
    mates,
    management,
    conversationId: ((conv ?? [])[0]?.id as string | undefined) ?? null,
  }
}

/* ── Demandes (candidatures) ─────────────────────────────────────── */
export interface TenantRequest {
  id: string
  listingId: string
  ownerId: string | null
  title: string
  city: string
  neighborhood: string | null
  rent: number
  charges: number
  photo: string | null
  status: CandidatureStatus
  appliedAt: string | null
  decidedAt: string | null
  /** Visite réservée sur un créneau du bailleur. */
  visit: { slotId: string; date: string; time: string } | null
  score: number | null
  dimensions: DimensionScores | null
  colocs: Mate[]
  priority: boolean
}

export async function listingScores(
  supabase: SupabaseClient,
  myMatching: unknown,
  listingIds: string[],
): Promise<Record<string, { score: number | null; dimensions: DimensionScores | null; colocs: Mate[] }>> {
  const out: Record<string, { score: number | null; dimensions: DimensionScores | null; colocs: Mate[] }> = {}
  if (!listingIds.length) return out
  const { data, error } = await supabase.rpc('listing_roommates', { l_ids: listingIds })
  if (error) return out
  for (const row of (data ?? []) as { listing_id: string; profile_id: string; first_name: string | null; avatar_url: string | null; matching_data: unknown }[]) {
    const e = out[row.listing_id] ?? { score: null, dimensions: null, colocs: [] }
    const c = computeCompatibility(myMatching, row.matching_data)
    e.colocs.push({ id: row.profile_id, firstName: firstNameOf(row), avatarUrl: row.avatar_url, score: c?.score ?? null, dimensions: c?.dimensions ?? null })
    out[row.listing_id] = e
  }
  for (const e of Object.values(out)) {
    const agg = aggregateColocScores(e.colocs)
    e.score = agg.averageScore
    e.dimensions = agg.averageDimensions
    e.colocs.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  }
  return out
}

export async function getTenantRequests(supabase: SupabaseClient, userId: string, myMatching: unknown, priority: boolean): Promise<TenantRequest[]> {
  const { data: swipes } = await supabase
    .from('swipes')
    .select('id, listing_id, candidature_status, applied_at, decided_at')
    .eq('swiper_id', userId)
    .not('applied_at', 'is', null)
    .order('applied_at', { ascending: false })
  const rows = (swipes ?? []).filter(s => s.listing_id) as { id: string; listing_id: string; candidature_status: CandidatureStatus | null; applied_at: string | null; decided_at: string | null }[]
  if (!rows.length) return []
  const ids = rows.map(r => r.listing_id)
  const [{ data: listings }, { data: slots }, scores] = await Promise.all([
    supabase.from('listings').select('id, owner_id, title, city, neighborhood, rent, charges, photos').in('id', ids),
    supabase.from('visit_slots').select('id, listing_id, slot_date, slot_time').eq('booked_by', userId).in('listing_id', ids),
    listingScores(supabase, myMatching, ids),
  ])
  const byId = new Map((listings ?? []).map(l => [l.id as string, l]))
  return rows.flatMap(r => {
    const l = byId.get(r.listing_id)
    if (!l) return []
    const slot = (slots ?? []).find(s => s.listing_id === r.listing_id)
    const sc = scores[r.listing_id]
    return [{
      id: r.id,
      listingId: r.listing_id,
      ownerId: (l.owner_id as string | null) ?? null,
      title: (l.title as string | null) || `Colocation à ${l.city ?? ''}`.trim(),
      city: (l.city as string) ?? '',
      neighborhood: (l.neighborhood as string | null) ?? null,
      rent: Number(l.rent ?? 0),
      charges: Number(l.charges ?? 0),
      photo: ((l.photos as string[] | null) ?? [])[0] ?? null,
      status: r.candidature_status ?? 'pending',
      appliedAt: r.applied_at,
      decidedAt: r.decided_at,
      visit: slot ? { slotId: slot.id as string, date: slot.slot_date as string, time: String(slot.slot_time).slice(0, 5) } : null,
      score: sc?.score ?? null,
      dimensions: sc?.dimensions ?? null,
      colocs: sc?.colocs ?? [],
      priority,
    }]
  })
}

/* ── Dossier ─────────────────────────────────────────────────────── */
export type DocState = 'ok' | 'pending' | 'missing' | 'rejected'
export interface DossierItem {
  key: 'identity' | 'income' | 'guarantor' | 'domicile'
  label: string
  state: DocState
}

export async function getDossierStatus(supabase: SupabaseClient, userId: string): Promise<{ items: DossierItem[]; done: number; total: number }> {
  const [{ data: docs }, { data: dossier }] = await Promise.all([
    supabase.from('user_documents').select('type, status').eq('user_id', userId),
    supabase.from('dossiers').select('identity_doc_url, identity_verified, payslips_urls, guarantor_doc_url').eq('user_id', userId).maybeSingle(),
  ])
  const list = (docs ?? []) as { type: string; status: string }[]
  const stateOf = (types: string[], legacy: boolean): DocState => {
    const found = list.filter(d => types.includes(d.type))
    if (found.some(d => d.status === 'verified')) return 'ok'
    if (found.some(d => d.status === 'pending')) return 'pending'
    if (found.some(d => d.status === 'rejected')) return 'rejected'
    return legacy ? 'pending' : 'missing'
  }
  const items: DossierItem[] = [
    { key: 'identity', label: 'Pièce d’identité', state: dossier?.identity_verified ? 'ok' : stateOf(['identity', 'identity_front', 'identity_back'], !!dossier?.identity_doc_url) },
    { key: 'income', label: 'Justificatif de revenus ou de bourse', state: stateOf(['payslip'], ((dossier?.payslips_urls as string[] | null) ?? []).length > 0) },
    { key: 'guarantor', label: 'Garant', state: stateOf(['guarantor'], !!dossier?.guarantor_doc_url) },
    { key: 'domicile', label: 'Justificatif de domicile', state: stateOf(['domicile'], false) },
  ]
  return { items, done: items.filter(i => i.state === 'ok').length, total: items.length }
}

/** Scores par dimension du test de l'utilisateur (radar), dans l'ordre de DIMENSIONS. */
export function myDimensions(matching: unknown): number[] | null {
  if (!hasCompletedTest(matching)) return null
  const scores = (matching as { scores: Record<string, number> }).scores
  // Scores déjà sur 0-100 (moyenne des 3 réponses de chaque dimension).
  return DIMENSIONS.map(d => Math.round(Number(scores[d] ?? 0)))
}
