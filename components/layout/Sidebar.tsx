'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface NavItem {
  icon: string
  label: string
  href: string
  badge?: number
  id: string
}

const mainItems: NavItem[] = [
  { icon: '🔥', label: 'Trouver',     href: '/app/swipe',     id: 'swipe' },
  { icon: '🔍', label: 'Rechercher',  href: '/app/recherche', id: 'recherche' },
  { icon: '💬', label: 'Messages',    href: '/app/messages',  id: 'messages', badge: 3 },
]

const spaceItems: NavItem[] = [
  { icon: '📁', label: 'Mon dossier', href: '/app/dossier', id: 'dossier' },
  { icon: '👤', label: 'Mon profil',  href: '/app/profil',  id: 'profil' },
  { icon: '📢', label: 'Mon annonce', href: '/app/annonce', id: 'annonce' },
]

const accountItems: NavItem[] = [
  { icon: '💳', label: 'Paiement', href: '/app/paiement', id: 'paiement' },
]

interface SidebarProps {
  user?: { firstName?: string; lastName?: string; role?: string; initials?: string }
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <aside
      className="fixed top-0 left-0 bottom-0 z-50 flex flex-col overflow-y-auto"
      style={{ width: '232px', background: '#111827' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 pb-3">
        <Image
          src="/LOGO_ISALY.png"
          alt="ISALY"
          height={38}
          width={120}
          style={{ width: 'auto', height: '38px', objectFit: 'contain' }}
        />
      </div>

      {/* Principal */}
      <NavSection label="Principal" />
      {mainItems.map(item => (
        <NavLink key={item.id} item={item} active={pathname === item.href} />
      ))}

      {/* Mon espace */}
      <NavSection label="Mon espace" />
      {spaceItems.map(item => (
        <NavLink key={item.id} item={item} active={pathname === item.href} />
      ))}

      {/* Compte */}
      <NavSection label="Compte" />
      {accountItems.map(item => (
        <NavLink key={item.id} item={item} active={pathname === item.href} />
      ))}

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="flex items-center gap-3 px-3.5 py-2.5 mx-2 my-px rounded-[10px] text-[13.5px] font-medium transition-all duration-200 border-none text-left w-[calc(100%-16px)] cursor-pointer"
        style={{ color: '#6B7280', background: 'none' }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#1F2937'
          e.currentTarget.style.color = '#E5E7EB'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'none'
          e.currentTarget.style.color = '#6B7280'
        }}
      >
        <span className="text-[18px] w-5 text-center flex-shrink-0">🚪</span>
        Déconnexion
      </button>

      {/* Bottom user card */}
      <div className="mt-auto px-3 py-4 border-t" style={{ borderColor: '#1F2937' }}>
        <Link
          href="/app/profil"
          className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer transition-colors no-underline group"
          onMouseEnter={e => (e.currentTarget.style.background = '#1F2937')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          style={{ background: 'transparent' }}
        >
          {/* Avatar with online dot */}
          <div className="relative flex-shrink-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm text-white"
              style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)' }}
            >
              {user?.initials ?? 'AM'}
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
              style={{ background: '#4ECBA0', borderColor: '#111827' }}
            />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold truncate" style={{ color: '#E5E7EB' }}>
              {user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'Alex Martin'}
            </div>
            <div className="text-[11px]" style={{ color: '#6B7280' }}>
              {user?.role === 'loueur' ? 'Loueur' : 'Locataire'} · Paris
            </div>
          </div>
        </Link>
      </div>
    </aside>
  )
}

function NavSection({ label }: { label: string }) {
  return (
    <div
      className="px-3.5 pt-3 pb-1 text-[10px] font-extrabold uppercase tracking-[2px]"
      style={{ color: '#4B5563' }}
    >
      {label}
    </div>
  )
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 py-2.5 mx-2 my-px rounded-[10px] text-[13.5px] font-medium transition-all duration-200 no-underline relative"
      style={
        active
          ? {
              background: '#0E2B1E',
              color: '#4ECBA0',
              paddingLeft: 'calc(0.875rem - 3px)',
              paddingRight: '0.875rem',
              borderLeft: '3px solid #4ECBA0',
            }
          : { color: '#9CA3AF', paddingLeft: '0.875rem', paddingRight: '0.875rem' }
      }
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = '#1F2937'
          e.currentTarget.style.color = '#E5E7EB'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'none'
          e.currentTarget.style.color = '#9CA3AF'
        }
      }}
    >
      <span className="text-[18px] w-5 text-center flex-shrink-0">{item.icon}</span>
      {item.label}
      {item.badge ? (
        <span
          className="ml-auto text-[10px] font-extrabold px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
          style={{ background: '#4ECBA0' }}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  )
}
