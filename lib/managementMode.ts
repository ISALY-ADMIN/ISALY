import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isMissingSchema } from '@/lib/schemaFallback'
import { getAutogestionState, type ManagementMode } from '@/lib/autogestion'

/**
 * Parcours du logement (dashboard v2) : 'autogestion', 'delegue' ou null.
 *
 * Repli tant que la migration 42 n'est pas exécutée (colonne
 * listings.management_mode absente) : un logement avec un bail actif est en
 * 'autogestion', les autres à null.
 */
export interface ListingManagement {
  mode: ManagementMode
  agencyId: string | null
  delegatedAt: string | null
  /** false quand la colonne n'existe pas encore : valeur déduite. */
  persisted: boolean
}

export interface PartnerAgency {
  id: string
  name: string
  city: string
  phone: string | null
  email: string | null
  address: string | null
  opening_hours: string | null
}

async function hasActiveLease(supabase: SupabaseClient, listingId: string): Promise<boolean> {
  const { count } = await supabase
    .from('leases')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', listingId)
    .eq('status', 'active')
  return (count ?? 0) > 0
}

export async function getListingManagement(supabase: SupabaseClient, listingId: string): Promise<ListingManagement> {
  const { data, error } = await supabase
    .from('listings')
    .select('management_mode, partner_agency_id, delegated_at')
    .eq('id', listingId)
    .maybeSingle()
  if (error && isMissingSchema(error)) {
    return { mode: (await hasActiveLease(supabase, listingId)) ? 'autogestion' : null, agencyId: null, delegatedAt: null, persisted: false }
  }
  const row = data as { management_mode?: string | null; partner_agency_id?: string | null; delegated_at?: string | null } | null
  const raw = row?.management_mode
  let mode: ManagementMode = raw === 'autogestion' || raw === 'delegue' ? raw : null
  // Un bail actif sans parcours enregistré (logement antérieur au v2) : autogestion.
  if (!mode && (await hasActiveLease(supabase, listingId))) mode = 'autogestion'
  return { mode, agencyId: row?.partner_agency_id ?? null, delegatedAt: row?.delegated_at ?? null, persisted: true }
}

/** Parcours de plusieurs logements d'un coup (tableaux de bord). */
export async function getListingsManagement(
  supabase: SupabaseClient,
  listingIds: string[],
): Promise<Record<string, ListingManagement>> {
  const out: Record<string, ListingManagement> = {}
  if (!listingIds.length) return out
  const { data: leases } = await supabase.from('leases').select('listing_id').in('listing_id', listingIds).eq('status', 'active')
  const withLease = new Set((leases ?? []).map(l => l.listing_id as string))
  const { data, error } = await supabase
    .from('listings')
    .select('id, management_mode, partner_agency_id, delegated_at')
    .in('id', listingIds)
  const persisted = !(error && isMissingSchema(error))
  const rows = (persisted ? data ?? [] : []) as { id: string; management_mode?: string | null; partner_agency_id?: string | null; delegated_at?: string | null }[]
  for (const id of listingIds) {
    const r = rows.find(x => x.id === id)
    const raw = r?.management_mode
    let mode: ManagementMode = raw === 'autogestion' || raw === 'delegue' ? raw : null
    if (!mode && withLease.has(id)) mode = 'autogestion'
    out[id] = { mode, agencyId: r?.partner_agency_id ?? null, delegatedAt: r?.delegated_at ?? null, persisted }
  }
  return out
}

/** Parcours du logement d'un bail. Bail sans annonce liée : autogestion. */
export async function getLeaseManagement(supabase: SupabaseClient, leaseId: string): Promise<ListingManagement & { listingId: string | null }> {
  const { data: lease } = await supabase.from('leases').select('listing_id').eq('id', leaseId).maybeSingle()
  const listingId = (lease?.listing_id as string | null) ?? null
  if (!listingId) return { mode: 'autogestion', agencyId: null, delegatedAt: null, persisted: false, listingId: null }
  return { ...(await getListingManagement(supabase, listingId)), listingId }
}

/** Agence partenaire active dans une ville (null si aucune ou table absente). */
export async function findActiveAgency(supabase: SupabaseClient, city: string | null | undefined): Promise<PartnerAgency | null> {
  if (!city) return null
  const { data, error } = await supabase
    .from('partner_agencies')
    .select('id, name, city, phone, email, address, opening_hours')
    .eq('active', true)
    .ilike('city', city.trim())
    .limit(1)
  if (error) return null
  return ((data ?? [])[0] as PartnerAgency | undefined) ?? null
}

export async function getAgency(supabase: SupabaseClient, agencyId: string | null | undefined): Promise<PartnerAgency | null> {
  if (!agencyId) return null
  const { data, error } = await supabase
    .from('partner_agencies')
    .select('id, name, city, phone, email, address, opening_hours')
    .eq('id', agencyId)
    .maybeSingle()
  if (error) return null
  return (data as PartnerAgency | null) ?? null
}

export const READ_ONLY_DELEGATED =
  'Ce logement est confié à une agence partenaire : il est en lecture seule sur ISALY.'
export const READ_ONLY_SUBSCRIPTION =
  'Ton abonnement autogestion est inactif : tes logements en autogestion sont en lecture seule.'

/**
 * Garde serveur des écritures de gestion (loyers, maintenance, bail,
 * documents) côté bailleur. Renvoie une réponse 403 à retourner telle quelle,
 * ou null si l'écriture est permise.
 */
export async function guardLeaseWrite(
  supabase: SupabaseClient,
  ownerId: string,
  leaseId: string,
): Promise<NextResponse | null> {
  const m = await getLeaseManagement(supabase, leaseId)
  if (m.mode === 'delegue') {
    return NextResponse.json({ error: READ_ONLY_DELEGATED, code: 'delegated_read_only' }, { status: 403 })
  }
  const sub = await getAutogestionState(supabase, ownerId)
  if (!sub.active) {
    return NextResponse.json({ error: READ_ONLY_SUBSCRIPTION, code: 'subscription_read_only' }, { status: 403 })
  }
  return null
}

/** Même garde, à partir d'un logement (annonce). */
export async function guardListingWrite(
  supabase: SupabaseClient,
  ownerId: string,
  listingId: string,
): Promise<NextResponse | null> {
  const m = await getListingManagement(supabase, listingId)
  if (m.mode === 'delegue') {
    return NextResponse.json({ error: READ_ONLY_DELEGATED, code: 'delegated_read_only' }, { status: 403 })
  }
  if (m.mode === 'autogestion') {
    const sub = await getAutogestionState(supabase, ownerId)
    if (!sub.active) {
      return NextResponse.json({ error: READ_ONLY_SUBSCRIPTION, code: 'subscription_read_only' }, { status: 403 })
    }
  }
  return null
}
