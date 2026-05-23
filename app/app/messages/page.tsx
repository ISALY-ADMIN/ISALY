'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import ConversationList from '@/components/messages/ConversationList'
import ChatArea from '@/components/messages/ChatArea'
import { createClient } from '@/lib/supabase/client'

interface Msg {
  from: 'me' | 'them'
  text: string
  time: string
}

import { CertLevel } from '@/components/ui/CertificationBadge'

interface Conv {
  id: string
  name: string
  initials: string
  color: string
  preview: string
  time: string
  msgs: Msg[]
  certLevel?: CertLevel
}

const MATCH_COLORS = ['#4ECBA0', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6']

function MessagesContent() {
  const searchParams = useSearchParams()
  const withName    = searchParams.get('with')
  const listingParam = searchParams.get('listing')
  const ownerParam  = searchParams.get('owner')

  const [convs, setConvs] = useState<Conv[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [ownerDraft, setOwnerDraft] = useState('')

  useEffect(() => {
    loadConversations()
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

      const { data: matchData } = await supabase
        .from('matches')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (!matchData || matchData.length === 0) { setLoading(false); return }

      const matchIds = matchData.map(m => m.id)
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, match_id')
        .in('match_id', matchIds)

      if (!conversations || conversations.length === 0) { setLoading(false); return }

      const otherUserIds = matchData
        .map(m => m.user1_id === user.id ? m.user2_id : m.user1_id)
        .filter(Boolean) as string[]

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', otherUserIds)

      const builtConvs: Conv[] = matchData
        .map((match, i) => {
          const conversation = conversations.find(c => c.match_id === match.id)
          if (!conversation) return null

          const otherId = match.user1_id === user.id ? match.user2_id : match.user1_id
          const otherProfile = profiles?.find(p => p.id === otherId)
          const fn = otherProfile?.first_name ?? 'Utilisateur'
          const ln = otherProfile?.last_name ?? ''
          const name = `${fn} ${ln[0] ?? ''}.`.trim()
          const initials = `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase()

          const conv: Conv = {
            id: conversation.id as string,
            name,
            initials,
            color: MATCH_COLORS[i % MATCH_COLORS.length],
            preview: 'Nouvelle conversation',
            time: '',
            msgs: [],
          }
          return conv
        })
        .filter((c): c is Conv => c !== null)

      setConvs(builtConvs)
    } catch {}
    setLoading(false)
  }

  async function loadMessages(convId: string) {
    try {
      const res = await fetch(`/api/messages?conversationId=${convId}`)
      if (!res.ok) return
      const json = await res.json()
      if (!json.messages) return

      const mapped: Msg[] = json.messages.map((m: Record<string, unknown>) => ({
        from: m.sender_id === currentUserId ? 'me' : 'them',
        text: m.content as string ?? '',
        time: new Date(m.created_at as string).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      }))

      setConvs(cs => cs.map(c => {
        if (c.id !== convId) return c
        const lastMsg = mapped[mapped.length - 1]
        return {
          ...c,
          msgs: mapped,
          preview: lastMsg?.text ?? 'Nouvelle conversation',
          time: lastMsg?.time ?? '',
        }
      }))
    } catch {}
  }

  function handleSelect(id: string) {
    setActiveId(id)
    const conv = convs.find(c => c.id === id)
    if (conv && conv.msgs.length === 0) {
      loadMessages(id)
    }
  }

  async function handleSend(text: string) {
    if (!activeId) return
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const newMsg: Msg = { from: 'me', text, time: now }

    setConvs(cs => cs.map(c =>
      c.id === activeId
        ? { ...c, msgs: [...c.msgs, newMsg], preview: text, time: now }
        : c
    ))

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeId, content: text }),
      })
    } catch {}
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
