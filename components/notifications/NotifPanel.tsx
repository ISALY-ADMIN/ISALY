'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Notif {
  id: string
  type: string
  title: string
  body: string | null
  read: boolean
  link: string | null
  created_at: string
}

function getNotifIcon(type: string) {
  if (type === 'message') return '💬'
  if (type === 'match') return '❤️'
  if (type === 'listing') return '🏠'
  if (type === 'system') return '📢'
  return '🔔'
}

export default function NotifPanel({ onClose }: { onClose: () => void }) {
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchNotifs()

    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let active = true
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !active) return
      // topic unique par montage → évite la réutilisation d'un canal déjà souscrit
      channel = supabase
        .channel(`notifications:${user.id}:${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          if (payload?.new) setNotifs(prev => [payload.new as Notif, ...prev])
        })
        .subscribe()
    })
    // cleanup réel de l'effet (le return dans .then() n'était jamais appelé par React)
    return () => { active = false; if (channel) supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  async function fetchNotifs() {
    const res = await fetch('/api/notifications')
    const json = await res.json()
    setNotifs(json.notifications ?? [])
    setLoading(false)
  }

  async function markRead(id: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'all' }),
    })
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unread = notifs.filter(n => !n.read).length

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        top: '48px',
        right: '0',
        width: '360px',
        background: '#111111',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        zIndex: 100,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '17px', color: '#ffffff' }}>Alertes</div>
          {unread > 0 && <div style={{ fontSize: '12px', color: '#10B981', marginTop: '1px' }}>{unread} non lue{unread > 1 ? 's' : ''}</div>}
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            style={{ fontSize: '12px', color: '#10B981', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Tout marquer lu
          </button>
        )}
      </div>

      {/* Liste */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>Chargement...</div>
        ) : notifs.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔔</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '15px', color: '#ffffff', marginBottom: '6px' }}>Aucune alerte</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Tes notifications apparaîtront ici</div>
          </div>
        ) : (
          notifs.map(n => (
            <div
              key={n.id}
              onClick={() => { markRead(n.id); if (n.link) router.push(n.link); onClose() }}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '14px 20px',
                cursor: 'pointer',
                background: n.read ? 'transparent' : 'rgba(16,185,129,0.08)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(16,185,129,0.08)')}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                {getNotifIcon(n.type)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '2px' }}>{n.title}</div>
                {n.body && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</div>}
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '3px' }}>
                  {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', flexShrink: 0, marginTop: '6px' }} />}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
