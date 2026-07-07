import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Get-or-create d'une conversation entre l'utilisateur courant et `receiver_id`.
 * Retourne { id } — jamais de doublon (une seule conv par paire d'utilisateurs).
 * `listing_id` optionnel : lie la conv à l'annonce d'origine (contexte "Contacter").
 */
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const receiver_id = body?.receiver_id
  const listing_id = body?.listing_id

  if (!receiver_id || typeof receiver_id !== 'string') {
    return NextResponse.json({ error: 'receiver_id required' }, { status: 400 })
  }
  if (receiver_id === user.id) {
    return NextResponse.json({ error: 'Cannot start a conversation with yourself' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .or(`and(user1_id.eq.${user.id},user2_id.eq.${receiver_id}),and(user1_id.eq.${receiver_id},user2_id.eq.${user.id})`)
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json({ id: existing[0].id })
  }

  let { data: created, error } = await supabase
    .from('conversations')
    .insert({ user1_id: user.id, user2_id: receiver_id, ...(listing_id ? { listing_id } : {}) })
    .select('id')
    .single()
  if (error && listing_id) {
    ;({ data: created, error } = await supabase
      .from('conversations')
      .insert({ user1_id: user.id, user2_id: receiver_id })
      .select('id')
      .single())
  }
  if (error || !created) {
    return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 })
  }
  return NextResponse.json({ id: created.id })
}
