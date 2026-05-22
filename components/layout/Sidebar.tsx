'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLease } from '@/contexts/LeaseContext'

interface NavItem {
  icon: string
  label: string
  href: string
  badge?: number
  id: string
}

// ── Mode Recherche nav ───────────────────────────────────────
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

// ── Mode Gestion nav ─────────────────────────────────────────
const gestionItems: NavItem[] = [
  { icon: '🏡', label: 'Tableau de bord',   href: '/app/dashboard',     id: 'dashboard' },
  { icon: '💳', label: 'Mes loyers',         href: '/app/loyers',        id: 'loyers' },
  { icon: '📁', label: 'Mon dossier',        href: '/app/dossier',       id: 'dossier' },
  { icon: '👥', label: 'Mes colocataires',   href: '/app/colocataires',  id: 'colocataires' },
  { icon: '🔧', label: 'Maintenance',        href: '/app/maintenance',   id: 'maintenance' },
  { icon: '📄', label: 'Mon bail',           href: '/app/bail',          id: 'bail' },
  { icon: '💬', label: 'Messages',           href: '/app/messages',      id: 'messages' },
  { icon: '👤', label: 'Mon profil',         href: '/app/profil',        id: 'profil' },
]

interface UserData {
  firstName: string
  lastName: string
  role: string
  avatarUrl: string | null
}

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const { mode } = useLease()
  const [userData, setUserData] = useState<UserData>({ firstName: '', lastName: '', role: '', avatarUrl: null })

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, role, avatar_url')
        .eq('id', user.id)
        .single()
      if (data) {
        setUserData({
          firstName: data.first_name ?? '',
          lastName: data.last_name ?? '',
          role: data.role ?? '',
          avatarUrl: data.avatar_url ?? null,
        })
      }
    }
    loadProfile()
  }, [supabase])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = ((userData.firstName[0] ?? '') + (userData.lastName[0] ?? '')).toUpperCase() || '?'
  const displayName = `${userData.firstName} ${userData.lastName}`.trim() || 'Mon profil'

  return (
    <aside
      className="fixed top-0 left-0 bottom-0 z-50 flex flex-col overflow-y-auto"
      style={{ width: '232px', background: '#111827' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 pb-4 flex items-center gap-2.5 border-b" style={{ borderColor: '#1F2937' }}>
        <Image
          src="/LOGO_SANS_NOM_-_ISALY.png"
          alt="ISALY"
          height={32}
          width={32}
          style={{ width: '32px', height: '32px', objectFit: 'contain' }}
        />
        <span style={{ fontFamily: "'DM Serif Display', serif", color: '#ffffff', fontSize: '20px', letterSpacing: '0.3px' }}>
          Isaly
        </span>
      </div>

      {mode === 'gestion' ? (
        // ── MODE GESTION ─────────────────────────────────────
        <>
          {/* Mode badge */}
          <div className="mx-3 mb-3 px-3 py-2 rounded-[8px] text-center" style={{ background: '#0E2B1E', border: '1px solid #2AA87C' }}>
            <span className="text-[11.5px] font-extrabold" style={{ color: '#4ECBA0' }}>🏠 Mode Locataire</span>
          </div>

          {/* Nav items */}
          <div className="flex-1">
            {gestionItems.map(item => (
              <NavLink key={item.id} item={item} active={pathname === item.href} />
            ))}
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3.5 py-2.5 mx-2 my-px rounded-[10px] text-[13.5px] font-medium transition-all duration-200 border-none text-left w-[calc(100%-16px)] cursor-pointer"
            style={{ color: '#6B7280', background: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1F2937'; e.currentTarget.style.color = '#E5E7EB' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6B7280' }}
          >
            <span className="text-[18px] w-5 text-center flex-shrink-0">🚪</span>
            Déconnexion
          </button>

          {/* Switch to recherche */}
          <div className="mx-3 mb-2">
            <Link
              href="/app/swipe"
              className="flex items-center justify-center gap-2 py-2 rounded-[8px] text-[12px] font-semibold no-underline transition-all"
              style={{ color: '#6B7280', border: '1px solid #1F2937' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#4ECBA0'; e.currentTarget.style.color = '#4ECBA0' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1F2937'; e.currentTarget.style.color = '#6B7280' }}
            >
              🔍 Chercher une coloc
            </Link>
          </div>
        </>
      ) : (
        // ── MODE RECHERCHE ────────────────────────────────────
        <>
          <NavSection label="Principal" />
          {mainItems.map(item => (
            <NavLink key={item.id} item={item} active={pathname === item.href} />
          ))}

          <NavSection label="Mon espace" />
          {spaceItems.map(item => (
            <NavLink key={item.id} item={item} active={pathname === item.href} />
          ))}

          <NavSection label="Compte" />
          {accountItems.map(item => (
            <NavLink key={item.id} item={item} active={pathname === item.href} />
          ))}

          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3.5 py-2.5 mx-2 my-px rounded-[10px] text-[13.5px] font-medium transition-all duration-200 border-none text-left w-[calc(100%-16px)] cursor-pointer"
            style={{ color: '#6B7280', background: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1F2937'; e.currentTarget.style.color = '#E5E7EB' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6B7280' }}
          >
            <span className="text-[18px] w-5 text-center flex-shrink-0">🚪</span>
            Déconnexion
          </button>
        </>
      )}

      {/* Bottom user card */}
      <div className="mt-auto px-3 py-4 border-t" style={{ borderColor: '#1F2937' }}>
        <Link
          href="/app/profil"
          className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] cursor-pointer transition-colors no-underline group"
          onMouseEnter={e => (e.currentTarget.style.background = '#1F2937')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          style={{ background: 'transparent' }}
        >
          <div className="relative flex-shrink-0">
            {userData.avatarUrl ? (
              <img src={userData.avatarUrl} alt={initials} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-sm text-white"
                style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)' }}
              >
                {initials}
              </div>
            )}
            <div
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
              style={{ background: '#4ECBA0', borderColor: '#111827' }}
            />
          </div>

          <div className="min-w-0">
            <div className="text-[13px] font-semibold truncate" style={{ color: '#E5E7EB' }}>
              {displayName}
            </div>
            <div className="text-[11px]" style={{ color: '#6B7280' }}>
              {userData.role === 'loueur' ? 'Loueur' : userData.role === 'locataire' ? 'Locataire' : 'Membre'}
            </div>
          </div>
        </Link>
      </div>
    </aside>
  )
}

function NavSection({ label }: { label: string }) {
  return (
    <div className="px-4 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-[2px]" style={{ color: '#4B5563' }}>
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
              background: 'rgba(16,185,129,0.13)',
              color: '#ffffff',
              fontWeight: 600,
              paddingLeft: 'calc(0.875rem - 3px)',
              paddingRight: '0.875rem',
              borderLeft: '3px solid #10B981',
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
      <span className="text-[18px] w-5 text-center flex-shrink-0 leading-none">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
          style={{ background: '#10B981' }}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  )
}
