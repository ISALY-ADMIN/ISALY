import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/** Anti-spam : relation réelle requise (conversation, match ou bail commun). */
async function hasRelation(supabase: SupabaseClient, a: string, b: string): Promise<boolean> {
  const pair = `and(user1_id.eq.${a},user2_id.eq.${b}),and(user1_id.eq.${b},user2_id.eq.${a})`
  const leasePair = `and(tenant_id.eq.${a},owner_id.eq.${b}),and(tenant_id.eq.${b},owner_id.eq.${a})`
  const [conv, match, lease] = await Promise.all([
    supabase.from('conversations').select('id').or(pair).limit(1),
    supabase.from('matches').select('id').or(pair).limit(1),
    supabase.from('leases').select('id').or(leasePair).limit(1),
  ])
  return !!(conv.data?.length || match.data?.length || lease.data?.length)
}

async function notify(userId: string, type: string, title: string, body: string, link: string) {
  try {
    await serviceClient().from('notifications').insert({ user_id: userId, type, title, body, link, read: false })
  } catch { /* la notification ne doit jamais bloquer l'action */ }
}

// ── GET : avis reçus + moyenne + distribution + contexte viewer ──
export async function GET(req: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('user_reviews')
    .select('id, reviewer_id, reviewed_id, rating, comment, created_at, reply, replied_at, reported, reviewer:reviewer_id(first_name, avatar_url)')
    .eq('reviewed_id', userId)
    .order('created_at', { ascending: false })

  const reviews = data ?? []
  const average = reviews.length
    ? Math.round(reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length * 10) / 10
    : null
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const r of reviews) if (r.rating >= 1 && r.rating <= 5) distribution[r.rating]++

  let canReview = false
  let myReview = null
  if (user && user.id !== userId) {
    myReview = reviews.find(r => r.reviewer_id === user.id) ?? null
    canReview = myReview ? true : await hasRelation(supabase, user.id, userId)
  }

  return NextResponse.json({
    reviews, average, count: reviews.length, distribution,
    viewer_id: user?.id ?? null, can_review: canReview, my_review: myReview,
  })
}

// ── POST : créer / modifier son avis (relation réelle requise) ──
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reviewed_id, rating, comment } = await req.json()
  const nRating = Number(rating)
  if (!reviewed_id || !Number.isInteger(nRating) || nRating < 1 || nRating > 5) {
    return NextResponse.json({ error: 'Note invalide (1 à 5).' }, { status: 400 })
  }
  if (reviewed_id === user.id) {
    return NextResponse.json({ error: 'Impossible de laisser un avis sur soi-même.' }, { status: 400 })
  }
  const trimmed = String(comment ?? '').trim()
  if (trimmed.length < 20) {
    return NextResponse.json({ error: 'Le commentaire doit faire au moins 20 caractères.' }, { status: 400 })
  }

  // Anti-spam : conversation OU match OU bail commun
  const related = await hasRelation(supabase, user.id, reviewed_id)
  if (!related) {
    return NextResponse.json(
      { error: 'Vous ne pouvez laisser un avis qu\'après une interaction réelle (conversation, match ou bail).' },
      { status: 403 }
    )
  }

  // Existait déjà ? → modification (pas de nouvelle notification)
  const { data: existing } = await supabase
    .from('user_reviews')
    .select('id')
    .eq('reviewer_id', user.id)
    .eq('reviewed_id', reviewed_id)
    .maybeSingle()

  const { data: saved, error } = await supabase.from('user_reviews').upsert({
    reviewer_id: user.id,
    reviewed_id,
    rating: nRating,
    comment: trimmed,
    created_at: new Date().toISOString(),
  }, { onConflict: 'reviewer_id,reviewed_id' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!existing) {
    const { data: me } = await supabase.from('profiles').select('first_name').eq('id', user.id).single()
    await notify(
      reviewed_id, 'review',
      '⭐ Nouvel avis reçu',
      `${me?.first_name ?? 'Un utilisateur'} vous a laissé un avis ${nRating}★.`,
      '/app/profil'
    )
  }

  return NextResponse.json({ review: saved })
}

// ── PATCH : répondre à un avis (une fois) ou le signaler ──
export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, action, reply } = await req.json()
  if (!id || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: review } = await supabase
    .from('user_reviews')
    .select('id, reviewer_id, reviewed_id, reply')
    .eq('id', id)
    .single()
  if (!review) return NextResponse.json({ error: 'Avis introuvable.' }, { status: 404 })

  if (action === 'reply') {
    if (review.reviewed_id !== user.id) {
      return NextResponse.json({ error: 'Seule la personne évaluée peut répondre.' }, { status: 403 })
    }
    if (review.reply) {
      return NextResponse.json({ error: 'Vous avez déjà répondu à cet avis.' }, { status: 409 })
    }
    const trimmed = String(reply ?? '').trim()
    if (!trimmed) return NextResponse.json({ error: 'Réponse vide.' }, { status: 400 })

    const { data: updated, error } = await supabase
      .from('user_reviews')
      .update({ reply: trimmed, replied_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: me } = await supabase.from('profiles').select('first_name').eq('id', user.id).single()
    await notify(
      review.reviewer_id, 'review',
      '💬 Réponse à votre avis',
      `${me?.first_name ?? 'Un utilisateur'} a répondu à votre avis.`,
      `/app/profil-public/${review.reviewed_id}`
    )
    return NextResponse.json({ review: updated })
  }

  if (action === 'report') {
    // Signalement par n'importe quel utilisateur connecté → service role
    const { error } = await serviceClient()
      .from('user_reviews')
      .update({ reported: true })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
}
