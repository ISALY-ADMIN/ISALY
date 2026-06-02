import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversationId')

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId required' }, { status: 400 })
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { conversation_id, content, receiver_id } = body

  let convId = conversation_id

  // Si pas de conversation_id, crée ou trouve une conversation existante
  if (!convId && receiver_id) {
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${receiver_id}),and(user1_id.eq.${receiver_id},user2_id.eq.${user.id})`)
      .single()

    if (existing) {
      convId = existing.id
    } else {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({ user1_id: user.id, user2_id: receiver_id })
        .select('id')
        .single()
      if (convError) return NextResponse.json({ error: convError.message }, { status: 500 })
      convId = newConv.id
    }
  }

  if (!convId) return NextResponse.json({ error: 'No conversation_id' }, { status: 400 })

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: convId,
      sender_id: user.id,
      content,
      read: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the other participant
  const { data: convData } = await supabase
    .from('conversations')
    .select('user1_id, user2_id')
    .eq('id', convId)
    .single()

  const otherUserId = convData?.user1_id === user.id ? convData?.user2_id : convData?.user1_id
  if (otherUserId) {
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', user.id)
      .single()
    await supabase.from('notifications').insert({
      user_id: otherUserId,
      type: 'message',
      title: `Nouveau message de ${senderProfile?.first_name ?? 'quelqu\'un'}`,
      body: content.slice(0, 80),
      read: false,
      link: '/app/messages',
    })
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://isaly.fr'}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: otherUserId,
          title: `Nouveau message de ${senderProfile?.first_name ?? 'quelqu\'un'}`,
          body: content.slice(0, 80),
          url: '/app/messages',
        }),
      })
    } catch {}
  }

  return NextResponse.json({ message: data })
}
