import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/admin/serviceClient'

/** POST { reviewId, action: 'keep' | 'delete' } — modère un avis signalé. */
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!adminProfile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let reviewId: string, action: string
  try {
    ;({ reviewId, action } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!reviewId || (action !== 'keep' && action !== 'delete')) {
    return NextResponse.json({ error: 'Missing reviewId or invalid action' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: review } = await admin
    .from('user_reviews')
    .select('id, reviewer_id, reviewed_id')
    .eq('id', reviewId)
    .single()

  if (!review) return NextResponse.json({ error: 'Avis introuvable' }, { status: 404 })

  if (action === 'keep') {
    const { error } = await admin
      .from('user_reviews')
      .update({ reported: false })
      .eq('id', reviewId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await admin.from('user_reviews').delete().eq('id', reviewId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await admin.from('notifications').insert({
      user_id: review.reviewer_id,
      type: 'system',
      title: 'Votre avis a été retiré par la modération',
      body: 'Il ne respectait pas les règles de la communauté ISALY.',
      link: '/app/profil',
    })
  }

  await admin.from('admin_actions').insert({
    admin_id: user.id,
    action: action === 'keep' ? 'keep_review' : 'delete_review',
    target_type: 'user_review',
    target_id: reviewId,
    details: { reviewer_id: review.reviewer_id, reviewed_id: review.reviewed_id },
  })

  return NextResponse.json({ success: true })
}
