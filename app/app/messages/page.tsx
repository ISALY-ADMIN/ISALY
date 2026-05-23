'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import ConversationList from '@/components/messages/ConversationList'
import ChatArea from '@/components/messages/ChatArea'
import { createClient } from '@/lib/supabase/client'
import { CertLevel } from '@/components/ui/CertificationBadge'

interface Msg {
  from: 'me' | 'them'
  text: string
  time: string
  created_at?: string
  replyTo?: { text: string; from: 'me' | 'them' }
}

interface Conv {
  id: string
  name: string
  initials: string
  color: string
  preview: string
  time: string
  msgs: Msg[]
  certLevel?: CertLevel
  avatarUrl?: string | null
  otherUserId?: string | null
}

const MATCH_COLORS = ['#4ECBA0', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6']

function MessagesContent() {
  const searchParams = useSearchParams()
  const router     = useRouter()
  const withName   = searchParams.get('with')
  const ownerParam = searchParams.get('owner')

  const [convs, setConvs] = useState<Conv[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [ownerDraft, setOwnerDraft] = useState('')

  useEffect(() => {
    loadConversations()

    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel>

    ;(async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id
      if (!userId) return

      channel = supabase
        .channel('new-conversations')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `user1_id=eq.${userId}`,
        }, () => loadConversations())
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `user2_id=eq.${userId}`,
        }, () => loadConversations())
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        }, () => loadConversations())
        .subscribe()
    })()

    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (withName && convs.length > 0) {
      const match = convs.find(c => c.name.toLowerCase().includes(withName.toLowerCase()))
      if (match) setActiveId(match.id)
    }
  }, [withName, convs])

  useEffect(() => {
    if (!ownerParam) return
    async function openOwnerConversation() {
      const supabase = createClient()
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', ownerParam)
        .single()
      const fn = ownerProfile?.first_name ?? 'Annonceur'
      const ln = ownerProfile?.last_name ?? ''
      const name = `${fn}${ln ? ' ' + ln[0] + '.' : ''}`.trim()
      const initials = `${fn[0] ?? 'A'}${ln[0] ?? ''}`.toUpperCase()
      const virtualConv: Conv = {
        id: `owner_${ownerParam}`,
        name,
        initials,
        color: '#10B981',
        preview: 'Bonjour, je suis intéressé(e) par votre annonce.',
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        msgs: [],
        avatarUrl: null,
        otherUserId: ownerParam,
      }
      setConvs(prev => prev.some(c => c.id === virtualConv.id) ? prev : [virtualConv, ...prev])
      setActiveId(virtualConv.id)
      setOwnerDraft('Bonjour, je suis intéressé(e) par votre annonce.')
    }
    openOwnerConversation()
  }, [ownerParam])

  async function loadConversations() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setCurrentUserId(user.id)

      const { data } = await supabase
        .from('conversations')
        .select('id, user1_id, user2_id, created_at')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (!data || data.length === 0) { setLoading(false); return }

      const otherUserIds = data
        .map(c => c.user1_id === user.id ? c.user2_id : c.user1_id)
        .filter(Boolean) as string[]

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', otherUserIds)

      const convIds = data.map(c => c.id)
      const { data: lastMsgs } = await supabase
        .from('messages')
        .select('conversation_id, content, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })

      const builtConvs: Conv[] = data.map((conv, i) => {
        const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id
        const otherProfile = profiles?.find(p => p.id === otherId)
        const fn = otherProfile?.first_name ?? 'Utilisateur'
        const ln = otherProfile?.last_name ?? ''
        const name = `${fn} ${ln ? ln[0] + '.' : ''}`.trim()
        const initials = `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase()
        const lastMsg = lastMsgs?.find(m => m.conversation_id === conv.id)

        return {
          id: conv.id as string,
          name,
          initials,
          color: MATCH_COLORS[i % MATCH_COLORS.length],
          preview: lastMsg?.content ?? 'Nouvelle conversation',
          time: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
          msgs: [],
          avatarUrl: (otherProfile as { avatar_url?: string | null } | undefined)?.avatar_url ?? null,
          otherUserId: otherId,
        }
      })

      setConvs(builtConvs)
    } catch {}
    setLoading(false)
  }

  function handleSelect(id: string) {
    setActiveId(id)
  }

  async function handleSend(text: string, replyTo?: { text: string; from: 'me' | 'them' }) {
    if (!activeId) return
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    const isVirtual = activeId.startsWith('owner_')

    if (isVirtual) {
      const newMsg: Msg = { from: 'me', text, time: now, ...(replyTo ? { replyTo } : {}) }
      setConvs(cs => cs.map(c =>
        c.id === activeId
          ? { ...c, msgs: [...c.msgs, newMsg], preview: text, time: now }
          : c
      ))
      const receiverId = activeId.replace('owner_', '')
      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receiver_id: receiverId, content: text }),
        })
        const json = await res.json()
        if (json.message?.conversation_id) {
          // Replace virtual conv with real one
          const realId = json.message.conversation_id as string
          setConvs(cs => cs.map(c =>
            c.id === activeId ? { ...c, id: realId } : c
          ))
          setActiveId(realId)
          await loadConversations()
        }
      } catch {}
    } else {
      try {
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversation_id: activeId, content: text }),
        })
      } catch {}
      setConvs(cs => cs.map(c =>
        c.id === activeId ? { ...c, preview: text, time: now } : c
      ))
    }
  }

  const activeConv = convs.find(c => c.id === activeId) ?? null

  return (
    <>
      <Topbar title="Messages" />
      <div
        className="flex flex-1 overflow-hidden"
        style={{ height: 'calc(100vh - 54px)' }}
      >
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="text-[44px] mb-3 animate-pulse">💬</div>
              <p className="text-[14px]" style={{ color: '#6B7280' }}>Chargement…</p>
            </div>
          </div>
        ) : (
          <>
            <ConversationList convs={convs} activeId={activeId} onSelect={handleSelect} />
            <ChatArea
              conv={activeConv}
              onSend={handleSend}
              defaultMessage={activeConv?.id.startsWith('owner_') ? ownerDraft : undefined}
              conversationId={activeId}
              currentUserId={currentUserId}
              onViewProfile={(userId) => router.push(`/app/profil?user=${userId}`)}
            />
          </>
        )}
      </div>
    </>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">Chargement…</div>}>
      <MessagesContent />
    </Suspense>
  )
}
