import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasCompletedTest } from '@/lib/matching'
import { fetchIsalyScore } from '@/lib/isalyScore'
import { getSwipeQuota } from '@/lib/swipeQuota'
import { getDossierStatus, getTenantRequests, listingScores, resolveTenantLease } from '@/lib/v2/tenant'

export const dynamic = 'force-dynamic'

/**
 * Tableau de bord locataire (dashboard v2) : un seul appel pour les deux
 * états, « en recherche » et « installé ». Chaque bloc se replie sur une
 * valeur vide plutôt que d'échouer.
 */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, avatar_url, bio, city, budget_max, matching_data, swiper_plus_active, swiper_plus_expires_at')
    .eq('id', user.id)
    .maybeSingle()
  const matching = profile?.matching_data ?? null

  const [lease, quota, dossier, score] = await Promise.all([
    resolveTenantLease(supabase, user.id).catch(() => null),
    getSwipeQuota(supabase, user.id).catch(() => ({ used: 0, limit: 10, remaining: 10, plus: false })),
    getDossierStatus(supabase, user.id).catch(() => ({ items: [], done: 0, total: 0 })),
    fetchIsalyScore(supabase, user.id).catch(() => null),
  ])

  const installed = lease?.status === 'active'
  const requests = await getTenantRequests(supabase, user.id, matching, quota.plus).catch(() => [])

  // Annonces compatibles pas encore vues (en recherche seulement).
  let suggestions: {
    id: string; title: string; city: string; neighborhood: string | null; rent: number; charges: number
    surface: number | null; photo: string | null; score: number | null; colocs: { id: string; firstName: string; avatarUrl: string | null; score: number | null }[]
  }[] = []
  if (!installed) {
    const [{ data: swiped }, { data: listings }] = await Promise.all([
      supabase.from('swipes').select('swiped_id, listing_id').eq('swiper_id', user.id),
      supabase.from('listings')
        .select('id, owner_id, title, city, neighborhood, rent, charges, surface, photos')
        .eq('is_active', true)
        .neq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(60),
    ])
    const seen = new Set((swiped ?? []).flatMap(s => [s.swiped_id as string, s.listing_id as string]).filter(Boolean))
    const fresh = (listings ?? []).filter(l => !seen.has(l.id as string))
    const scores = await listingScores(supabase, matching, fresh.map(l => l.id as string))
    suggestions = fresh
      .map(l => {
        const sc = scores[l.id as string]
        return {
          id: l.id as string,
          title: (l.title as string | null) || `Colocation à ${l.city ?? ''}`.trim(),
          city: (l.city as string) ?? '',
          neighborhood: (l.neighborhood as string | null) ?? null,
          rent: Number(l.rent ?? 0),
          charges: Number(l.charges ?? 0),
          surface: (l.surface as number | null) ?? null,
          photo: ((l.photos as string[] | null) ?? [])[0] ?? null,
          score: sc?.score ?? null,
          colocs: (sc?.colocs ?? []).map(c => ({ id: c.id, firstName: c.firstName, avatarUrl: c.avatarUrl, score: c.score })),
        }
      })
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
      .slice(0, 12)
  }

  // Installé : prochain loyer, signalement en cours, derniers messages de la coloc.
  let nextRent: { month: string; amount: number; status: string; due_date: string | null } | null = null
  let openIssue: { id: string; title: string; status: string; comment: string | null } | null = null
  let lastMessages: { id: string; senderId: string; content: string; createdAt: string }[] = []
  if (lease && installed) {
    const [{ data: pay }, { data: issues }, msgs] = await Promise.all([
      supabase.from('rent_payments').select('month, amount, status, due_date').eq('lease_id', lease.id)
        .in('status', ['pending', 'late']).order('month', { ascending: true }).limit(1)
        .then(r => (r.error
          ? supabase.from('rent_payments').select('month, amount, status').eq('lease_id', lease.id)
              .in('status', ['pending', 'late']).order('month', { ascending: true }).limit(1)
          : r)),
      supabase.from('maintenance_requests').select('id, title, status, bailleur_comment')
        .eq('lease_id', lease.id).neq('status', 'resolved').order('created_at', { ascending: false }).limit(1),
      lease.conversationId
        ? supabase.from('messages').select('id, sender_id, content, created_at')
            .eq('conversation_id', lease.conversationId).order('created_at', { ascending: false }).limit(2)
        : Promise.resolve({ data: [] as { id: string; sender_id: string; content: string | null; created_at: string }[] }),
    ])
    const p = (pay ?? [])[0]
    nextRent = p ? { month: p.month as string, amount: Number(p.amount ?? 0), status: p.status as string, due_date: ((p as { due_date?: string | null }).due_date) ?? null } : null
    const i = (issues ?? [])[0]
    openIssue = i ? { id: i.id as string, title: i.title as string, status: i.status as string, comment: (i.bailleur_comment as string | null) ?? null } : null
    lastMessages = ((msgs.data ?? []) as { id: string; sender_id: string; content: string | null; created_at: string }[])
      .reverse()
      .map(m => ({ id: m.id, senderId: m.sender_id, content: m.content ?? '', createdAt: m.created_at }))
  }

  return NextResponse.json({
    firstName: (profile?.first_name as string | null) ?? '',
    profileCreated: !!profile?.first_name && !!profile?.city,
    testDone: hasCompletedTest(matching),
    installed,
    lease,
    quota: { used: quota.used, limit: quota.limit, plus: quota.plus },
    dossier,
    isalyScore: score?.score ?? null,
    requests,
    suggestions,
    nextRent,
    openIssue,
    lastMessages,
  })
}
