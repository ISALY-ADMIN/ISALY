'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Paperclip, ArrowUp, MoreHorizontal, ChevronLeft, ChevronRight, Reply, Pencil, Trash2, SmilePlus, CalendarClock, KeyRound, Home, FileText } from 'lucide-react'
import { CertLevel } from '@/components/ui/CertificationBadge'
import { createClient } from '@/lib/supabase/client'
import { useUserPresence, formatLastSeen } from '@/hooks/usePresence'
import ActionsPanel, { RichType } from '@/components/messages/ActionsPanel'
import RichMessage from '@/components/messages/RichMessage'
import Emoji, { EmojiText } from '@/components/ui/Emoji'

interface Msg {
  id?: string
  from: 'me' | 'them'
  text: string
  time: string
  created_at?: string
  type?: string
  payload?: Record<string, unknown> | null
  replyTo?: { text: string; from: 'me' | 'them' }
}

interface Conv {
  id: string
  name: string
  initials: string
  color: string
  msgs: Msg[]
  certLevel?: CertLevel
  avatarUrl?: string | null
  otherUserId?: string | null
}

interface ListingCtx { id: string; title: string | null; city: string | null; rent: number | null; photo: string | null }

interface ChatAreaProps {
  conv: Conv | null
  onSend: (text: string, replyTo?: { text: string; from: 'me' | 'them' }) => void
  onSendRich?: (type: RichType, payload: Record<string, unknown>, content: string) => void
  defaultMessage?: string
  conversationId?: string | null
  currentUserId?: string | null
  otherUserId?: string | null
  listingId?: string | null
  onViewProfile?: (userId: string) => void
  onBack?: () => void
}

interface Reaction { emoji: string; userId: string }

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']
const RICH_TYPES = ['visite', 'reservation', 'annonce', 'document']

const HEADER_ACTIONS: { key: RichType; label: string; icon: typeof Home }[] = [
  { key: 'visite', label: 'Proposer une visite', icon: CalendarClock },
  { key: 'reservation', label: 'Demander à réserver', icon: KeyRound },
  { key: 'annonce', label: 'Partager une annonce', icon: Home },
  { key: 'document', label: 'Envoyer un document', icon: FileText },
]

// ── Séparateur temporel façon iMessage ──────────────────────────
const GROUP_GAP_MS = 20 * 60 * 1000

function timeSeparatorLabel(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return time
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `Hier ${time}`
  const diffDays = (now.getTime() - d.getTime()) / 86400000
  if (diffDays < 7) return `${d.toLocaleDateString('fr-FR', { weekday: 'long' })} ${time}`
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à ${time}`
}

export default function ChatArea({ conv, onSend, onSendRich, defaultMessage, conversationId, currentUserId, otherUserId, listingId, onViewProfile, onBack }: ChatAreaProps) {
  const [input, setInput] = useState('')
  const [realtimeMessages, setRealtimeMessages] = useState<Msg[]>([])
  const msgsRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({})
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [replyTo, setReplyTo] = useState<Msg | null>(null)
  const [showActionsFor, setShowActionsFor] = useState<number | null>(null)
  const [showActionsPanel, setShowActionsPanel] = useState(false)
  const [actionsView, setActionsView] = useState<RichType | undefined>(undefined)
  const [sendPressed, setSendPressed] = useState(false)
  const [listing, setListing] = useState<ListingCtx | null>(null)

  const { isOnline, lastSeen } = useUserPresence(otherUserId ?? null)

  useEffect(() => {
    if (defaultMessage) setInput(defaultMessage)
  }, [defaultMessage])

  useEffect(() => {
    function handleClick() { setShowActionsFor(null); setShowReactionPicker(null) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // ── Contexte annonce (bandeau façon Leboncoin) ───────────────────────────
  useEffect(() => {
    setListing(null)
    if (!listingId) return
    const supabase = createClient()
    ;(async () => {
      const { data } = await supabase
        .from('listings')
        .select('id, title, city, rent, photos')
        .eq('id', listingId)
        .single()
      if (data) setListing({ id: data.id, title: data.title, city: data.city, rent: data.rent, photo: data.photos?.[0] ?? null })
    })()
  }, [listingId])

  // ── Chargement messages + Realtime (INSERT + UPDATE) ────────────────────
  useEffect(() => {
    setRealtimeMessages([])
    setReactions({})
    if (!conversationId || conversationId.startsWith('owner_')) return

    const supabase = createClient()

    async function loadMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at, type, payload')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (error || !data) return

      setRealtimeMessages(data.map(m => ({
        id: m.id,
        from: m.sender_id === currentUserId ? 'me' : 'them',
        text: m.content ?? '',
        time: new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        created_at: m.created_at,
        type: m.type ?? 'text',
        payload: m.payload ?? null,
      })))

      // Réactions
      const ids = data.map(m => m.id)
      if (ids.length) {
        const { data: reacts } = await supabase
          .from('message_reactions')
          .select('message_id, user_id, emoji')
          .in('message_id', ids)
        if (reacts) {
          const map: Record<string, Reaction[]> = {}
          reacts.forEach(r => {
            ;(map[r.message_id] ??= []).push({ emoji: r.emoji, userId: r.user_id })
          })
          setReactions(map)
        }
      }

      await supabase.from('messages').update({ read: true }).eq('conversation_id', conversationId).neq('sender_id', currentUserId)
      window.dispatchEvent(new CustomEvent('messages-read'))
    }

    loadMessages()

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const m = payload.new as { id: string; content: string; sender_id: string; created_at: string; type?: string; payload?: Record<string, unknown> | null }
        setRealtimeMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, {
          id: m.id,
          from: m.sender_id === currentUserId ? 'me' : 'them',
          text: m.content ?? '',
          time: new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          created_at: m.created_at,
          type: m.type ?? 'text',
          payload: m.payload ?? null,
        }])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const m = payload.new as { id: string; content: string; type?: string; payload?: Record<string, unknown> | null }
        setRealtimeMessages(prev => prev.map(x => x.id === m.id ? { ...x, text: m.content ?? x.text, type: m.type ?? x.type, payload: m.payload ?? x.payload } : x))
      })
      .subscribe()

    // Réactions realtime (non filtrable par conversation → on filtre côté client)
    const reactChannel = supabase
      .channel(`reactions:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions' }, (payload) => {
        const r = payload.new as { message_id: string; user_id: string; emoji: string }
        setReactions(prev => {
          const list = prev[r.message_id]
          if (list === undefined) return prev // pas un message de cette conv
          if (list.some(x => x.userId === r.user_id && x.emoji === r.emoji)) return prev
          return { ...prev, [r.message_id]: [...list, { emoji: r.emoji, userId: r.user_id }] }
        })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_reactions' }, (payload) => {
        const r = payload.old as { message_id: string; user_id: string; emoji: string }
        setReactions(prev => {
          const list = prev[r.message_id]
          if (!list) return prev
          return { ...prev, [r.message_id]: list.filter(x => !(x.userId === r.user_id && x.emoji === r.emoji)) }
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel); supabase.removeChannel(reactChannel) }
  }, [conversationId, currentUserId])

  const isVirtual = conv?.id.startsWith('owner_') ?? false
  const displayMsgs = isVirtual ? (conv?.msgs ?? []) : realtimeMessages

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [displayMsgs])

  function autoResize() {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  function send() {
    if (!input.trim() || !conv) return
    onSend(input.trim(), replyTo ?? undefined)
    setInput('')
    setReplyTo(null)
    requestAnimationFrame(() => { if (taRef.current) taRef.current.style.height = 'auto' })
  }

  function openAction(view?: RichType) {
    setActionsView(view)
    setShowActionsPanel(true)
  }

  // ── Réactions ───────────────────────────────────────────────────────────
  async function toggleReaction(messageId: string | undefined, emoji: string) {
    setShowReactionPicker(null)
    if (!messageId || !currentUserId) return
    const supabase = createClient()
    const mine = reactions[messageId]?.some(r => r.userId === currentUserId && r.emoji === emoji)
    const prevSnapshot = reactions[messageId] ?? []
    if (mine) {
      setReactions(prev => ({ ...prev, [messageId]: (prev[messageId] ?? []).filter(r => !(r.userId === currentUserId && r.emoji === emoji)) }))
      const { error } = await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', currentUserId).eq('emoji', emoji)
      if (error) {
        console.error('[reactions] delete failed', error)
        setReactions(prev => ({ ...prev, [messageId]: prevSnapshot }))
      }
    } else {
      setReactions(prev => ({ ...prev, [messageId]: [...(prev[messageId] ?? []), { emoji, userId: currentUserId }] }))
      const { error } = await supabase.from('message_reactions').insert({ message_id: messageId, user_id: currentUserId, emoji })
      if (error) {
        console.error('[reactions] insert failed', error)
        setReactions(prev => ({ ...prev, [messageId]: prevSnapshot }))
      }
    }
  }

  // ── Réponse à visite/réservation (accept/refuse) ─────────────────────────
  async function respondRich(messageId: string | undefined, current: Record<string, unknown> | null | undefined, status: 'accepted' | 'refused') {
    if (!messageId) return
    const supabase = createClient()
    const newPayload = { ...(current ?? {}), status }
    setRealtimeMessages(prev => prev.map(m => m.id === messageId ? { ...m, payload: newPayload } : m))
    await supabase.from('messages').update({ payload: newPayload }).eq('id', messageId)
  }

  const firstName = conv?.name.split(' ')[0] ?? ''
  const statusLabel = isOnline ? 'En ligne' : formatLastSeen(lastSeen)

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative" style={{ background: 'transparent' }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 md:px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
        {conv ? (
          <>
            {onBack && (
              <button onClick={onBack} className="md:hidden flex items-center justify-center rounded-full flex-shrink-0 border-none cursor-pointer" style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.06)' }}>
                <ChevronLeft size={20} color="#fff" />
              </button>
            )}

            {/* Avatar + prénom + statut → profil public */}
            <button
              onClick={() => { if (conv.otherUserId) onViewProfile?.(conv.otherUserId) }}
              className="flex items-center gap-3 min-w-0 border-none bg-transparent cursor-pointer text-left p-1 rounded-[12px] transition-colors"
              title="Voir le profil"
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="relative flex-shrink-0">
                {conv.avatarUrl ? (
                  <Image src={conv.avatarUrl} alt={conv.initials} width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-[13px] text-white" style={{ background: conv.color }}>{conv.initials}</div>
                )}
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2" style={{ background: '#10B981', borderColor: '#0A0A0A' }} />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[14.5px] truncate" style={{ color: '#fff' }}>{conv.name}</div>
                {statusLabel && (
                  <div className="text-[11.5px] font-medium flex items-center gap-1.5" style={{ color: isOnline ? '#10B981' : 'rgba(255,255,255,0.38)' }}>
                    {isOnline && <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#10B981' }} />}
                    {statusLabel}
                  </div>
                )}
              </div>
            </button>

            {/* Actions : icônes fines (desktop) / bottom sheet via ⋯ (mobile) */}
            <div className="ml-auto flex items-center gap-0.5">
              <div className="hidden md:flex items-center gap-0.5">
                {HEADER_ACTIONS.map(a => {
                  const Icon = a.icon
                  return (
                    <HeaderBtn key={a.key} title={a.label} disabled={isVirtual} onClick={() => openAction(a.key)}>
                      <Icon size={20} strokeWidth={1.8} />
                    </HeaderBtn>
                  )
                })}
              </div>
              <div className="md:hidden">
                <HeaderBtn title="Actions" disabled={isVirtual} onClick={() => openAction(undefined)}>
                  <MoreHorizontal size={20} strokeWidth={1.8} />
                </HeaderBtn>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}><Emoji native="💬" /></div>
            <div>
              <div className="font-bold text-[14px]" style={{ color: '#fff' }}>Tes messages</div>
              <div className="text-[11.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Sélectionne une conversation</div>
            </div>
          </>
        )}
      </div>

      {/* ── Bandeau contexte annonce ── */}
      {conv && listing && (
        <a
          href={`/app/annonce/${listing.id}`}
          className="flex items-center gap-3 mx-3 md:mx-4 mt-2.5 px-3 py-2 rounded-[14px] no-underline transition-colors flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
        >
          <div className="w-9 h-9 rounded-[8px] flex-shrink-0" style={{ background: listing.photo ? `url(${listing.photo}) center/cover` : 'rgba(255,255,255,0.08)' }} />
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-bold truncate" style={{ color: '#fff' }}>{listing.title ?? 'Annonce'}</div>
            <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {listing.city ? `${listing.city} · ` : ''}{listing.rent ? `${listing.rent} €/mois` : ''}
            </div>
          </div>
          <ChevronRight size={16} color="rgba(255,255,255,0.35)" className="flex-shrink-0" />
        </a>
      )}

      {/* ── Messages ── */}
      <div ref={msgsRef} className="flex-1 overflow-y-auto px-4 md:px-5 py-4 flex flex-col">
        {!conv && <EmptyChat />}

        {displayMsgs.map((m, i) => {
          const isMe = m.from === 'me'
          const prev = displayMsgs[i - 1]
          const next = displayMsgs[i + 1]

          // Séparateur temporel : premier message ou gap > 20 min
          const gapPrev = m.created_at && prev?.created_at
            ? new Date(m.created_at).getTime() - new Date(prev.created_at).getTime()
            : 0
          const showSeparator = !!m.created_at && (!prev || !prev.created_at || gapPrev > GROUP_GAP_MS)

          // Groupage : nouveau groupe si expéditeur différent ou séparateur
          const gapNext = next?.created_at && m.created_at
            ? new Date(next.created_at).getTime() - new Date(m.created_at).getTime()
            : 0
          const isFirst = showSeparator || !prev || prev.from !== m.from
          const isLast = !next || next.from !== m.from || gapNext > GROUP_GAP_MS
          const showAvatar = !isMe && isLast
          const isRich = !!m.type && RICH_TYPES.includes(m.type)
          const msgReactions = m.id ? reactions[m.id] ?? [] : []

          return (
            <div key={m.id ?? i}>
              {showSeparator && (
                <div className="text-center py-3 text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {timeSeparatorLabel(m.created_at!)}
                </div>
              )}
              <div
                className={`flex items-end gap-2 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                style={{ marginBottom: isLast ? '10px' : '2px' }}
                onContextMenu={(e) => { e.preventDefault(); setShowActionsFor(i); setShowReactionPicker(m.id ?? null) }}
              >
                {/* Avatar slot */}
                <div className="w-8 flex-shrink-0">
                  {showAvatar && conv && (
                    conv.avatarUrl ? (
                      <Image src={conv.avatarUrl} alt={conv.initials} width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[11px] text-white" style={{ background: conv.color }}>{conv.initials}</div>
                    )
                  )}
                </div>

                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`} style={{ maxWidth: '78%' }}>
                  <div className="relative">

                    {/* Context menu (clic droit) */}
                    <div
                      style={{ position: 'absolute', right: isMe ? 0 : undefined, left: isMe ? undefined : 0, top: -8, background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.5)', padding: 4, zIndex: 20, minWidth: 170, display: showActionsFor === i ? 'block' : 'none' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <CtxBtn onClick={() => { setReplyTo(m); setShowActionsFor(null) }} icon={<Reply size={15} />}>Répondre</CtxBtn>
                      {isMe && !isRich && (() => {
                        const msgTime = m.created_at ? new Date(m.created_at).getTime() : 0
                        return Date.now() - msgTime < 30 * 60 * 1000 ? (
                          <CtxBtn onClick={() => { setEditingIndex(i); setEditText(m.text); setShowActionsFor(null) }} icon={<Pencil size={15} />}>Modifier</CtxBtn>
                        ) : null
                      })()}
                      <CtxBtn onClick={() => { setRealtimeMessages(p => p.filter((_, idx) => idx !== i)); setShowActionsFor(null) }} icon={<Trash2 size={15} />} danger>Supprimer pour moi</CtxBtn>
                    </div>

                    {/* Déclencheur de réactions (hover) */}
                    <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: isMe ? -34 : undefined, right: isMe ? undefined : -34, top: '50%', transform: 'translateY(-50%)' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowReactionPicker(showReactionPicker === m.id ? null : (m.id ?? null)); setShowActionsFor(null) }}
                        className="flex items-center justify-center rounded-full transition-transform hover:scale-110"
                        style={{ width: 28, height: 28, background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}
                      >
                        <SmilePlus size={15} color="rgba(255,255,255,0.7)" />
                      </button>
                      {showReactionPicker === m.id && m.id && (
                        <div
                          style={{ position: 'absolute', bottom: 34, left: isMe ? 0 : undefined, right: isMe ? undefined : 0, background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 22, padding: '6px 8px', display: 'flex', gap: 2, boxShadow: '0 8px 30px rgba(0,0,0,0.5)', zIndex: 30 }}
                          onClick={e => e.stopPropagation()}
                        >
                          {REACTION_EMOJIS.map(emoji => (
                            <button key={emoji} onClick={() => toggleReaction(m.id, emoji)} className="transition-transform hover:scale-125" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '2px 4px' }}><Emoji native={emoji} size="20px" /></button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bulle : édition / rich / texte */}
                    {editingIndex === i ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { setRealtimeMessages(p => p.map((msg, idx) => idx === i ? { ...msg, text: editText } : msg)); setEditingIndex(null) }
                            if (e.key === 'Escape') setEditingIndex(null)
                          }}
                          autoFocus
                          style={{ padding: '8px 12px', borderRadius: 12, border: '1.5px solid #10B981', fontSize: 13.5, outline: 'none', minWidth: 160, background: '#1c1c1c', color: '#fff' }}
                        />
                        <button onClick={() => { setRealtimeMessages(p => p.map((msg, idx) => idx === i ? { ...msg, text: editText } : msg)); setEditingIndex(null) }} style={{ background: '#10B981', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>✓</button>
                      </div>
                    ) : isRich ? (
                      <RichMessage
                        type={m.type!}
                        payload={m.payload ?? null}
                        isMe={isMe}
                        onRespond={(status) => respondRich(m.id, m.payload, status)}
                        onCounter={() => openAction('visite')}
                        establishLeaseHref={
                          !isMe && m.type === 'reservation' && otherUserId
                            ? `/app/baux/nouveau?tenant=${otherUserId}${(m.payload?.listing_id ?? listingId) ? `&listing=${m.payload?.listing_id ?? listingId}` : ''}`
                            : null
                        }
                      />
                    ) : (
                      <div
                        className="px-3.5 py-2.5 text-[13.5px] leading-relaxed"
                        style={{
                          borderRadius: 18,
                          borderTopLeftRadius: !isMe && !isFirst ? 6 : 18,
                          borderTopRightRadius: isMe && !isFirst ? 6 : 18,
                          borderBottomLeftRadius: !isMe && !isLast ? 6 : 18,
                          borderBottomRightRadius: isMe && !isLast ? 6 : 18,
                          background: isMe ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255,255,255,0.07)',
                          color: '#fff',
                          boxShadow: isMe ? '0 2px 12px rgba(16,185,129,.25)' : 'none',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {m.replyTo && (
                          <div style={{ background: isMe ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)', borderLeft: `3px solid ${isMe ? 'rgba(255,255,255,0.6)' : '#10B981'}`, borderRadius: 6, padding: '4px 8px', marginBottom: 6, fontSize: 12, opacity: 0.9 }}>
                            <div style={{ fontWeight: 600, marginBottom: 2, fontSize: 11 }}>{m.replyTo.from === 'me' ? 'Toi' : firstName}</div>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}><EmojiText text={m.replyTo.text} size="12px" /></div>
                          </div>
                        )}
                        {m.text != null && <EmojiText text={m.text} size="13.5px" />}
                      </div>
                    )}
                  </div>

                  {/* Réactions affichées sous la bulle */}
                  {msgReactions.length > 0 && (
                    <div style={{ display: 'flex', gap: 3, marginTop: -6, marginBottom: 2, flexWrap: 'wrap', zIndex: 5 }}>
                      {Object.entries(msgReactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] ?? 0) + 1; return acc }, {} as Record<string, number>)).map(([emoji, count]) => {
                        const mine = msgReactions.some(r => r.emoji === emoji && r.userId === currentUserId)
                        return (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(m.id, emoji)}
                            style={{ background: mine ? 'rgba(16,185,129,0.2)' : '#1c1c1c', border: `1px solid ${mine ? '#10B981' : 'rgba(255,255,255,0.12)'}`, borderRadius: 12, padding: '1px 7px', fontSize: 12, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 3 }}
                          >
                            <Emoji native={emoji} size="12px" />{count > 1 ? <span style={{ fontSize: 10.5, fontWeight: 700 }}>{count}</span> : ''}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Aperçu réponse */}
      {replyTo && (
        <div style={{ background: 'rgba(16,185,129,0.1)', borderLeft: '3px solid #10B981', padding: '8px 12px', margin: '0 16px 8px', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600, marginBottom: 2 }}>Réponse à {replyTo.from === 'me' ? 'toi-même' : firstName}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{replyTo.text}</div>
          </div>
          <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>✕</button>
        </div>
      )}

      {/* ── Barre de saisie ── */}
      <div className="px-3 md:px-4 py-3 flex gap-2 items-end flex-shrink-0" style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
        <InputBtn title="Pièce jointe" onClick={() => fileRef.current?.click()} disabled={!conv}><Paperclip size={19} strokeWidth={1.8} /></InputBtn>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file || !conv) return
            const supabase = createClient()
            const path = `messages/${Date.now()}-${file.name.replace(/\s/g, '_')}`
            const { error } = await supabase.storage.from('documents').upload(path, file)
            if (!error) {
              const { data } = supabase.storage.from('documents').getPublicUrl(path)
              onSend(`📎 [${file.name}](${data.publicUrl})`)
            }
          }}
        />

        <textarea
          ref={taRef}
          rows={1}
          value={input}
          onChange={e => { setInput(e.target.value); autoResize() }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
          }}
          placeholder={conv ? `Message à ${firstName}…` : 'Sélectionne une conversation…'}
          disabled={!conv}
          className="flex-1 px-4 py-3 rounded-[22px] text-[14px] border-none outline-none resize-none transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', maxHeight: 120, lineHeight: 1.45 }}
        />

        <button
          onClick={send}
          onMouseDown={() => setSendPressed(true)}
          onMouseUp={() => setSendPressed(false)}
          onMouseLeave={() => setSendPressed(false)}
          disabled={!input.trim() || !conv}
          title="Envoyer"
          className="rounded-full border-none flex-shrink-0 flex items-center justify-center transition-all duration-150"
          style={{
            width: 44, height: 44,
            background: input.trim() && conv ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255,255,255,0.08)',
            boxShadow: input.trim() && conv ? '0 4px 18px rgba(16,185,129,.45)' : 'none',
            color: input.trim() && conv ? '#fff' : 'rgba(255,255,255,0.3)',
            cursor: input.trim() && conv ? 'pointer' : 'not-allowed',
            transform: sendPressed && input.trim() ? 'scale(0.95)' : 'scale(1)',
          }}
        >
          <ArrowUp size={20} strokeWidth={2.5} />
        </button>
      </div>

      {showActionsPanel && conv && otherUserId && currentUserId && onSendRich && (
        <ActionsPanel
          key={actionsView ?? 'menu'}
          currentUserId={currentUserId}
          otherUserId={otherUserId}
          otherName={firstName}
          initialView={actionsView}
          onClose={() => setShowActionsPanel(false)}
          onSendRich={onSendRich}
        />
      )}
    </div>
  )
}

// ── Sous-composants boutons épurés ──────────────────────────────────────────
function HeaderBtn({ children, title, onClick, disabled }: { children: React.ReactNode; title?: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      className="flex items-center justify-center rounded-[12px] border-none transition-colors flex-shrink-0"
      style={{ width: 40, height: 40, background: 'transparent', color: disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.65)', cursor: disabled ? 'not-allowed' : 'pointer' }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      {children}
    </button>
  )
}

function InputBtn({ children, title, onClick, disabled }: { children: React.ReactNode; title?: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      className="flex items-center justify-center rounded-full border-none transition-colors flex-shrink-0"
      style={{ width: 44, height: 44, background: 'transparent', color: disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', cursor: disabled ? 'not-allowed' : 'pointer' }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      {children}
    </button>
  )
}

function CtxBtn({ children, onClick, icon, danger }: { children: React.ReactNode; onClick: () => void; icon: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: danger ? '#EF4444' : 'rgba(255,255,255,0.85)', borderRadius: 8 }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
      {icon}{children}
    </button>
  )
}

function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center py-20">
      <div className="text-[60px] mb-5" style={{ animation: 'bop 1.8s ease infinite' }}><Emoji native="💬" /></div>
      <h3 className="text-[20px] mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: '#fff' }}>Tes conversations ici</h3>
      <p className="text-[13.5px] mb-6" style={{ color: 'rgba(255,255,255,0.4)', maxWidth: 260, lineHeight: 1.6 }}>
        Sélectionne une conversation à gauche ou commence à swiper pour trouver ton coloc !
      </p>
      <a href="/app/swipe" className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold text-white no-underline transition-all" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 16px rgba(16,185,129,.35)' }}>
        <Emoji native="🔥" /> Aller swiper
      </a>
    </div>
  )
}
