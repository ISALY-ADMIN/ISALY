'use client'

import { useState, useRef, useEffect } from 'react'
import CertificationBadge, { CertLevel } from '@/components/ui/CertificationBadge'

interface Msg {
  from: 'me' | 'them'
  text: string
  time: string
}

interface Conv {
  id: string
  name: string
  initials: string
  color: string
  msgs: Msg[]
  certLevel?: CertLevel
}

interface ChatAreaProps {
  conv: Conv | null
  onSend: (text: string) => void
  defaultMessage?: string
}

export default function ChatArea({ conv, onSend, defaultMessage }: ChatAreaProps) {
  const [input, setInput]       = useState('')
  const [typing, setTyping]     = useState(false)
  const msgsRef                 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (defaultMessage) setInput(defaultMessage)
  }, [defaultMessage])

  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight
    }
  }, [conv?.msgs, typing])

  function send() {
    if (!input.trim() || !conv) return
    onSend(input.trim())
    setInput('')
    // simulate typing indicator from "them"
    setTyping(true)
    setTimeout(() => setTyping(false), 2200)
  }

  const firstName = conv?.name.split(' ')[0] ?? ''

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: '#F7F8FA' }}>

      {/* Header */}
      <div
        className="border-b flex items-center gap-3 px-5 py-3 flex-shrink-0"
        style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 1px 0 #F3F4F6' }}
      >
        {conv ? (
          <>
            <div className="relative flex-shrink-0">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-[13px] text-white"
                style={{ background: conv.color }}
              >
                {conv.initials}
              </div>
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                style={{ background: '#4ECBA0', borderColor: '#FFFFFF' }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[14px]" style={{ color: '#111827' }}>{conv.name}</span>
                {conv.certLevel ? <CertificationBadge level={conv.certLevel} size="sm" /> : null}
              </div>
              <div className="text-[11.5px] font-semibold" style={{ color: '#4ECBA0' }}>En ligne</div>
            </div>
            <div className="ml-auto flex gap-2">
              <IconAction title="Voir le profil">👤</IconAction>
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

        {conv?.msgs.map((m, i) => {
          const isMe        = m.from === 'me'
          const prev        = conv.msgs[i - 1]
          const next        = conv.msgs[i + 1]
          const isFirst     = !prev || prev.from !== m.from
          const isLast      = !next || next.from !== m.from
          const showAvatar  = !isMe && isLast

          return (
            <div
              key={i}
              className={`flex items-end gap-2 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              style={{ marginBottom: isLast ? '8px' : '2px' }}
            >
              {/* Avatar placeholder — only for "them" side */}
              <div className="w-8 flex-shrink-0">
                {showAvatar && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[11px] text-white"
                    style={{ background: conv.color }}
                  >
                    {conv.initials}
                  </div>
                )}
              </div>

              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`} style={{ maxWidth: '66%' }}>
                {/* Bubble */}
                <div className="relative">
                  <div
                    className="px-3.5 py-2.5 text-[13.5px] leading-relaxed"
                    style={{
                      borderRadius: '18px',
                      borderTopLeftRadius:     !isMe && !isFirst ? '6px' : '18px',
                      borderTopRightRadius:    isMe  && !isFirst ? '6px' : '18px',
                      borderBottomLeftRadius:  !isMe && !isLast  ? '6px' : isLast && !isMe ? '4px' : '18px',
                      borderBottomRightRadius: isMe  && !isLast  ? '6px' : isLast && isMe  ? '4px' : '18px',
                      background: isMe ? 'linear-gradient(135deg, #4ECBA0, #2AA87C)' : '#FFFFFF',
                      color: isMe ? '#FFFFFF' : '#111827',
                      boxShadow: isMe
                        ? '0 2px 12px rgba(78,203,160,.3)'
                        : '0 1px 4px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.04)',
                    }}
                  >
                    {m.text}
                  </div>

                  {/* Tail — last bubble in a run */}
                  {isLast && (
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

                {/* Timestamp — appears on hover */}
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

        {/* Typing indicator */}
        {typing && conv && (
          <div className="flex items-end gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[11px] text-white flex-shrink-0"
              style={{ background: conv.color }}
            >
              {conv.initials}
            </div>
            <div
              className="px-4 py-3 rounded-[18px] rounded-bl-[4px] flex items-center gap-1"
              style={{
                background: '#FFFFFF',
                boxShadow: '0 1px 4px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.04)',
              }}
            >
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className="border-t px-4 py-3 flex gap-2.5 items-center flex-shrink-0"
        style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
      >
        <button
          className="w-9 h-9 rounded-full border-none cursor-pointer text-lg flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ background: '#F3F4F6', color: '#6B7280' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#E5E7EB')}
          onMouseLeave={e => (e.currentTarget.style.background = '#F3F4F6')}
          title="Pièce jointe"
        >
          📎
        </button>

        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={conv ? `Message à ${firstName}…` : 'Sélectionne une conversation…'}
          disabled={!conv}
          className="flex-1 px-4 py-2.5 rounded-full text-[13.5px] border-[1.5px] outline-none transition-colors"
          style={{
            background: '#F9FAFB',
            borderColor: '#E5E7EB',
            color: '#111827',
          }}
          onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
          onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
        />

        <button
          className="w-9 h-9 rounded-full border-none cursor-pointer text-base flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ background: '#F3F4F6', color: '#6B7280' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#E5E7EB')}
          onMouseLeave={e => (e.currentTarget.style.background = '#F3F4F6')}
          title="Emoji"
        >
          😊
        </button>

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
    </div>
  )
}

function IconAction({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <button
      title={title}
      className="w-9 h-9 rounded-[10px] border-none cursor-pointer text-sm flex items-center justify-center transition-colors"
      style={{ background: '#F3F4F6' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#E5E7EB')}
      onMouseLeave={e => (e.currentTarget.style.background = '#F3F4F6')}
    >
      {children}
    </button>
  )
}
