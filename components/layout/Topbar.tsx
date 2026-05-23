'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import ChatbotWidget from '@/components/chatbot/ChatbotWidget'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/Button'

interface TopbarProps {
  title: string
}

export default function Topbar({ title }: TopbarProps) {
  const [chatOpen, setChatOpen]         = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
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
        style={{ background: '#FFFFFF', boxShadow: '0 1px 0 #E5E7EB' }}
      >
        <h1
          className="text-[17px] font-semibold flex-1"
          style={{ fontFamily: 'DM Sans, sans-serif', color: '#111827', letterSpacing: '-0.01em' }}
        >
          {title}
        </h1>

        <div className="flex gap-2 items-center">
          <TooltipProvider>
            {/* Search shortcut */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/app/recherche">
                  <Button variant="ghost" size="sm" className="gap-2 text-[12px] font-medium text-gray-700 border border-[#E5E7EB] bg-white hover:bg-gray-50 rounded-[10px]">
                    <span className="text-sm">🔍</span> Rechercher
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Recherche avancée</TooltipContent>
            </Tooltip>

            {/* Notifications */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Button variant="ghost" size="sm" className="gap-2 text-[12px] font-medium text-gray-700 border border-[#E5E7EB] bg-white hover:bg-gray-50 rounded-[10px]">
                    <span className="text-sm">🔔</span> Alertes
                  </Button>
                  <span
                    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2"
                    style={{ background: '#4ECBA0', borderColor: '#FFFFFF', animation: 'pulse-mint 2s ease infinite' }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>

            {/* Chatbot */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setChatOpen(o => !o)}
                  className="gap-2 text-[12px] font-medium text-gray-700 border border-[#E5E7EB] bg-white hover:bg-gray-50 rounded-[10px]"
                >
                  <span className="text-sm">🤖</span> Assistant
                </Button>
              </TooltipTrigger>
              <TooltipContent>Assistant IA</TooltipContent>
            </Tooltip>
          </TooltipProvider>

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
                <img src={avatarUrl} alt={initials} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </button>

            {showDropdown && (
              <div
                className="absolute right-0 top-11 z-50 overflow-hidden animate-fade-up"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '14px',
                  width: '190px',
                  boxShadow: '0 8px 32px rgba(0,0,0,.12)',
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
                <div style={{ height: '1px', background: '#F3F4F6', margin: '4px 0' }} />
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

      <ChatbotWidget open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  )
}


function DropdownItem({ icon, children, danger }: { icon: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium cursor-pointer transition-colors"
      style={{ color: danger ? '#EF4444' : '#374151' }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? '#FEF2F2' : '#F9FAFB')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span className="text-base">{icon}</span>
      {children}
    </div>
  )
}
