'use client'

import { useState, useRef, useEffect } from 'react'
import Emoji, { EmojiText } from '@/components/ui/Emoji'

interface Message {
  role: 'bot' | 'user'
  text: string
}

interface ChatbotWidgetProps {
  open: boolean
  onClose: () => void
}

export default function ChatbotWidget({ open, onClose }: ChatbotWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: '👋 Bonjour ! Je suis l\'assistant ISALY. Comment puis-je vous aider ?' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const msgsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (msgsRef.current) {
      msgsRef.current.scrollTop = msgsRef.current.scrollHeight
    }
  }, [messages, loading])

  async function send() {
    if (!input.trim() || loading) return
    const txt = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', text: txt }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: txt }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'bot', text: data.reply ?? 'Je suis là pour vous aider !' }])
    } catch {
      setMessages(m => [...m, { role: 'bot', text: '⚠️ Connexion indisponible. Consultez notre FAQ.' }])
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed bottom-24 right-6 z-50 flex flex-col rounded-[18px] overflow-hidden border"
      style={{
        width: '330px',
        maxHeight: '460px',
        background: '#1A1A1A',
        boxShadow: '0 8px 36px rgba(0,0,0,.5)',
        borderColor: '#2D2D2D',
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex justify-between items-center flex-shrink-0" style={{ background: '#111111' }}>
        <div>
          <div className="font-bold text-[13.5px] text-white">Assistant ISALY</div>
          <div className="text-[11px] mt-px" style={{ color: '#6B7280' }}>IA · répond en quelques secondes</div>
        </div>
        <button
          onClick={onClose}
          className="border-none text-[17px] cursor-pointer leading-none"
          style={{ background: 'none', color: '#9CA3AF' }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div ref={msgsRef} className="flex-1 p-3 overflow-y-auto flex flex-col gap-2" style={{ minHeight: 0 }}>
        {messages.map((m, i) =>
          m.role === 'bot' ? (
            <div
              key={i}
              className="self-start max-w-[82%] px-3 py-2 rounded-[13px] text-[13px] leading-relaxed"
              style={{ background: '#252525', color: '#E5E7EB', borderBottomLeftRadius: '3px' }}
            >
              <EmojiText text={m.text} size="13px" />
            </div>
          ) : (
            <div
              key={i}
              className="self-end max-w-[82%] px-3 py-2 rounded-[13px] text-[13px] text-white leading-relaxed"
              style={{ background: '#4ECBA0', borderBottomRightRadius: '3px' }}
            >
              <EmojiText text={m.text} size="13px" />
            </div>
          )
        )}
        {loading && (
          <div
            className="self-start flex gap-1 px-3 py-2 rounded-[13px]"
            style={{ background: '#252525', borderBottomLeftRadius: '3px' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bop-1" style={{ background: '#6B7280' }} />
            <span className="w-1.5 h-1.5 rounded-full bop-2" style={{ background: '#6B7280' }} />
            <span className="w-1.5 h-1.5 rounded-full bop-3" style={{ background: '#6B7280' }} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-1.5 px-3 py-2.5 border-t flex-shrink-0" style={{ borderColor: '#2D2D2D' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Votre question…"
          className="flex-1 px-3 py-2 rounded-full text-[13px] border-[1.5px] outline-none transition-colors"
          style={{ background: '#252525', borderColor: '#2D2D2D', color: '#E5E7EB' }}
          onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
          onBlur={e => (e.target.style.borderColor = '#2D2D2D')}
        />
        <button
          onClick={send}
          className="w-8 h-8 rounded-full border-none cursor-pointer text-white text-sm flex items-center justify-center flex-shrink-0"
          style={{ background: '#4ECBA0' }}
        >
          <Emoji native="➤" />
        </button>
      </div>
    </div>
  )
}
