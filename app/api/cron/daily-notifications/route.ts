import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { computeProfileCompletion } from '@/lib/profileCompletion'

export const runtime = 'nodejs'
export const maxDuration = 300

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Cron quotidien 9h — notifications contextuelles :
 * 1. "Ton profil a été vu X fois cette semaine" (lundi uniquement, X > 0)
 * 2. (couvert par le cron horaire search-alerts — pas dupliqué ici)
 * 3. "Dossier incomplet" si complétion < 60% (max 1 fois / 7 jours)
 * 4. Loueur : annonce < 5 vues sur 7 jours → nudge boost (lundi uniquement)
 * Le type 5 (swipe reçu sur profil incomplet) est déclenché en temps réel
 * dans /api/swipe.
 */
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const isMonday = new Date().getDay() === 1
  const weekAgo = new Date(Date.now() - WEEK_MS).toISOString()
  let created = 0

  // ── 1. Vues profil de la semaine (hebdo : le lundi) ──
  if (isMonday) {
    const { data: views } = await supabase
      .from('profile_views')
      .select('viewed_id')
      .gte('created_at', weekAgo)

    if (views?.length) {
      const countByUser = new Map<string, number>()
      for (const v of views) countByUser.set(v.viewed_id, (countByUser.get(v.viewed_id) ?? 0) + 1)
      for (const [userId, count] of Array.from(countByUser.entries())) {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'view',
          title: `Ton profil a été vu ${count} fois cette semaine 👀`,
          body: 'Complète ton profil pour transformer ces vues en matchs.',
          link: '/app/profil',
        })
        created++
      }
    }
  }

  // ── 3. Dossier incomplet (< 60%, max 1 nudge / 7 jours) ──
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, avatar_url, first_name, last_name, city, bio, budget_max, matching_data, cert_level, last_incomplete_nudge_at, onboarding_completed, role')
    .eq('onboarding_completed', true)

  for (const p of profiles ?? []) {
    const completion = computeProfileCompletion({
      avatarUrl: p.avatar_url, firstName: p.first_name, lastName: p.last_name,
      city: p.city, bio: p.bio, budgetMax: p.budget_max,
      matchingData: p.matching_data as Record<string, unknown> | null, certLevel: p.cert_level,
    })
    const lastNudge = p.last_incomplete_nudge_at ? new Date(p.last_incomplete_nudge_at).getTime() : 0
    if (completion < 60 && Date.now() - lastNudge > WEEK_MS) {
      await supabase.from('notifications').insert({
        user_id: p.id,
        type: 'system',
        title: 'Ton dossier est incomplet 📁',
        body: `Profil complété à ${completion}% — complète-le pour apparaître en priorité.`,
        link: '/app/profil#dossier',
      })
      await supabase.from('profiles').update({ last_incomplete_nudge_at: new Date().toISOString() }).eq('id', p.id)
      created++
    }
  }

  // ── 5. Mission 15 : expiration du mode recherche urgente ──
  const { data: expiredUrgent } = await supabase
    .from('profiles')
    .select('id')
    .eq('urgent_search_active', true)
    .lt('urgent_search_expires_at', new Date().toISOString())

  for (const p of expiredUrgent ?? []) {
    await supabase.from('profiles').update({ urgent_search_active: false }).eq('id', p.id)
    await supabase.from('notifications').insert({
      user_id: p.id,
      type: 'system',
      title: 'Votre mode recherche urgente a expiré',
      body: 'Toujours en recherche ? Réactivez-le depuis votre profil pour rester en tête du swipe.',
      link: '/app/profil',
    })
    created++
  }

  // ── 4. Loueur : annonces peu vues (hebdo : le lundi) ──
  if (isMonday) {
    const { data: listings } = await supabase
      .from('listings')
      .select('id, title, owner_id, boost_tier, created_at')
      .eq('is_active', true)
      .lte('created_at', weekAgo) // annonce en ligne depuis au moins 7 jours

    for (const l of listings ?? []) {
      if (!l.owner_id) continue
      if (l.boost_tier && l.boost_tier !== 'standard') continue // déjà boostée
      const { count } = await supabase
        .from('listing_views')
        .select('id', { count: 'exact', head: true })
        .eq('listing_id', l.id)
        .gte('created_at', weekAgo)
      if ((count ?? 0) < 5) {
        await supabase.from('notifications').insert({
          user_id: l.owner_id,
          type: 'alert',
          title: `« ${l.title ?? 'Ton annonce'} » reçoit peu de vues 📉`,
          body: `${count ?? 0} vue${(count ?? 0) > 1 ? 's' : ''} cette semaine — booste-la pour plus de visibilité.`,
          link: `/app/boost?listing=${l.id}`,
        })
        created++
      }
    }
  }

  return NextResponse.json({ created, monday: isMonday })
}
