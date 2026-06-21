'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import NotifPanel from '@/components/notifications/NotifPanel'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface TopbarProps {
  title: string
}

export default function Topbar({ title }: TopbarProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotifs, setShowNotifs]     = useState(false)
  const [notifCount, setNotifCount]     = useState(0)
  const [avatarUrl, setAvatarUrl]       = useState<string | null>(null)
  const [initials, setInitials]         = useState('…')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('first_name, last_name, avatar_url').eq('id', user.id).single()
      if (data) {
        setAvatarUrl(data.avatar_url ?? null)
        setInitials((`${data.first_name?.[0] ?? ''}${data.last_name?.[0] ?? ''}`).toUpperCase() || '?')
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    async function loadUnread() {
      const res = await fetch('/api/notifications')
      const json = await res.json()
      setNotifCount((json.notifications ?? []).filter((n: { read: boolean }) => !n.read).length)
    }
    loadUnread()

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const channel = supabase
        .channel('notif-count')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, () => setNotifCount(c => c + 1))
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    })
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <>
      <div
        className="h-[56px] flex items-center px-6 gap-3.5 sticky top-0 z-10 flex-shrink-0"
        style={{
          background: 'rgba(10,10,10,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex-1" />

        <div className="flex gap-2 items-center">
          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifs(v => !v)}
              title="Alertes"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                width: '34px',
                height: '34px',
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            >
              🔔
              {notifCount > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#10B981', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '10px', minWidth: '16px', textAlign: 'center' }}>
                  {notifCount}
                </span>
              )}
            </button>
            {showNotifs && (
              <NotifPanel onClose={() => { setShowNotifs(false); setNotifCount(0) }} />
            )}
          </div>

          {/* Avatar + dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setShowDropdown(o => !o)}
              className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs text-white cursor-pointer border-none transition-all overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)',
                boxShadow: showDropdown ? '0 0 0 3px rgba(78,203,160,.3)' : undefined,
                padding: 0,
              }}
            >
              {avatarUrl ? (
                <Image src={avatarUrl} alt={initials} width={36} height={36} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </button>

            {showDropdown && (
              <div
                className="absolute right-0 top-11 z-50 overflow-hidden animate-fade-up"
                style={{
                  background: '#111111',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '14px',
                  width: '190px',
                  boxShadow: '0 8px 32px rgba(0,0,0,.5)',
                }}
              >
                <Link
                  href="/app/profil"
                  onClick={() => setShowDropdown(false)}
                  className="no-underline"
                >
                  <DropdownItem icon="👤">Mon profil</DropdownItem>
                </Link>
                <DropdownItem icon="⚙️">Paramètres</DropdownItem>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                <button
                  onClick={handleSignOut}
                  className="w-full border-none bg-transparent cursor-pointer text-left"
                >
                  <DropdownItem icon="🚪" danger>Déconnexion</DropdownItem>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}


function DropdownItem({ icon, children, danger }: { icon: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium cursor-pointer transition-colors"
      style={{ color: danger ? '#EF4444' : '#ffffff' }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span className="text-base">{icon}</span>
      {children}
    </div>
  )
}
