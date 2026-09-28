'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePresence, useOnlineUsers, useUserPresence, formatLastSeen } from '@/hooks/usePresence'
import type { RichType } from '@/components/messages/ActionsPanel'
import AgendaPanel from '@/components/visits/AgendaPanel'
import { Bubble, Button, EmptyState, Icon, SkelPanel, Stack, personColor, relativeWhen } from '@/components/ui-v2'
import { noEmoji, useShell } from '@/components/ui-v2/shell/AppShell'
import RichMessageV2 from '@/components/ui-v2/messages/RichMessageV2'
import ActionsModalV2 from '@/components/ui-v2/messages/ActionsModalV2'

interface Msg {
  id?: string
  from: 'me' | 'them'
  senderId?: string
  text: string
  time: string
  created_at?: string
  type?: string
  payload?: Record<string, unknown> | null
  replyTo?: { text: string; from: 'me' | 'them' }
}

interface Conv {
  id: string
  title: string
  sub: string
  group: string
  isBail: boolean
  name: string
  preview: string
  when: string
  lastAt: string
  avatarUrl: string | null
  otherUserId: string | null
  unread: number
  listingId: string | null
  msgs: Msg[]
}

const RICH_TYPES = ['visite', 'reservation', 'annonce', 'document']
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

export default function Messages() {
  const params = useSearchParams()
  const router = useRouter()
  const { mode } = useShell()
  const withName = params.get('with')
  const ownerParam = params.get('owner')
  const listingParam = params.get('listing')
  const convParam = params.get('conversation')
  const [agendaOpen, setAgendaOpen] = useState(params.get('agenda') === '1')

  const [convs, setConvs] = useState<Conv[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [me, setMe] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [ownerDraft, setOwnerDraft] = useState('')
  const activeRef = useRef<string | null>(null)
  activeRef.current = activeId

  // Présence existante (heartbeat + canal de présence).
  usePresence(me)
  const onlineIds = useOnlineUsers(me)

  const loadConversations = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setMe(user.id)

      // listing_id peut manquer (migration) : repli défensif, comme l'existant.
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
      if (!data || data.length === 0) { setConvs(cs => cs.filter(c => c.id.startsWith('owner_'))); setLoading(false); return }

      const otherIds = data.map(c => (c.user1_id === user.id ? c.user2_id : c.user1_id)).filter(Boolean) as string[]
      const convIds = data.map(c => c.id as string)
      const leaseIds = Array.from(new Set(data.map(c => c.lease_id).filter(Boolean))) as string[]
      const listingIds = Array.from(new Set(data.map(c => (c as { listing_id?: string | null }).listing_id).filter(Boolean))) as string[]
      const [{ data: profiles }, { data: lastMsgs }, leasesRes, listingsRes] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name, avatar_url').in('id', otherIds),
        supabase.from('messages').select('conversation_id, content, created_at, sender_id, read').in('conversation_id', convIds).order('created_at', { ascending: false }),
        leaseIds.length ? supabase.from('leases').select('id, address, city').in('id', leaseIds) : Promise.resolve({ data: [] as { id: string; address: string; city: string | null }[] }),
        listingIds.length ? supabase.from('listings').select('id, title, neighborhood, city').in('id', listingIds) : Promise.resolve({ data: [] as { id: string; title: string | null; neighborhood: string | null; city: string | null }[] }),
      ])

      const unread: Record<string, number> = {}
      lastMsgs?.forEach(m => {
        if (m.sender_id !== user.id && m.read === false) unread[m.conversation_id] = (unread[m.conversation_id] ?? 0) + 1
      })

      const built: Conv[] = data.map(c => {
        const otherId = (c.user1_id === user.id ? c.user2_id : c.user1_id) as string | null
        const p = profiles?.find(x => x.id === otherId)
        const first = (p?.first_name as string | null) ?? 'Utilisateur'
        const last = lastMsgs?.find(m => m.conversation_id === c.id)
        const isBail = c.conversation_type === 'bail'
        const lease = isBail ? (leasesRes.data ?? []).find(l => l.id === c.lease_id) : undefined
        const listing = (listingsRes.data ?? []).find(l => l.id === (c as { listing_id?: string | null }).listing_id)
        const address = lease ? [lease.address, lease.city].filter(Boolean).join(', ') : ''
        let title = first
        let sub = listing ? (listing.title || [listing.neighborhood, listing.city].filter(Boolean).join(', ')) : ''
        let group: string
        if (mode === 'loueur') {
          if (isBail) { title = lease?.address || 'Logement'; sub = 'Fil de la colocation'; group = 'Logements' }
          else { sub = sub ? `Candidat, ${sub}` : 'Candidat'; group = 'Candidats' }
        } else if (isBail) {
          title = 'Ma colocation'; sub = address ? `${address}, avec ${first}` : `Avec ${first}`; group = 'Ma colocation'
        } else {
          sub = sub || 'Colocation'; group = 'Colocations'
        }
        const preview = last?.content ? `${last.sender_id === user.id ? 'Toi : ' : ''}${noEmoji(String(last.content))}` : sub
        return {
          id: c.id as string,
          title, sub, group, isBail,
          name: first,
          preview,
          when: relativeWhen(last?.created_at),
          lastAt: (last?.created_at as string | undefined) ?? (c.created_at as string),
          avatarUrl: (p?.avatar_url as string | null) ?? null,
          otherUserId: otherId,
          unread: activeRef.current === c.id ? 0 : unread[c.id as string] ?? 0,
          listingId: (c as { listing_id?: string | null }).listing_id ?? null,
          msgs: [],
        }
      })
      built.sort((a, b) => Number(b.isBail) - Number(a.isBail) || b.lastAt.localeCompare(a.lastAt))
      setConvs(prev => [...prev.filter(c => c.id.startsWith('owner_') && !built.some(b => b.otherUserId === c.otherUserId)), ...built])
    } catch {
      /* liste vide plutôt qu'une erreur */
    }
    setLoading(false)
  }, [mode])

  // Nouvelles conversations et nouveaux messages : callbacks posés avant subscribe().
  useEffect(() => {
    loadConversations()
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let alive = true
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !alive) return
      channel = supabase
        .channel(`v2-conversations:${user.id}:${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations', filter: `user1_id=eq.${user.id}` }, () => loadConversations())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations', filter: `user2_id=eq.${user.id}` }, () => loadConversations())
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => loadConversations())
        .subscribe()
    })
    const onRead = () => loadConversations()
    window.addEventListener('messages-read', onRead)
    return () => {
      alive = false
      if (channel) supabase.removeChannel(channel)
      window.removeEventListener('messages-read', onRead)
    }
  }, [loadConversations])

  // Ouverture par ?with=, ?conversation=, ?owner= (liens existants).
  useEffect(() => {
    if (!convs.length) return
    if (convParam) {
      const m = convs.find(c => c.id === convParam)
      if (m && activeId !== m.id) select(m.id)
    } else if (withName && !activeId) {
      const m = convs.find(c => c.name.toLowerCase().includes(withName.toLowerCase()))
      if (m) select(m.id)
    } else if (!activeId && !ownerParam && window.innerWidth > 900) {
      setActiveId(convs[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convParam, withName, convs])

  useEffect(() => {
    if (!ownerParam) return
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: existing } = user
        ? await supabase.from('conversations').select('id')
            .or(`and(user1_id.eq.${user.id},user2_id.eq.${ownerParam}),and(user1_id.eq.${ownerParam},user2_id.eq.${user.id})`).limit(1)
        : { data: null }
      if (existing && existing[0]) {
        select(existing[0].id as string)
        return
      }
      const { data: owner } = await supabase.from('profiles').select('first_name, avatar_url').eq('id', ownerParam).maybeSingle()
      const first = (owner?.first_name as string | null) ?? 'Annonceur'
      const virtual: Conv = {
        id: `owner_${ownerParam}`, title: first, sub: 'Nouvelle conversation', group: mode === 'loueur' ? 'Candidats' : 'Colocations',
        isBail: false, name: first, preview: 'Nouvelle conversation', when: '', lastAt: new Date().toISOString(),
        avatarUrl: (owner?.avatar_url as string | null) ?? null, otherUserId: ownerParam, unread: 0, listingId: listingParam ?? null, msgs: [],
      }
      setConvs(prev => (prev.some(c => c.id === virtual.id) ? prev : [virtual, ...prev]))
      setActiveId(virtual.id)
      setOpen(true)
      setOwnerDraft('Bonjour, je suis intéressé par votre annonce.')
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerParam, listingParam])

  function select(id: string) {
    setActiveId(id)
    setOpen(true)
    setConvs(cs => cs.map(c => (c.id === id ? { ...c, unread: 0 } : c)))
  }

  async function handleSendRich(type: RichType, payload: Record<string, unknown>, content: string) {
    if (!activeId || activeId.startsWith('owner_')) return
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: activeId, content, type, payload }),
      })
    } catch { /* le fil se resynchronise en temps réel */ }
  }

  async function handleSend(text: string, replyTo?: Msg['replyTo']) {
    if (!activeId) return
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    if (activeId.startsWith('owner_')) {
      setConvs(cs => cs.map(c => (c.id === activeId ? { ...c, msgs: [...c.msgs, { from: 'me', text, time: now, ...(replyTo ? { replyTo } : {}) }], preview: `Toi : ${text}` } : c)))
      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ receiver_id: activeId.replace('owner_', ''), content: text, ...(listingParam ? { listing_id: listingParam } : {}) }),
        })
        const json = await res.json()
        if (json.message?.conversation_id) {
          const realId = json.message.conversation_id as string
          setConvs(cs => cs.filter(c => c.id !== activeId))
          setActiveId(realId)
          await loadConversations()
        }
      } catch { /* conservé localement */ }
      return
    }
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: activeId, content: text }),
      })
    } catch { /* idem */ }
    setConvs(cs => cs.map(c => (c.id === activeId ? { ...c, preview: `Toi : ${text}`, when: now } : c)))
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? convs.filter(c => c.title.toLowerCase().includes(q) || c.preview.toLowerCase().includes(q)) : convs
  }, [convs, query])
  const groups = Array.from(new Set(filtered.map(c => c.group)))
  const active = convs.find(c => c.id === activeId) ?? null

  if (loading) {
    return <div className="mwrap"><SkelPanel lines={6} /><SkelPanel lines={8} /></div>
  }

  if (!convs.length) {
    return (
      <div className="screen">
        <EmptyState
          icon="chat"
          title="Pas encore de conversation"
          text={mode === 'loueur' ? 'Tes échanges avec tes candidats et le fil de chaque colocation apparaîtront ici.' : 'Envoie une demande à une coloc : vous pourrez échanger ici, et le fil de ta colocation s’ouvrira à la signature du bail.'}
          actions={<Button variant="main" href={mode === 'loueur' ? '/app/candidatures' : '/app/swipe'}>{mode === 'loueur' ? 'Voir les candidatures' : 'Trouver une coloc'}</Button>}
        />
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="mwrap" data-open={open ? 1 : 0}>
        <div className="panel mlist">
          <div className="acts" style={{ gap: 8, flexWrap: 'nowrap', marginBottom: 10 }}>
            <label className="sr" htmlFor="msearch">Rechercher une conversation</label>
            <input id="msearch" className="input" type="search" placeholder="Rechercher une conversation" autoComplete="off" value={query} onChange={e => setQuery(e.target.value)} style={{ marginBottom: 0 }} />
            <button className="iconbtn" type="button" aria-label="Agenda des visites" onClick={() => setAgendaOpen(true)}><Icon name="calendar" size={18} /></button>
          </div>
          <div className="mscroll">
            {groups.map(g => (
              <div key={g}>
                <div className="mgroup">{g}</div>
                {filtered.filter(c => c.group === g).map(c => (
                  <button key={c.id} className="conv" type="button" aria-current={c.id === activeId} onClick={() => select(c.id)}>
                    <Stack people={[{ n: c.name, c: personColor(c.otherUserId), avatar: c.avatarUrl }]} size={34} />
                    <span className="grow">
                      <span className="t">{c.title}</span>
                      <span className="s">{c.preview}</span>
                    </span>
                    <span style={{ display: 'grid', justifyItems: 'end', gap: 4 }}>
                      <span className="when">{c.when}</span>
                      {c.unread > 0 && <span className="count">{c.unread}</span>}
                    </span>
                  </button>
                ))}
              </div>
            ))}
            {!filtered.length && <p className="s" style={{ padding: 10 }}>Aucune conversation ne correspond.</p>}
          </div>
        </div>
        <ChatV2
          conv={active}
          me={me}
          online={!!active?.otherUserId && onlineIds.has(active.otherUserId)}
          onBack={() => setOpen(false)}
          onSend={handleSend}
          onSendRich={handleSendRich}
          defaultMessage={active?.id.startsWith('owner_') ? ownerDraft : undefined}
          onViewProfile={id => router.push(`/app/profil-public/${id}`)}
        />
      </div>
      <AgendaPanel open={agendaOpen} onClose={() => setAgendaOpen(false)} />
    </div>
  )
}

/* ── Conversation ─────────────────────────────────────────────────── */
function ChatV2({
  conv, me, online, onBack, onSend, onSendRich, defaultMessage, onViewProfile,
}: {
  conv: Conv | null
  me: string | null
  online: boolean
  onBack: () => void
  onSend: (text: string, replyTo?: Msg['replyTo']) => void
  onSendRich: (type: RichType, payload: Record<string, unknown>, content: string) => void
  defaultMessage?: string
  onViewProfile: (id: string) => void
}) {
  const conversationId = conv?.id ?? null
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [reactions, setReactions] = useState<Record<string, { emoji: string; userId: string }[]>>({})
  const [picker, setPicker] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [ctxFor, setCtxFor] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [replyTo, setReplyTo] = useState<Msg | null>(null)
  const [actions, setActions] = useState<{ open: boolean; view?: RichType }>({ open: false })
  const msgsRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { lastSeen } = useUserPresence(conv?.otherUserId ?? null)

  useEffect(() => {
    if (defaultMessage) setInput(defaultMessage)
  }, [defaultMessage])

  useEffect(() => {
    const close = () => { setCtxFor(null); setPicker(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  // Messages + temps réel (INSERT, UPDATE) + réactions : même logique que ChatArea.
  useEffect(() => {
    setMessages([])
    setReactions({})
    if (!conversationId || conversationId.startsWith('owner_') || !me) return
    const supabase = createClient()
    const toMsg = (m: { id: string; content: string | null; sender_id: string; created_at: string; type?: string | null; payload?: Record<string, unknown> | null }): Msg => ({
      id: m.id,
      from: m.sender_id === me ? 'me' : 'them',
      senderId: m.sender_id,
      text: m.content ?? '',
      time: new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      created_at: m.created_at,
      type: m.type ?? 'text',
      payload: m.payload ?? null,
    })
    ;(async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at, type, payload')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (error || !data) return
      setMessages(data.map(toMsg))
      const ids = data.map(m => m.id)
      if (ids.length) {
        const { data: reacts } = await supabase.from('message_reactions').select('message_id, user_id, emoji').in('message_id', ids)
        const map: Record<string, { emoji: string; userId: string }[]> = {}
        ids.forEach(id => { map[id] = [] })
        reacts?.forEach(r => { (map[r.message_id] ??= []).push({ emoji: r.emoji, userId: r.user_id }) })
        setReactions(map)
      }
      await supabase.from('messages').update({ read: true }).eq('conversation_id', conversationId).neq('sender_id', me)
      window.dispatchEvent(new CustomEvent('messages-read'))
    })()

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, payload => {
        const m = payload.new as Parameters<typeof toMsg>[0]
        setMessages(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, toMsg(m)]))
        setReactions(prev => (prev[m.id] ? prev : { ...prev, [m.id]: [] }))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, payload => {
        const m = payload.new as Parameters<typeof toMsg>[0]
        setMessages(prev => prev.map(x => (x.id === m.id ? { ...x, text: m.content ?? x.text, type: m.type ?? x.type, payload: m.payload ?? x.payload } : x)))
      })
      .subscribe()
    const reactChannel = supabase
      .channel(`reactions:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions' }, payload => {
        const r = payload.new as { message_id: string; user_id: string; emoji: string }
        setReactions(prev => {
          const list = prev[r.message_id]
          if (list === undefined || list.some(x => x.userId === r.user_id && x.emoji === r.emoji)) return prev
          return { ...prev, [r.message_id]: [...list, { emoji: r.emoji, userId: r.user_id }] }
        })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_reactions' }, payload => {
        const r = payload.old as { message_id: string; user_id: string; emoji: string }
        setReactions(prev => (prev[r.message_id] ? { ...prev, [r.message_id]: prev[r.message_id].filter(x => !(x.userId === r.user_id && x.emoji === r.emoji)) } : prev))
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(reactChannel)
    }
  }, [conversationId, me])

  const virtual = conv?.id.startsWith('owner_') ?? false
  const shown = virtual ? conv?.msgs ?? [] : messages

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [shown.length])

  async function toggleReaction(messageId: string | undefined, emoji: string) {
    setPicker(null)
    setHovered(null)
    if (!messageId || !me) return
    const supabase = createClient()
    const mine = reactions[messageId]?.some(r => r.userId === me && r.emoji === emoji)
    const snapshot = reactions[messageId] ?? []
    if (mine) {
      setReactions(prev => ({ ...prev, [messageId]: (prev[messageId] ?? []).filter(r => !(r.userId === me && r.emoji === emoji)) }))
      const { error } = await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', me).eq('emoji', emoji)
      if (error) setReactions(prev => ({ ...prev, [messageId]: snapshot }))
    } else {
      setReactions(prev => ({ ...prev, [messageId]: [...(prev[messageId] ?? []), { emoji, userId: me }] }))
      const { error } = await supabase.from('message_reactions').insert({ message_id: messageId, user_id: me, emoji })
      if (error) setReactions(prev => ({ ...prev, [messageId]: snapshot }))
    }
  }

  async function respondRich(messageId: string | undefined, current: Record<string, unknown> | null | undefined, status: 'accepted' | 'refused') {
    if (!messageId) return
    const next = { ...(current ?? {}), status }
    setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, payload: next } : m)))
    await createClient().from('messages').update({ payload: next }).eq('id', messageId)
  }

  function send(e?: React.FormEvent) {
    e?.preventDefault()
    if (!input.trim() || !conv) return
    onSend(input.trim(), replyTo ? { text: replyTo.text, from: replyTo.from } : undefined)
    setInput('')
    setReplyTo(null)
  }

  if (!conv) {
    return (
      <section className="panel chat" aria-label="Conversation">
        <div className="empty" style={{ margin: 'auto' }}>
          <span className="ico brand"><Icon name="chat" size={26} /></span>
          <h3>Choisis une conversation</h3>
          <p>Sélectionne un fil à gauche pour lire et répondre.</p>
        </div>
      </section>
    )
  }

  const statusLine = online ? `${conv.name} est en ligne` : conv.isBail ? conv.sub : formatLastSeen(lastSeen) || conv.sub

  return (
    <section className="panel chat" aria-label={`Conversation : ${conv.title}`}>
      <div className="chat-h">
        <button className="iconbtn back-m" type="button" aria-label="Retour aux conversations" onClick={onBack}><Icon name="chevron" size={18} /></button>
        <button type="button" className="avatar-btn" aria-label={`Voir le profil de ${conv.name}`} onClick={() => conv.otherUserId && onViewProfile(conv.otherUserId)}>
          <Bubble name={conv.name} color={personColor(conv.otherUserId)} size={38} avatar={conv.avatarUrl} />
        </button>
        <span className="grow">
          <span className="t">{conv.title}</span>
          {online ? <span className="online">{statusLine}</span> : <span className="s">{statusLine}</span>}
        </span>
        <button className="iconbtn" type="button" aria-label="Proposer une visite" disabled={virtual} onClick={() => setActions({ open: true, view: 'visite' })}><Icon name="calendar" size={18} /></button>
        <button className="iconbtn" type="button" aria-label="Actions" disabled={virtual} onClick={() => setActions({ open: true })}><Icon name="more" size={18} /></button>
      </div>

      <div className="msgs" ref={msgsRef} aria-live="polite">
        {shown.map((m, i) => {
          const mine = m.from === 'me'
          const prev = shown[i - 1]
          const day = m.created_at ? new Date(m.created_at).toDateString() : ''
          const showDay = !!m.created_at && (!prev?.created_at || new Date(prev.created_at).toDateString() !== day)
          const isRich = !!m.type && RICH_TYPES.includes(m.type)
          const list = m.id ? reactions[m.id] ?? [] : []
          const counts = list.reduce<Record<string, number>>((acc, r) => { acc[r.emoji] = (acc[r.emoji] ?? 0) + 1; return acc }, {})
          return (
            <div key={m.id ?? i} style={{ display: 'contents' }}>
              {showDay && <span className="day">{dayLabel(m.created_at!)}</span>}
              <div
                className={mine ? 'msg me' : 'msg'}
                onContextMenu={e => { e.preventDefault(); setCtxFor(i); setPicker(m.id ?? null) }}
                onMouseEnter={() => m.id && setHovered(m.id)}
                onMouseLeave={() => setHovered(h => (h === m.id ? null : h))}
                style={{ position: 'relative' }}
              >
                {!mine && <Bubble name={conv.name} color={personColor(conv.otherUserId)} size={30} avatar={conv.avatarUrl} />}
                <div style={{ position: 'relative', minWidth: 0 }}>
                  {/* Menu contextuel (clic droit) : enfant direct du message. */}
                  {ctxFor === i && (
                    <div className="pop sm" role="menu" style={{ top: -8, right: mine ? 0 : 'auto', left: mine ? 'auto' : 0 }} onClick={e => e.stopPropagation()}>
                      <button className="item" type="button" role="menuitem" onClick={() => { setReplyTo(m); setCtxFor(null) }}><Icon name="send" size={18} /><span>Répondre</span></button>
                      {mine && !isRich && m.created_at && Date.now() - new Date(m.created_at).getTime() < 30 * 60000 && (
                        <button className="item" type="button" role="menuitem" onClick={() => { setEditing(i); setEditText(m.text); setCtxFor(null) }}><Icon name="edit" size={18} /><span>Modifier</span></button>
                      )}
                      <button className="item" type="button" role="menuitem" onClick={() => { setMessages(p => p.filter((_, idx) => idx !== i)); setCtxFor(null) }}><Icon name="x" size={18} /><span>Supprimer pour moi</span></button>
                    </div>
                  )}
                  {/* Réactions : enfant direct du message, sans portail. */}
                  {m.id && (hovered === m.id || picker === m.id) && (
                    <div style={{ position: 'absolute', bottom: '100%', left: mine ? 'auto' : 0, right: mine ? 0 : 'auto', paddingBottom: 4, zIndex: 50 }} onClick={e => e.stopPropagation()}>
                      <div className="react" style={{ height: 36, gap: 2, padding: '0 6px', margin: 0 }} role="group" aria-label="Réagir">
                        {REACTIONS.map(e => (
                          <button key={e} type="button" aria-label={`Réagir ${e}`} onClick={() => toggleReaction(m.id, e)} style={{ border: 0, background: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4 }}>{e}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {!mine && conv.isBail && <div className="who">{conv.name}</div>}
                  {editing === i ? (
                    <form className="acts" onSubmit={e => { e.preventDefault(); setMessages(p => p.map((x, idx) => (idx === i ? { ...x, text: editText } : x))); setEditing(null) }}>
                      <input className="input" autoFocus value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setEditing(null) }} />
                      <Button variant="main" size="sm" type="submit">Enregistrer</Button>
                    </form>
                  ) : isRich ? (
                    <RichMessageV2
                      type={m.type!}
                      payload={m.payload ?? null}
                      isMe={mine}
                      onRespond={s => respondRich(m.id, m.payload, s)}
                      onCounter={() => setActions({ open: true, view: 'visite' })}
                      establishLeaseHref={!mine && m.type === 'reservation' && conv.otherUserId
                        ? `/app/baux/nouveau?tenant=${conv.otherUserId}${(m.payload?.listing_id ?? conv.listingId) ? `&listing=${String(m.payload?.listing_id ?? conv.listingId)}` : ''}`
                        : null}
                    />
                  ) : (
                    <div className="b" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {m.replyTo && (
                        <span className="s" style={{ display: 'block', borderLeft: '3px solid currentColor', paddingLeft: 8, marginBottom: 6, opacity: 0.85, color: 'inherit' }}>
                          {m.replyTo.from === 'me' ? 'Toi' : conv.name} : {m.replyTo.text}
                        </span>
                      )}
                      {m.text}
                    </div>
                  )}
                  {Object.entries(counts).map(([e, n]) => (
                    <button key={e} type="button" className="react" onClick={() => toggleReaction(m.id, e)} aria-pressed={list.some(r => r.emoji === e && r.userId === me)}>
                      <span aria-hidden="true">{e}</span>{n > 1 ? n : ''}
                    </button>
                  ))}
                  <time>{m.time}</time>
                </div>
              </div>
            </div>
          )
        })}
        {!shown.length && <span className="day">Écris le premier message</span>}
      </div>

      {replyTo && (
        <div className="note" style={{ margin: '0 14px 8px', alignItems: 'center' }}>
          <Icon name="send" size={18} />
          <span className="grow">Réponse à {replyTo.from === 'me' ? 'toi' : conv.name} : {replyTo.text.slice(0, 80)}</span>
          <button className="link" type="button" onClick={() => setReplyTo(null)}>Annuler</button>
        </div>
      )}

      <form className="composer" onSubmit={send}>
        <button className="iconbtn" type="button" aria-label="Joindre un fichier" onClick={() => fileRef.current?.click()}><Icon name="clip" size={18} /></button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          hidden
          onChange={async e => {
            const file = e.target.files?.[0]
            if (!file) return
            const supabase = createClient()
            const path = `messages/${Date.now()}-${file.name.replace(/\s/g, '_')}`
            const { error } = await supabase.storage.from('documents').upload(path, file)
            if (!error) {
              const { data } = supabase.storage.from('documents').getPublicUrl(path)
              onSend(`Pièce jointe : [${file.name}](${data.publicUrl})`)
            }
            e.target.value = ''
          }}
        />
        <label className="sr" htmlFor="mtext">Ton message</label>
        <input id="mtext" className="input" autoComplete="off" placeholder="Écris un message" value={input} onChange={e => setInput(e.target.value)} />
        <button className="btn btn-main" type="submit" aria-label="Envoyer" disabled={!input.trim()} style={{ width: 46, height: 46, padding: 0 }}><Icon name="send" size={20} /></button>
      </form>

      {conv.otherUserId && me && (
        <ActionsModalV2
          open={actions.open}
          currentUserId={me}
          otherUserId={conv.otherUserId}
          otherName={conv.name}
          initialView={actions.view}
          onClose={() => setActions({ open: false })}
          onSendRich={onSendRich}
        />
      )}
    </section>
  )
}

function dayLabel(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Aujourd’hui'
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
