import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/admin/serviceClient'
import { computeCompatibility, DIMENSIONS, DIMENSION_LABELS, type DimensionScores } from '@/lib/matching'
import { getListingsManagement, findActiveAgency } from '@/lib/managementMode'
import { getAutogestionState } from '@/lib/autogestion'
import { isSwiperPlusActive } from '@/lib/swipeQuota'
import { emploiLabel } from '@/lib/candidatures'

export const dynamic = 'force-dynamic'

/**
 * Candidatures reçues (dashboard v2) : par annonce et par statut, avec la
 * compatibilité du candidat avec chaque colocataire en place et sur les 5
 * dimensions, son dossier, et le parcours du logement. Les abonnés Swiper
 * Plus passent en tête (demandes prioritaires).
 */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, city, neighborhood, is_active')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
  const L = (listings ?? []) as { id: string; title: string | null; city: string | null; neighborhood: string | null; is_active: boolean }[]
  const ids = L.map(l => l.id)
  if (!ids.length) return NextResponse.json({ listings: [], candidatures: [], dimLabels: DIMENSIONS.map(d => DIMENSION_LABELS[d]), autogestionActive: true })

  const [{ data: swipes }, mgmt, rm, sub] = await Promise.all([
    supabase.from('swipes').select('*').in('listing_id', ids).not('applied_at', 'is', null).order('applied_at', { ascending: false }),
    getListingsManagement(supabase, ids),
    supabase.rpc('listing_roommates', { l_ids: ids }),
    getAutogestionState(supabase, user.id),
  ])
  const S = (swipes ?? []) as Record<string, unknown>[]
  const candIds = Array.from(new Set(S.map(s => s.swiper_id as string)))

  // Service : profils, documents et abonnement des candidats ne sont pas
  // lisibles sous RLS. Seuls des statuts et des scores sortent de la route.
  const admin = createAdminClient()
  const [{ data: people }, { data: docs }, { data: slots }] = await Promise.all([
    candIds.length ? admin.from('profiles').select('id, first_name, avatar_url, matching_data, cert_level, swiper_plus_active, swiper_plus_expires_at').in('id', candIds) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    candIds.length ? admin.from('user_documents').select('user_id, type, status').in('user_id', candIds) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    admin.from('visit_slots').select('listing_id, booked_by, slot_date, slot_time').in('listing_id', ids).eq('is_booked', true),
  ])
  const byPerson = new Map(((people ?? []) as Record<string, unknown>[]).map(p => [p.id as string, p]))
  const roommates = (rm.error ? [] : rm.data ?? []) as { listing_id: string; profile_id: string; first_name: string | null; matching_data: unknown }[]

  const agencies: Record<string, { id: string; name: string } | null> = {}
  for (const l of L) {
    if (mgmt[l.id]?.mode) continue
    const a = await findActiveAgency(supabase, l.city)
    agencies[l.id] = a ? { id: a.id, name: a.name } : null
  }

  const docState = (uid: string, types: string[]) => {
    const d = ((docs ?? []) as { user_id: string; type: string; status: string }[]).filter(x => x.user_id === uid && types.includes(x.type))
    if (d.some(x => x.status === 'verified')) return 'ok'
    if (d.length) return 'pending'
    return 'missing'
  }

  const candidatures = S.map(s => {
    const uid = s.swiper_id as string
    const p = byPerson.get(uid) ?? {}
    const lid = s.listing_id as string
    const mates = roommates.filter(r => r.listing_id === lid && r.profile_id !== uid)
    const per = mates.map(m => {
      const c = computeCompatibility(p.matching_data ?? null, m.matching_data)
      return { id: m.profile_id, firstName: (m.first_name ?? '').trim() || 'Colocataire', score: c?.score ?? null, dims: c?.dimensions ?? null }
    })
    const scored = per.filter(x => x.score != null)
    const score = scored.length ? Math.round(scored.reduce((a, x) => a + (x.score ?? 0), 0) / scored.length) : null
    const dims = scored.length
      ? DIMENSIONS.map(d => Math.round(scored.reduce((a, x) => a + ((x.dims as DimensionScores)[d] ?? 0), 0) / scored.length))
      : null
    const slot = ((slots ?? []) as { listing_id: string; booked_by: string; slot_date: string; slot_time: string }[]).find(v => v.listing_id === lid && v.booked_by === uid)
    return {
      id: s.id as string,
      userId: uid,
      listingId: lid,
      firstName: ((p.first_name as string | null) ?? '').trim() || 'Candidat',
      avatarUrl: (p.avatar_url as string | null) ?? null,
      job: emploiLabel(s.emploi_situation as never) ?? null,
      moveIn: (s.move_in_date as string | null) ?? null,
      message: (s.motivation_message as string | null) ?? '',
      status: ((s.candidature_status as string | null) ?? 'pending'),
      appliedAt: s.applied_at as string,
      priority: isSwiperPlusActive(p as { swiper_plus_active?: boolean | null; swiper_plus_expires_at?: string | null }),
      first: mates.length === 0,
      per: per.map(x => ({ id: x.id, firstName: x.firstName, score: x.score })),
      score,
      dims,
      visit: slot ? { date: slot.slot_date, time: String(slot.slot_time).slice(0, 5) } : null,
      dossier: {
        identity: (p.cert_level as number | null) && Number(p.cert_level) >= 2 ? 'ok' : docState(uid, ['identity', 'identity_front', 'identity_back']),
        income: docState(uid, ['payslip']),
        guarantor: s.has_garant === true ? (docState(uid, ['guarantor', 'garant']) === 'missing' ? 'declared' : docState(uid, ['guarantor', 'garant'])) : docState(uid, ['guarantor', 'garant']),
      },
    }
  })
  // Demandes prioritaires (Swiper Plus) en tête, puis les plus récentes.
  candidatures.sort((a, b) => Number(b.priority) - Number(a.priority) || b.appliedAt.localeCompare(a.appliedAt))

  return NextResponse.json({
    listings: L.map(l => ({
      id: l.id,
      title: l.title || 'Annonce',
      place: [l.neighborhood, l.city].filter(Boolean).join(', '),
      city: l.city ?? '',
      isActive: l.is_active,
      mode: mgmt[l.id]?.mode ?? null,
      agency: agencies[l.id] ?? null,
    })),
    candidatures,
    dimLabels: DIMENSIONS.map(d => DIMENSION_LABELS[d]),
    autogestionActive: sub.active,
  })
}
