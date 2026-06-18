'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLease } from '@/contexts/LeaseContext'
import ModeSwitcher from '@/components/ModeSwitcher'
import {
  Home, Flame, Search, Map, MessageCircle,
  Folder, User, Megaphone, FileText, Bookmark,
  CreditCard, Gift, Settings, LogOut,
  Users, ClipboardList, Wrench, Receipt, LayoutDashboard,
  ShieldAlert, Building2,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  icon: LucideIcon
  label: string
  href: string
  id: string
}

// ── Mode Locataire ───────────────────────────────────────────
const locataireMainItems: NavItem[] = [
  { icon: Home,          label: 'Accueil',     href: '/app/dashboard-home', id: 'dashboard-home' },
  { icon: Flame,         label: 'Trouver',     href: '/app/swipe',          id: 'swipe' },
  { icon: Search,        label: 'Rechercher',  href: '/app/recherche',      id: 'recherche' },
  { icon: Map,           label: 'Carte',       href: '/app/carte',          id: 'carte' },
  { icon: MessageCircle, label: 'Messages',    href: '/app/messages',       id: 'messages' },
]
const locataireSpaceItems: NavItem[] = [
  { icon: Building2, label: 'Ma maison',    href: '/app/maison',       id: 'maison' },
  { icon: Folder,    label: 'Mon dossier',  href: '/app/dossier',      id: 'dossier' },
  { icon: User,      label: 'Mon profil',   href: '/app/profil',       id: 'profil' },
  { icon: Megaphone, label: 'Mon annonce',  href: '/app/annonce',      id: 'annonce' },
  { icon: FileText,  label: 'Mes annonces', href: '/app/mes-annonces', id: 'mes-annonces' },
  { icon: Bookmark,  label: 'Favoris',      href: '/app/favoris',      id: 'favoris' },
]
const locataireAccountItems: NavItem[] = [
  { icon: CreditCard, label: 'Abonnements', href: '/app/paiement',   id: 'paiement' },
  { icon: Gift,       label: 'Parrainage',  href: '/app/parrainage', id: 'parrainage' },
  { icon: Settings,   label: 'Paramètres',  href: '/app/parametres', id: 'parametres' },
]

// ── Mode Loueur ──────────────────────────────────────────────
const loueurGestionItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Tableau de bord',  href: '/app/dashboard',    id: 'dashboard' },
  { icon: Megaphone,       label: 'Mon annonce',      href: '/app/annonce',      id: 'annonce' },
  { icon: FileText,        label: 'Mes annonces',     href: '/app/mes-annonces', id: 'mes-annonces' },
  { icon: Users,           label: 'Mes locataires',   href: '/app/locataires',   id: 'locataires' },
  { icon: Receipt,         label: 'Mes loyers',       href: '/app/loyers',       id: 'loyers' },
  { icon: Folder,          label: 'Mes documents',    href: '/app/documents',    id: 'documents' },
  { icon: Wrench,          label: 'Maintenance',      href: '/app/maintenance',  id: 'maintenance' },
  { icon: ClipboardList,   label: 'Mon bail',         href: '/app/bail',         id: 'bail' },
]
const loueurCommunicationItems: NavItem[] = [
  { icon: MessageCircle, label: 'Messages', href: '/app/messages', id: 'messages' },
]
const loueurAccountItems: NavItem[] = [
  { icon: Folder,     label: 'Mon dossier',  href: '/app/dossier',    id: 'dossier' },
  { icon: User,       label: 'Mon profil',   href: '/app/profil',     id: 'profil' },
  { icon: CreditCard, label: 'Abonnements',  href: '/app/paiement',   id: 'paiement' },
  { icon: Gift,       label: 'Parrainage',   href: '/app/parrainage', id: 'parrainage' },
  { icon: Settings,   label: 'Paramètres',   href: '/app/parametres', id: 'parametres' },
]

interface UserData {
  firstName: string
  lastName: string
  role: string
  avatarUrl: string | null
  isAdmin: boolean
}

export default function Sidebar() {
  const pathname                    = usePathname()
  const router                      = useRouter()
  const { setMode: syncContextMode } = useLease()

  const [collapsed, setCollapsed]   = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [currentMode, setCurrentMode] = useState<'locataire' | 'loueur'>('locataire')
  const [userData, setUserData]     = useState<UserData>({
    firstName: '', lastName: '', role: '', avatarUrl: null, isAdmin: false,
  })

  // Sync sidebar width to CSS variable so the main content margin reacts
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', collapsed ? '64px' : '232px')
  }, [collapsed])

  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Include active_mode so the switcher is initialised from the persisted value
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, role, avatar_url, is_admin, active_mode')
        .eq('id', user.id)
        .single()

      if (data) {
        setUserData({
          firstName: data.first_name ?? '',
          lastName:  data.last_name  ?? '',
          role:      data.role       ?? '',
          avatarUrl: data.avatar_url ?? null,
          isAdmin:   data.is_admin   === true,
        })
        // Hydrate local mode state + keep LeaseContext in sync
        const dbMode = data.active_mode === 'loueur' ? 'loueur' : 'locataire'
        setCurrentMode(dbMode)
        syncContextMode(dbMode)
      }

      // Unread message badge
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)
        .neq('sender_id', user.id)
      setUnreadCount(count ?? 0)

      // Real-time badge update
      channel = supabase
        .channel('sidebar-unread')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const m = payload.new as { sender_id: string; read: boolean }
          if (m.sender_id !== user.id && !m.read) setUnreadCount(n => n + 1)
        })
        .subscribe()
    }

    function handleMessagesRead() {
      ;(async () => {
        const { data: { user: u } } = await supabase.auth.getUser()
        if (!u) return
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('read', false)
          .neq('sender_id', u.id)
        setUnreadCount(count ?? 0)
      })()
    }

    window.addEventListener('messages-read', handleMessagesRead)
    loadProfile()
    return () => {
      if (channel) supabase.removeChannel(channel)
      window.removeEventListener('messages-read', handleMessagesRead)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function handleModeSwitch(newMode: 'locataire' | 'loueur') {
    // Optimistic — update UI immediately
    setCurrentMode(newMode)
    syncContextMode(newMode)
    // Persist silently in background
    fetch('/api/profile/mode', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: newMode }),
    }).catch(() => {})
  }

  const initials    = ((userData.firstName[0] ?? '') + (userData.lastName[0] ?? '')).toUpperCase() || '?'
  const displayName = `${userData.firstName} ${userData.lastName}`.trim() || 'Mon profil'

  return (
    <aside
      className="fixed top-0 left-0 bottom-0 z-50 flex flex-col"
      style={{
        width: collapsed ? '64px' : '232px',
        background: '#111827',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* ── Header / toggle ───────────────────────────────── */}
      <div
        className="flex items-center flex-shrink-0 border-b"
        style={{ borderColor: '#1F2937', padding: '14px 12px', gap: '8px', minHeight: '68px' }}
      >
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: '#6B7280', cursor: 'pointer', padding: '4px 6px',
              borderRadius: '6px', transition: 'all 0.15s', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#E5E7EB'; e.currentTarget.style.background = '#1F2937' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.background = 'none' }}
            title="Réduire"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>
            </svg>
          </button>
        )}
      </div>

      {/* Expand button (collapsed state) */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          style={{
            background: 'none', border: 'none', borderBottom: '1px solid #1F2937',
            color: '#6B7280', cursor: 'pointer', padding: '8px',
            width: '100%', textAlign: 'center', transition: 'all 0.15s', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#E5E7EB'; e.currentTarget.style.background = '#1F2937' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.background = 'none' }}
          title="Développer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 17l5-5-5-5M6 17l5-5-5-5"/>
          </svg>
        </button>
      )}

      {/* ── Mode Switcher — always visible when sidebar is expanded ── */}
      {!collapsed && (
        <div className="flex-shrink-0 px-3 pt-3 pb-1">
          <ModeSwitcher currentMode={currentMode} onSwitch={handleModeSwitch} />
        </div>
      )}

      {/* ── Scrollable nav ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {currentMode === 'loueur' ? (
          <>
            {!collapsed && <NavSection label="Gestion" />}
            {loueurGestionItems.map(item => (
              <NavLink key={item.id} item={item} active={pathname === item.href} collapsed={collapsed} unread={0} />
            ))}

            {!collapsed && <NavSection label="Communication" />}
            {loueurCommunicationItems.map(item => (
              <NavLink key={item.id} item={item} active={pathname === item.href} collapsed={collapsed} unread={item.id === 'messages' ? unreadCount : 0} />
            ))}

            {!collapsed && <NavSection label="Compte" />}
            {loueurAccountItems.map(item => (
              <NavLink key={item.id} item={item} active={pathname === item.href} collapsed={collapsed} unread={0} />
            ))}
          </>
        ) : (
          <>
            {!collapsed && <NavSection label="Principal" />}
            {locataireMainItems.map(item => (
              <NavLink key={item.id} item={item} active={pathname === item.href} collapsed={collapsed} unread={item.id === 'messages' ? unreadCount : 0} />
            ))}

            {!collapsed && <NavSection label="Mon espace" />}
            {locataireSpaceItems.map(item => (
              <NavLink key={item.id} item={item} active={pathname === item.href} collapsed={collapsed} unread={0} />
            ))}

            {!collapsed && <NavSection label="Compte" />}
            {locataireAccountItems.map(item => (
              <NavLink key={item.id} item={item} active={pathname === item.href} collapsed={collapsed} unread={0} />
            ))}

            {userData.isAdmin && (
              <>
                {!collapsed && <NavSection label="Admin" />}
                <NavLink
                  item={{ icon: ShieldAlert, label: 'Administration', href: '/admin', id: 'admin' }}
                  active={pathname.startsWith('/admin')}
                  collapsed={collapsed}
                  unread={0}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* ── Bottom : déconnexion + carte utilisateur ───────── */}
      <div className="border-t flex-shrink-0" style={{ borderColor: '#1F2937' }}>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3.5 py-2.5 mx-2 my-1 rounded-[10px] font-medium transition-all duration-200 border-none cursor-pointer"
          style={{
            color: '#6B7280', background: 'none',
            width: 'calc(100% - 16px)', textAlign: 'left',
            justifyContent: collapsed ? 'center' : undefined,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1F2937'; e.currentTarget.style.color = '#E5E7EB' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6B7280' }}
          title={collapsed ? 'Déconnexion' : undefined}
        >
          <LogOut size={18} strokeWidth={1.75} style={{ flexShrink: 0, opacity: 0.7 }} />
          {!collapsed && (
            <span style={{ textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif", fontSize: '12px', fontWeight: 600, letterSpacing: '1px' }}>
              Déconnexion
            </span>
          )}
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
                {currentMode === 'loueur' ? 'Mode Loueur' : 'Mode Locataire'}
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

function NavLink({
  item, active, collapsed, unread,
}: {
  item: NavItem; active: boolean; collapsed: boolean; unread: number
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className="flex items-center gap-3 py-2.5 mx-2 my-px rounded-[10px] transition-all duration-200 no-underline relative"
      style={
        active
          ? {
              background: '#16302a', color: '#4ECBA0',
              paddingLeft: collapsed ? undefined : 'calc(0.875rem - 3px)',
              paddingRight: '0.875rem',
              borderLeft: collapsed ? 'none' : '3px solid #4ECBA0',
              justifyContent: collapsed ? 'center' : undefined,
            }
          : {
              color: '#9CA3AF',
              paddingLeft: '0.875rem', paddingRight: '0.875rem',
              justifyContent: collapsed ? 'center' : undefined,
            }
      }
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#1F2937'; e.currentTarget.style.color = '#E5E7EB' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9CA3AF' } }}
    >
      <Icon size={18} strokeWidth={1.75} style={{ flexShrink: 0, opacity: 0.7 }} />
      {!collapsed && (
        <span
          className="flex-1"
          style={{ textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif", fontSize: '12px', fontWeight: 600, letterSpacing: '1px' }}
        >
          {item.label}
        </span>
      )}
      {!collapsed && unread > 0 && (
        <span style={{ marginLeft: 'auto', background: '#10B981', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px' }}>
          {unread}
        </span>
      )}
    </Link>
  )
}
