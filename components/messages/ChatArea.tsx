'use client'

import { useState, useRef, useEffect } from 'react'
import CertificationBadge, { CertLevel } from '@/components/ui/CertificationBadge'
import { createClient } from '@/lib/supabase/client'
import { useUserPresence, formatLastSeen } from '@/hooks/usePresence'
import ColocRequestModal from '@/components/messages/ColocRequestModal'

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
  msgs: Msg[]
  certLevel?: CertLevel
  avatarUrl?: string | null
  otherUserId?: string | null
}

interface ChatAreaProps {
  conv: Conv | null
  onSend: (text: string, replyTo?: { text: string; from: 'me' | 'them' }) => void
  defaultMessage?: string
  conversationId?: string | null
  currentUserId?: string | null
  otherUserId?: string | null
  onViewProfile?: (userId: string) => void
}

const REACTION_EMOJIS = ['❤️', '😂', '👍', '🔥', '😮', '😢']

export default function ChatArea({ conv, onSend, defaultMessage, conversationId, currentUserId, otherUserId, onViewProfile }: ChatAreaProps) {
  const [input, setInput] = useState('')
  const [realtimeMessages, setRealtimeMessages] = useState<Msg[]>([])
  const msgsRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [reactions, setReactions] = useState<Record<number, string[]>>({})
  const [showReactionPicker, setShowReactionPicker] = useState<number | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [replyTo, setReplyTo] = useState<Msg | null>(null)
  const [showActionsFor, setShowActionsFor] = useState<number | null>(null)
  const [showColocModal, setShowColocModal] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)

  const { isOnline, lastSeen, avgResponseTime } = useUserPresence(otherUserId ?? null)

  useEffect(() => {
    if (defaultMessage) setInput(defaultMessage)
  }, [defaultMessage])

  useEffect(() => {
    function handleClick() { setShowActionsFor(null); setShowReactionPicker(null) }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  useEffect(() => {
    setRealtimeMessages([])
    if (!conversationId || conversationId.startsWith('owner_')) return

    const supabase = createClient()

    async function loadMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error || !data) return

      setRealtimeMessages(data.map(m => ({
        from: m.sender_id === currentUserId ? 'me' : 'them',
        text: m.content ?? '',
        time: new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        created_at: m.created_at,
      })))

      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUserId)

      window.dispatchEvent(new CustomEvent('messages-read'))
    }

    loadMessages()

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as { id: string; content: string; sender_id: string; created_at: string }
          setRealtimeMessages(prev => [...prev, {
            from: m.sender_id === currentUserId ? 'me' : 'them',
            text: m.content ?? '',
            time: new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            created_at: m.created_at,
          }])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, currentUserId])

  const isVirtual = conv?.id.startsWith('owner_') ?? false
  const displayMsgs = isVirtual ? (conv?.msgs ?? []) : realtimeMessages

  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight
    }
  }, [displayMsgs])

  function send() {
    if (!input.trim() || !conv) return
    onSend(input.trim(), replyTo ?? undefined)
    setInput('')
    setReplyTo(null)
  }

  const firstName = conv?.name.split(' ')[0] ?? ''

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: 'transparent' }}>

      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}
      >
        {conv ? (
          <>
            <div className="relative flex-shrink-0">
              {conv.avatarUrl ? (
                <img src={conv.avatarUrl} alt={conv.initials} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-[13px] text-white"
                  style={{ background: conv.color }}
                >
                  {conv.initials}
                </div>
              )}
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                style={{ background: isOnline ? '#4ECBA0' : '#9CA3AF', borderColor: '#FFFFFF' }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[14px]" style={{ color: '#111827' }}>{conv.name}</span>
                {conv.certLevel ? <CertificationBadge level={conv.certLevel} size="sm" /> : null}
              </div>
              <div className="text-[11.5px] font-semibold" style={{ color: isOnline ? '#4ECBA0' : '#9CA3AF' }}>
                {formatLastSeen(lastSeen)}
              </div>
              {avgResponseTime !== null && (
                <div style={{ fontSize: '10.5px', color: '#9CA3AF', marginTop: '1px' }}>
                  ⚡ Répond en ~{avgResponseTime < 60 ? `${avgResponseTime} min` : `${Math.round(avgResponseTime / 60)}h`} en moyenne
                </div>
              )}
            </div>
            <div className="ml-auto flex gap-2 items-center">
              {conv && !conv.id.startsWith('owner_') && (
                <button
                  onClick={() => setShowColocModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                  }}
                >
                  🏠 Demander une coloc
                </button>
              )}
              <IconAction title="Voir le profil" onClick={() => { if (conv.otherUserId) onViewProfile?.(conv.otherUserId) }}>👤</IconAction>
              <IconAction title="Appel vidéo">📹</IconAction>
              <IconAction title="Plus d'options">⋯</IconAction>
            </div>
          </>
        ) : (
          <>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-[13px] flex-shrink-0"
              style={{ background: '#F3F4F6', color: '#9CA3AF' }}
            >
              💬
            </div>
            <div>
              <div className="font-bold text-[14px]" style={{ color: '#111827' }}>Tes messages</div>
              <div className="text-[11.5px]" style={{ color: '#9CA3AF' }}>Sélectionne une conversation</div>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div ref={msgsRef} className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-1">
        {!conv && (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-20">
            <div className="text-[60px] mb-5" style={{ animation: 'bop 1.8s ease infinite' }}>💬</div>
            <h3
              className="text-[20px] mb-2"
              style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}
            >
              Tes conversations ici
            </h3>
            <p className="text-[13.5px] mb-6" style={{ color: '#9CA3AF', maxWidth: '260px', lineHeight: 1.6 }}>
              Sélectionne une conversation à gauche ou commence à swiper pour trouver ton coloc !
            </p>
            <a
              href="/app/swipe"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold text-white no-underline transition-all"
              style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)', boxShadow: '0 4px 16px rgba(78,203,160,.35)' }}
            >
              🔥 Aller swiper
            </a>
          </div>
        )}

        {displayMsgs.map((m, i) => {
          const isMe    = m.from === 'me'
          const prev    = displayMsgs[i - 1]
          const next    = displayMsgs[i + 1]
          const isFirst = !prev || prev.from !== m.from
          const isLast  = !next || next.from !== m.from
          const showAvatar = !isMe && isLast

          return (
            <div
              key={i}
              className={`flex items-end gap-2 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              style={{ marginBottom: isLast ? '8px' : '2px' }}
              onContextMenu={(e) => { e.preventDefault(); setShowActionsFor(i); setShowReactionPicker(null) }}
            >
              {/* Avatar slot */}
              <div className="w-8 flex-shrink-0">
                {showAvatar && conv && (
                  conv.avatarUrl ? (
                    <img src={conv.avatarUrl} alt={conv.initials} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[11px] text-white"
                      style={{ background: conv.color }}
                    >
                      {conv.initials}
                    </div>
                  )
                )}
              </div>

              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`} style={{ maxWidth: '66%' }}>
                <div className="relative">

                  {/* Context menu (right-click) */}
                  <div
                    style={{
                      position: 'absolute',
                      right: isMe ? '0' : undefined,
                      left: isMe ? undefined : '0',
                      top: '-8px',
                      background: '#fff',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      padding: '4px',
                      zIndex: 20,
                      minWidth: '160px',
                      display: showActionsFor === i ? 'block' : 'none',
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => { setReplyTo(m); setShowActionsFor(null) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#374151', borderRadius: '8px' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      ↩️ Répondre
                    </button>
                    {isMe && (() => {
                      const msgTime = m.created_at ? new Date(m.created_at).getTime() : 0
                      const canEdit = Date.now() - msgTime < 30 * 60 * 1000
                      return canEdit ? (
                        <button
                          onClick={() => { setEditingIndex(i); setEditText(m.text); setShowActionsFor(null) }}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#374151', borderRadius: '8px' }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          ✏️ Modifier
                        </button>
                      ) : null
                    })()}
                    <button
                      onClick={() => { setRealtimeMessages(prev => prev.filter((_, idx) => idx !== i)); setShowActionsFor(null) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#EF4444', borderRadius: '8px' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      🗑 Supprimer pour moi
                    </button>
                  </div>

                  {/* Reaction picker trigger (hover) */}
                  <div
                    className="absolute opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      left:  isMe ? '-32px' : undefined,
                      right: isMe ? undefined : '-32px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowReactionPicker(showReactionPicker === i ? null : i); setShowActionsFor(null) }}
                      style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '50%', width: '26px', height: '26px', fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      😊
                    </button>
                    {showReactionPicker === i && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '30px',
                          left: isMe ? '0' : undefined,
                          right: isMe ? undefined : '0',
                          background: '#fff',
                          borderRadius: '20px',
                          padding: '6px 8px',
                          display: 'flex',
                          gap: '4px',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                          zIndex: 10,
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        {REACTION_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => {
                              setReactions(prev => ({
                                ...prev,
                                [i]: [...(prev[i] ?? []).filter(r => r !== emoji), emoji],
                              }))
                              setShowReactionPicker(null)
                            }}
                            style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', padding: '2px', borderRadius: '6px', transition: 'transform 0.1s' }}
                            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.3)')}
                            onMouseLeave={e => (e.currentTarget.style.transform = '')}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bubble (edit mode or normal) */}
                  {editingIndex === i ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            setRealtimeMessages(prev => prev.map((msg, idx) => idx === i ? { ...msg, text: editText } : msg))
                            setEditingIndex(null)
                          }
                          if (e.key === 'Escape') setEditingIndex(null)
                        }}
                        autoFocus
                        style={{ padding: '8px 12px', borderRadius: '12px', border: '1.5px solid #4ECBA0', fontSize: '13.5px', outline: 'none', minWidth: '160px' }}
                      />
                      <button
                        onClick={() => { setRealtimeMessages(prev => prev.map((msg, idx) => idx === i ? { ...msg, text: editText } : msg)); setEditingIndex(null) }}
                        style={{ background: '#4ECBA0', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <div
                      className="px-3.5 py-2.5 text-[13.5px] leading-relaxed"
                      style={{
                        borderRadius: '18px',
                        borderTopLeftRadius:     !isMe && !isFirst ? '6px' : '18px',
                        borderTopRightRadius:    isMe  && !isFirst ? '6px' : '18px',
                        borderBottomLeftRadius:  !isMe && !isLast  ? '6px' : isLast && !isMe ? '4px' : '18px',
                        borderBottomRightRadius: isMe  && !isLast  ? '6px' : isLast && isMe  ? '4px' : '18px',
                        background: isMe ? 'linear-gradient(135deg, #4ECBA0, #2AA87C)' : 'rgba(255,255,255,0.08)',
                        color: isMe ? '#FFFFFF' : '#ffffff',
                        boxShadow: isMe ? '0 2px 12px rgba(78,203,160,.3)' : 'none',
                      }}
                    >
                      {m.replyTo && (
                        <div style={{
                          background: isMe ? 'rgba(255,255,255,0.2)' : '#F0F4F0',
                          borderLeft: `3px solid ${isMe ? 'rgba(255,255,255,0.6)' : '#4ECBA0'}`,
                          borderRadius: '6px',
                          padding: '4px 8px',
                          marginBottom: '6px',
                          fontSize: '12px',
                          opacity: 0.9,
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: '2px', fontSize: '11px' }}>
                            {m.replyTo.from === 'me' ? 'Toi' : conv?.name.split(' ')[0]}
                          </div>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                            {m.replyTo.text}
                          </div>
                        </div>
                      )}
                      {m.text}
                    </div>
                  )}

                  {isLast && editingIndex !== i && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        ...(isMe
                          ? { right: '-6px', borderWidth: '6px 0 0 8px', borderColor: 'transparent transparent transparent #2AA87C' }
                          : { left: '-6px', borderWidth: '6px 8px 0 0', borderColor: 'transparent #FFFFFF transparent transparent' }),
                        width: 0,
                        height: 0,
                        borderStyle: 'solid',
                      }}
                    />
                  )}
                </div>

                {/* Reactions display */}
                {reactions[i] && reactions[i].length > 0 && (
                  <div style={{ display: 'flex', gap: '2px', marginTop: '2px', flexWrap: 'wrap' }}>
                    {Object.entries(
                      reactions[i].reduce((acc, r) => ({ ...acc, [r]: (acc[r] || 0) + 1 }), {} as Record<string, number>)
                    ).map(([emoji, count]) => (
                      <span key={emoji} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1px 6px', fontSize: '12px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                        {emoji}{count > 1 ? ` ${count}` : ''}
                      </span>
                    ))}
                  </div>
                )}

                <div
                  className="text-[10.5px] mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ color: '#9CA3AF', textAlign: isMe ? 'right' : 'left' }}
                >
                  {m.time}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div style={{ background: '#F0F4F0', borderLeft: '3px solid #10B981', padding: '8px 12px', margin: '0 16px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, marginBottom: '2px' }}>
              Réponse à {replyTo.from === 'me' ? 'toi-même' : conv?.name.split(' ')[0]}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
              {replyTo.text}
            </div>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Input */}
      <div
        className="px-4 py-3 flex gap-2.5 items-center flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.03)', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}
      >
        <>
          <button onClick={() => fileRef.current?.click()} className="w-9 h-9 rounded-full border-none cursor-pointer text-lg flex items-center justify-center flex-shrink-0" style={{ background: '#F3F4F6', color: '#6B7280' }} title="Pièce jointe">📎</button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file || !conv) return
              const { createClient } = await import('@/lib/supabase/client')
              const supabase = createClient()
              const path = `messages/${Date.now()}-${file.name.replace(/\s/g, '_')}`
              const { error } = await supabase.storage.from('documents').upload(path, file)
              if (!error) {
                const { data } = supabase.storage.from('documents').getPublicUrl(path)
                onSend(`📎 [${file.name}](${data.publicUrl})`)
              }
            }}
          />
        </>

        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={conv ? `Message à ${firstName}…` : 'Sélectionne une conversation…'}
          disabled={!conv}
          className="flex-1 px-4 py-2.5 rounded-full text-[13.5px] border-[1.5px] outline-none transition-colors"
          style={{
            background: 'rgba(255,255,255,0.06)',
            borderColor: 'rgba(255,255,255,0.1)',
            color: '#ffffff',
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.5)')}
          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />

        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowEmojis(!showEmojis)} className="w-9 h-9 rounded-full border-none cursor-pointer text-base flex items-center justify-center flex-shrink-0" style={{ background: '#F3F4F6', color: '#6B7280' }}>😊</button>
          {showEmojis && (
            <div style={{ position: 'absolute', bottom: '44px', right: 0, background: '#fff', borderRadius: '12px', padding: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', zIndex: 20, width: '200px' }}>
              {['😊','😂','❤️','👍','🔥','😍','🙏','😅','👏','🥰','😎','🤔','😢','😮','🎉','✨','💪','🏠','🤝','✅'].map(em => (
                <button key={em} onClick={() => { setInput(prev => prev + em); setShowEmojis(false) }} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '4px', borderRadius: '6px' }} onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>{em}</button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={send}
          disabled={!input.trim() || !conv}
          className="w-10 h-10 rounded-full border-none cursor-pointer text-white text-base flex-shrink-0 flex items-center justify-center transition-all"
          style={{
            background: input.trim() && conv
              ? 'linear-gradient(135deg, #4ECBA0, #2AA87C)'
              : '#E5E7EB',
            boxShadow: input.trim() && conv ? '0 4px 16px rgba(78,203,160,.35)' : 'none',
            color: input.trim() && conv ? '#FFFFFF' : '#9CA3AF',
          }}
        >
          ➤
        </button>
      </div>

      {showColocModal && conv && otherUserId && currentUserId && (
        <ColocRequestModal
          onClose={() => setShowColocModal(false)}
          otherUserId={otherUserId}
          otherName={conv.name.split(' ')[0]}
          currentUserId={currentUserId}
          conversationId={conv.id}
        />
      )}
    </div>
  )
}

function IconAction({ children, title, onClick }: { children: React.ReactNode; title?: string; onClick?: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="w-9 h-9 rounded-[10px] border-none cursor-pointer text-sm flex items-center justify-center transition-colors"
      style={{ background: '#F3F4F6' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#E5E7EB')}
      onMouseLeave={e => (e.currentTarget.style.background = '#F3F4F6')}
    >
      {children}
    </button>
  )
}
