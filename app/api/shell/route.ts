import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { roleToMode } from '@/lib/roles'
import { getSwipeQuota } from '@/lib/swipeQuota'
import { getAutogestionState } from '@/lib/autogestion'

export const dynamic = 'force-dynamic'

/**
 * Données de la coque du dashboard v2 : identité, mode, pastilles de la
 * navigation (calculées sur les vraies données), carte d'état de la barre
 * latérale. Chaque compteur se replie sur 0 en cas d'erreur : la coque ne
 * doit jamais tomber à cause d'un compteur.
 */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, avatar_url, role, is_admin')
    .eq('id', user.id)
    .maybeSingle()

  const mode = roleToMode(profile?.role)

  const safeCount = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
    try {
      const { count, error } = await q
      return error ? 0 : count ?? 0
    } catch {
      return 0
    }
  }

  // Messages non lus (même requête que l'ancienne barre latérale).
  const messages = await safeCount(
    supabase.from('messages').select('*', { count: 'exact', head: true }).eq('read', false).neq('sender_id', user.id),
  )

  let demandes = 0
  let candidatures = 0
  let maintenance = 0

  if (mode === 'locataire') {
    // Visites proposées à confirmer.
    demandes = await safeCount(
      supabase.from('swipes').select('id', { count: 'exact', head: true })
        .eq('swiper_id', user.id).eq('candidature_status', 'visit_proposed'),
    )
  } else {
    const { data: listings } = await supabase.from('listings').select('id').eq('owner_id', user.id)
    const ids = (listings ?? []).map(l => l.id as string)
    if (ids.length) {
      candidatures = await safeCount(
        supabase.from('swipes').select('id', { count: 'exact', head: true })
          .in('listing_id', ids).eq('candidature_status', 'pending').not('applied_at', 'is', null),
      )
    }
    const { data: leases } = await supabase.from('leases').select('id').eq('owner_id', user.id)
    const leaseIds = (leases ?? []).map(l => l.id as string)
    if (leaseIds.length) {
      maintenance = await safeCount(
        supabase.from('maintenance_requests').select('*', { count: 'exact', head: true })
          .in('lease_id', leaseIds).in('status', ['sent', 'received']),
      )
    }
  }

  const [quota, autogestion] = await Promise.all([
    getSwipeQuota(supabase, user.id).catch(() => null),
    getAutogestionState(supabase, user.id).catch(() => null),
  ])

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? '',
      firstName: profile?.first_name ?? '',
      lastName: profile?.last_name ?? '',
      avatarUrl: profile?.avatar_url ?? null,
      isAdmin: profile?.is_admin === true,
    },
    mode,
    badges: { messages, demandes, candidatures, maintenance },
    swipes: quota
      ? { used: quota.used, limit: quota.limit, plus: quota.plus }
      : { used: 0, limit: 10, plus: false },
    autogestion: autogestion ?? { required: false, active: true, status: null, periodEnd: null, subscriptionId: null },
  })
}
