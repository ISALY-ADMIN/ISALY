'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import ConversationList from '@/components/messages/ConversationList'
import ChatArea from '@/components/messages/ChatArea'
import { createClient } from '@/lib/supabase/client'
import { CertLevel } from '@/components/ui/CertificationBadge'
import { usePresence, useOnlineUsers } from '@/hooks/usePresence'
import { useLease } from '@/contexts/LeaseContext'
import type { RichType } from '@/components/messages/ActionsPanel'
import Emoji from '@/components/ui/Emoji'

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
  sectionLabel?: string
  unread?: number
  listingId?: string | null
}

const MATCH_COLORS = ['#4ECBA0', '#6366F1', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6']

// Timestamp intelligent pour la liste : heure si aujourd'hui, "Hier", jour si < 7j, date sinon
function formatConvTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  if ((now.getTime() - d.getTime()) / 86400000 < 7) {
    return d.toLocaleDateString('fr-FR', { weekday: 'short' })
  }
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function MessagesContent() {
  const searchParams = useSearchParams()
  const router     = useRouter()
  const withName     = searchParams.get('with')
  const ownerParam   = searchParams.get('owner')
  const listingParam = searchParams.get('listing')

  const [convs, setConvs] = useState<Conv[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const { mode } = useLease()

  usePresence(currentUserId)
  const onlineIds = useOnlineUsers(currentUserId)
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
        listingId: listingParam ?? null,
      }
      setConvs(prev => prev.some(c => c.id === virtualConv.id) ? prev : [virtualConv, ...prev])
      setActiveId(virtualConv.id)
      setOwnerDraft('Bonjour, je suis intéressé(e) par votre annonce.')
    }
    openOwnerConversation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerParam, listingParam])

  async function loadConversations() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setCurrentUserId(user.id)

      // listing_id peut ne pas encore exister en prod (migration) → fallback défensif
      let { data } = await supabase
        .from('conversations')
        .select('id, user1_id, user2_id, created_at, lease_id, conversation_type, listing_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
      if (!data) {
        const { data: d2 } = await supabase
          .from('conversations')
          .select('id, user1_id, user2_id, created_at, lease_id, conversation_type')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
        data = d2 ? d2.map(c => ({ ...c, listing_id: null })) : null
      }

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
        .select('conversation_id, content, created_at, sender_id, read')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })

      const unreadByConv: Record<string, number> = {}
      lastMsgs?.forEach(m => {
        if (m.sender_id !== user.id && m.read === false) {
          unreadByConv[m.conversation_id] = (unreadByConv[m.conversation_id] ?? 0) + 1
        }
      })

      const leaseIds = Array.from(new Set(data.map(c => c.lease_id).filter(Boolean))) as string[]
      let leases: { id: string; address: string }[] = []
      if (leaseIds.length > 0) {
        const { data: leasesData } = await supabase.from('leases').select('id, address').in('id', leaseIds)
        leases = (leasesData ?? []) as { id: string; address: string }[]
      }
      const hasBailConv = data.some(c => c.conversation_type === 'bail')

      const builtConvs: Conv[] = data.map((conv, i) => {
        const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id
        const otherProfile = profiles?.find(p => p.id === otherId)
        const fn = otherProfile?.first_name ?? 'Utilisateur'
        const ln = otherProfile?.last_name ?? ''
        const name = `${fn} ${ln ? ln[0] + '.' : ''}`.trim()
        const initials = `${fn[0] ?? ''}${ln[0] ?? ''}`.toUpperCase()
        const lastMsg = lastMsgs?.find(m => m.conversation_id === conv.id)
        const isBail = conv.conversation_type === 'bail'
        const leaseAddress = isBail ? leases.find(l => l.id === conv.lease_id)?.address : undefined
        const sectionLabel = isBail
          ? (mode === 'loueur' ? (leaseAddress ?? '🏠 Baux') : '🏠 Ma colocation')
          : (hasBailConv ? '💬 Messages' : undefined)

        return {
          id: conv.id as string,
          name,
          initials,
          color: MATCH_COLORS[i % MATCH_COLORS.length],
          preview: lastMsg?.content ?? 'Nouvelle conversation',
          time: formatConvTime(lastMsg?.created_at),
          msgs: [],
          avatarUrl: (otherProfile as { avatar_url?: string | null } | undefined)?.avatar_url ?? null,
          otherUserId: otherId,
          sectionLabel,
          unread: activeId === conv.id ? 0 : (unreadByConv[conv.id as string] ?? 0),
          listingId: (conv as { listing_id?: string | null }).listing_id ?? null,
          _isBail: isBail,
        } as Conv & { _isBail: boolean }
      })

      builtConvs.sort((a, b) => {
        const aBail = (a as Conv & { _isBail?: boolean })._isBail ? 0 : 1
        const bBail = (b as Conv & { _isBail?: boolean })._isBail ? 0 : 1
        if (aBail !== bBail) return aBail - bBail
        return (a.sectionLabel ?? '').localeCompare(b.sectionLabel ?? '')
      })

      setConvs(builtConvs)
    } catch {}
    setLoading(false)
  }

  function handleSelect(id: string) {
    setActiveId(id)
    setMobileView('chat')
    setConvs(cs => cs.map(c => c.id === id ? { ...c, unread: 0 } : c))
  }

  async function handleSendRich(type: RichType, payload: Record<string, unknown>, content: string) {
    if (!activeId || activeId.startsWith('owner_')) return
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: activeId, content, type, payload }),
      })
    } catch {}
    setConvs(cs => cs.map(c => c.id === activeId ? { ...c, preview: content } : c))
  }

  useEffect(() => {
    function onRead() { loadConversations() }
    window.addEventListener('messages-read', onRead)
    return () => window.removeEventListener('messages-read', onRead)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          body: JSON.stringify({ receiver_id: receiverId, content: text, ...(listingParam ? { listing_id: listingParam } : {}) }),
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
              <div className="text-[44px] mb-3 animate-pulse"><Emoji native="💬" /></div>
              <p className="text-[14px]" style={{ color: '#6B7280' }}>Chargement…</p>
            </div>
          </div>
        ) : (
          <>
            <div className={`${mobileView === 'chat' ? 'hidden' : 'flex'} md:flex flex-shrink-0`}>
              <ConversationList
                convs={convs}
                activeId={activeId}
                onSelect={handleSelect}
                onlineIds={onlineIds}
                onViewProfile={(userId) => router.push(`/app/profil-public/${userId}`)}
              />
            </div>
            <div className={`${mobileView === 'list' ? 'hidden' : 'flex'} md:flex flex-1 flex-col overflow-hidden`}>
              <ChatArea
                conv={activeConv}
                onSend={handleSend}
                onSendRich={handleSendRich}
                defaultMessage={activeConv?.id.startsWith('owner_') ? ownerDraft : undefined}
                conversationId={activeId}
                currentUserId={currentUserId}
                otherUserId={activeConv?.otherUserId ?? null}
                listingId={activeConv?.listingId ?? null}
                onViewProfile={(userId) => router.push(`/app/profil-public/${userId}`)}
                onBack={() => setMobileView('list')}
              />
            </div>
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
