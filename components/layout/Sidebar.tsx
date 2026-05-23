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
  id: string
}

// ── Mode Recherche nav ───────────────────────────────────────
const mainItems: NavItem[] = [
  { icon: '🔥', label: 'Trouver',    href: '/app/swipe',     id: 'swipe' },
  { icon: '🔍', label: 'Rechercher', href: '/app/recherche', id: 'recherche' },
  { icon: '🗺️', label: 'Carte',      href: '/app/carte',     id: 'carte' },
  { icon: '💬', label: 'Messages',   href: '/app/messages',  id: 'messages' },
]
const spaceItems: NavItem[] = [
  { icon: '📁', label: 'Mon dossier', href: '/app/dossier', id: 'dossier' },
  { icon: '👤', label: 'Mon profil',  href: '/app/profil',  id: 'profil' },
  { icon: '📢', label: 'Mon annonce', href: '/app/annonce', id: 'annonce' },
]
const accountItems: NavItem[] = [
  { icon: '💳', label: 'Abonnements', href: '/app/paiement', id: 'paiement' },
]

// ── Mode Gestion nav ─────────────────────────────────────────
const gestionItems: NavItem[] = [
  { icon: '🏡', label: 'Tableau de bord',  href: '/app/dashboard',    id: 'dashboard' },
  { icon: '💳', label: 'Mes loyers',        href: '/app/loyers',       id: 'loyers' },
  { icon: '📁', label: 'Mon dossier',       href: '/app/dossier',      id: 'dossier' },
  { icon: '👥', label: 'Mes colocataires',  href: '/app/colocataires', id: 'colocataires' },
  { icon: '🔧', label: 'Maintenance',       href: '/app/maintenance',  id: 'maintenance' },
  { icon: '📄', label: 'Mon bail',          href: '/app/bail',         id: 'bail' },
  { icon: '💬', label: 'Messages',          href: '/app/messages',     id: 'messages' },
  { icon: '👤', label: 'Mon profil',        href: '/app/profil',       id: 'profil' },
]

interface UserData {
  firstName: string
  lastName: string
  role: string
  avatarUrl: string | null
}

export default function Sidebar() {
  const pathname                        = usePathname()
  const router                          = useRouter()
  const { mode }                        = useLease()
  const [collapsed, setCollapsed]       = useState(false)
  const [unreadCount, setUnreadCount]   = useState(0)
  const [userData, setUserData]         = useState<UserData>({ firstName: '', lastName: '', role: '', avatarUrl: null })

  // Sync sidebar width to CSS variable so layout can react without a context
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', collapsed ? '64px' : '232px')
  }, [collapsed])

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
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
          lastName:  data.last_name ?? '',
          role:      data.role ?? '',
          avatarUrl: data.avatar_url ?? null,
        })
      }
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)
        .neq('sender_id', user.id)
      setUnreadCount(count ?? 0)
    }
    loadProfile()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials    = ((userData.firstName[0] ?? '') + (userData.lastName[0] ?? '')).toUpperCase() || '?'
  const displayName = `${userData.firstName} ${userData.lastName}`.trim() || 'Mon profil'

  return (
    <aside
      className="fixed top-0 left-0 bottom-0 z-50 flex flex-col"
      style={{ width: collapsed ? '64px' : '232px', background: '#111827', transition: 'width 0.2s ease', overflow: 'hidden' }}
    >
      {/* ── Logo + toggle ─────────────────────────────────── */}
      <div
        className="flex items-center flex-shrink-0 border-b"
        style={{ borderColor: '#1F2937', padding: '14px 12px', gap: '8px', minHeight: '68px' }}
      >
        <Image
          src="/LOGO_ISALY.png"
          alt="ISALY"
          height={48}
          width={48}
          style={{ width: '48px', height: '48px', objectFit: 'contain', flexShrink: 0 }}
        />
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#6B7280',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px 6px',
              borderRadius: '6px',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#E5E7EB'; e.currentTarget.style.background = '#1F2937' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.background = 'none' }}
            title="Réduire"
          >
            ←
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: '1px solid #1F2937',
            color: '#6B7280',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '8px',
            width: '100%',
            textAlign: 'center',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#E5E7EB'; e.currentTarget.style.background = '#1F2937' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.background = 'none' }}
          title="Développer"
        >
          →
        </button>
      )}

      {/* ── Scrollable nav ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'gestion' ? (
          <>
            {!collapsed && (
              <div className="mx-3 mt-3 mb-2 px-3 py-2 rounded-[8px] text-center" style={{ background: '#0E2B1E', border: '1px solid #2AA87C' }}>
                <span className="text-[11.5px] font-extrabold" style={{ color: '#4ECBA0' }}>🏠 Mode Locataire</span>
              </div>
            )}
            {gestionItems.map(item => (
              <NavLink
                key={item.id}
                item={item}
                active={pathname === item.href}
                collapsed={collapsed}
                unread={item.id === 'messages' ? unreadCount : 0}
              />
            ))}
            {!collapsed && (
              <div className="mx-3 mb-2 mt-2">
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
            )}
          </>
        ) : (
          <>
            {!collapsed && <NavSection label="Principal" />}
            {mainItems.map(item => (
              <NavLink
                key={item.id}
                item={item}
                active={pathname === item.href}
                collapsed={collapsed}
                unread={item.id === 'messages' ? unreadCount : 0}
              />
            ))}
            {!collapsed && <NavSection label="Mon espace" />}
            {spaceItems.map(item => (
              <NavLink key={item.id} item={item} active={pathname === item.href} collapsed={collapsed} unread={0} />
            ))}
            {!collapsed && <NavSection label="Compte" />}
            {accountItems.map(item => (
              <NavLink key={item.id} item={item} active={pathname === item.href} collapsed={collapsed} unread={0} />
            ))}
          </>
        )}
      </div>

      {/* ── Bottom : sign out + user card ─────────────────── */}
      <div className="border-t" style={{ borderColor: '#1F2937' }}>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3.5 py-2.5 mx-2 my-1 rounded-[10px] text-[13.5px] font-medium transition-all duration-200 border-none cursor-pointer"
          style={{
            color: '#6B7280',
            background: 'none',
            width: 'calc(100% - 16px)',
            textAlign: 'left',
            justifyContent: collapsed ? 'center' : undefined,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1F2937'; e.currentTarget.style.color = '#E5E7EB' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6B7280' }}
        >
          <span className="text-[18px] w-5 text-center flex-shrink-0">🚪</span>
          {!collapsed && 'Déconnexion'}
        </button>

        <Link
          href="/app/profil"
          className="flex items-center gap-3 px-3 py-2.5 mx-2 mb-2 rounded-[10px] cursor-pointer transition-colors no-underline"
          style={{ justifyContent: collapsed ? 'center' : undefined, background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1F2937')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
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
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-[13px] font-semibold truncate" style={{ color: '#E5E7EB' }}>
                {displayName}
              </div>
              <div className="text-[11px]" style={{ color: '#6B7280' }}>
                {userData.role === 'loueur' ? 'Loueur' : userData.role === 'locataire' ? 'Locataire' : 'Membre'}
              </div>
            </div>
          )}
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

function NavLink({ item, active, collapsed, unread }: { item: NavItem; active: boolean; collapsed: boolean; unread: number }) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className="flex items-center gap-3 py-2.5 mx-2 my-px rounded-[10px] text-[13.5px] font-medium transition-all duration-200 no-underline relative"
      style={
        active
          ? {
              background: '#16302a',
              color: '#4ECBA0',
              fontWeight: 600,
              paddingLeft: collapsed ? undefined : 'calc(0.875rem - 3px)',
              paddingRight: '0.875rem',
              borderLeft: collapsed ? 'none' : '3px solid #4ECBA0',
              justifyContent: collapsed ? 'center' : undefined,
            }
          : {
              color: '#9CA3AF',
              paddingLeft: '0.875rem',
              paddingRight: '0.875rem',
              justifyContent: collapsed ? 'center' : undefined,
            }
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
      {!collapsed && <span className="flex-1">{item.label}</span>}
      {!collapsed && unread > 0 && (
        <span style={{ marginLeft: 'auto', background: '#10B981', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px' }}>
          {unread}
        </span>
      )}
    </Link>
  )
}
