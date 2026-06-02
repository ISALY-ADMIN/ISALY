import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

  const { data } = await supabase
    .from('user_reviews')
    .select('*, reviewer:reviewer_id(first_name, avatar_url)')
    .eq('reviewed_id', userId)
    .order('created_at', { ascending: false })

  const avg = data?.length
    ? Math.round(data.reduce((s, r) => s + (r.rating ?? 0), 0) / data.length * 10) / 10
    : null

  return NextResponse.json({ reviews: data ?? [], average: avg, count: data?.length ?? 0 })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reviewed_id, rating, comment } = await req.json()
  if (!reviewed_id || !rating) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (reviewed_id === user.id) return NextResponse.json({ error: 'Cannot review yourself' }, { status: 400 })

  const { data, error } = await supabase.from('user_reviews').upsert({
    reviewer_id: user.id,
    reviewed_id,
    rating,
    comment,
    created_at: new Date().toISOString(),
  }, { onConflict: 'reviewer_id,reviewed_id' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ review: data })
}
