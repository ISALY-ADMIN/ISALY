import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/admin/serviceClient'
import { getOwnerHomes } from '@/lib/v2/owner'
import { getAutogestionState } from '@/lib/autogestion'

export const dynamic = 'force-dynamic'

/**
 * Tableau de bord bailleur (dashboard v2). Les chiffres clés ne portent que
 * sur les logements en autogestion ; un logement confié à une agence reste
 * affiché, en lecture seule.
 */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: me }, homes, autogestion] = await Promise.all([
    supabase.from('profiles').select('first_name').eq('id', user.id).maybeSingle(),
    getOwnerHomes(supabase, user.id).catch(() => []),
    getAutogestionState(supabase, user.id),
  ])

  const listingIds = homes.map(h => h.listingId).filter((x): x is string => !!x)
  const leaseIds = homes.flatMap(h => h.rooms.map(r => r.leaseId)).filter((x): x is string => !!x)

  const [candRes, maintRes] = await Promise.all([
    listingIds.length
      ? supabase.from('swipes').select('id, swiper_id, listing_id, candidature_status, applied_at').in('listing_id', listingIds).not('applied_at', 'is', null)
      : Promise.resolve({ data: [] as { id: string; swiper_id: string; listing_id: string; candidature_status: string | null; applied_at: string }[] }),
    leaseIds.length
      ? supabase.from('maintenance_requests').select('id, title, status, created_at, lease_id, tenant_id').in('lease_id', leaseIds).neq('status', 'resolved').order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as { id: string; title: string; status: string; created_at: string; lease_id: string; tenant_id: string }[] }),
  ])
  const cands = (candRes.data ?? []) as { id: string; swiper_id: string; listing_id: string; candidature_status: string | null; applied_at: string }[]
  const newCands = cands.filter(c => (c.candidature_status ?? 'pending') === 'pending')
  // Dossier validé sur un logement sans parcours : le choix est à faire.
  const toChoose = cands.filter(c => c.candidature_status === 'accepted' && homes.find(h => h.listingId === c.listing_id)?.mode == null)
  const names = new Map<string, string>()
  const ids = Array.from(new Set([...toChoose.map(c => c.swiper_id), ...((maintRes.data ?? []).map(m => m.tenant_id))]))
  if (ids.length) {
    const { data } = await supabase.from('profiles').select('id, first_name').in('id', ids)
    for (const p of data ?? []) names.set(p.id as string, (p.first_name as string | null) || 'Un candidat')
  }

  // Performance de l'annonce la plus vue : vues et swipes à droite sur 7 jours.
  let perf: { listingId: string; title: string; days: { label: string; views: number; likes: number }[]; totals: { views: number; likes: number; requests: number } } | null = null
  if (listingIds.length) {
    const since = new Date()
    since.setHours(0, 0, 0, 0)
    since.setDate(since.getDate() - 6)
    try {
      // Service : listing_views n'est pas lisible par le bailleur sous RLS ;
      // seuls des comptes agrégés de ses propres annonces sortent d'ici.
      const admin = createAdminClient()
      const [{ data: views }, { data: likes }] = await Promise.all([
        admin.from('listing_views').select('listing_id, viewed_on').in('listing_id', listingIds).gte('viewed_on', since.toISOString().slice(0, 10)),
        admin.from('swipes').select('listing_id, created_at').in('listing_id', listingIds).in('direction', ['right', 'super']).gte('created_at', since.toISOString()),
      ])
      const byListing = new Map<string, number>()
      for (const v of views ?? []) byListing.set(v.listing_id as string, (byListing.get(v.listing_id as string) ?? 0) + 1)
      const top = Array.from(byListing.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? listingIds[0]
      const labels = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(since)
        d.setDate(since.getDate() + i)
        const key = d.toISOString().slice(0, 10)
        return {
          label: labels[d.getDay()],
          views: (views ?? []).filter(v => v.listing_id === top && String(v.viewed_on).slice(0, 10) === key).length,
          likes: (likes ?? []).filter(l => l.listing_id === top && String(l.created_at).slice(0, 10) === key).length,
        }
      })
      const home = homes.find(h => h.listingId === top)
      perf = {
        listingId: top,
        title: home?.title ?? 'Annonce',
        days,
        totals: {
          views: days.reduce((s, d) => s + d.views, 0),
          likes: days.reduce((s, d) => s + d.likes, 0),
          requests: cands.filter(c => c.listing_id === top && new Date(c.applied_at) >= since).length,
        },
      }
    } catch {
      perf = null
    }
  }

  return NextResponse.json({
    firstName: (me?.first_name as string | null) ?? '',
    homes,
    autogestion,
    newCandidatures: newCands.length,
    newCandListing: newCands[0]?.listing_id ?? null,
    toChoose: toChoose.map(c => ({ id: c.id, listingId: c.listing_id, name: names.get(c.swiper_id) ?? 'Un candidat' })),
    maintenance: (maintRes.data ?? []).map(m => ({ id: m.id, title: m.title, status: m.status, createdAt: m.created_at, leaseId: m.lease_id, by: names.get(m.tenant_id) ?? 'Un locataire' })),
    perf,
  })
}
