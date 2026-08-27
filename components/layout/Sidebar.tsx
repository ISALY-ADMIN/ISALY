'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLease } from '@/contexts/LeaseContext'
import ModeSwitcher from '@/components/ModeSwitcher'
import { canSwitchMode, roleToMode } from '@/lib/roles'
import {
  Home, Flame, Search, MessageCircle, // [HIDDEN] carte : ré-ajouter Map ici

  Folder, User, Megaphone, FileText, Bookmark,
  CreditCard, Settings, LogOut, // [HIDDEN] parrainage : ré-ajouter Gift ici

  Users, ClipboardList, Wrench, Receipt, LayoutDashboard,
  ShieldAlert, Building2, AlertTriangle, Inbox, ChevronsLeft,
  type LucideIcon,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface NavItem {
  icon: LucideIcon
  label: string
  href: string
  id: string
  /** Sous-items indentés rendus statiquement sous cet onglet (loueur seulement). */
  children?: NavItem[]
}

// ── Mode Locataire ───────────────────────────────────────────
const locataireMainItems: NavItem[] = [
  { icon: Home,          label: 'Tableau de bord', href: '/app/dashboard-home', id: 'dashboard-home' },
  { icon: Flame,         label: 'Trouver',     href: '/app/swipe',          id: 'swipe' },
  { icon: Search,        label: 'Rechercher',  href: '/app/recherche',      id: 'recherche' },
  // [HIDDEN] carte - réactiver quand demandé
  // { icon: Map,           label: 'Carte',       href: '/app/carte',          id: 'carte' },
  { icon: MessageCircle, label: 'Messages',    href: '/app/messages',       id: 'messages' },
]
const locataireSpaceItems: NavItem[] = [
  { icon: Building2,     label: 'Ma maison',             href: '/app/maison',             id: 'maison' },
  { icon: AlertTriangle, label: 'Déclarer un problème',  href: '/app/declarer-probleme',  id: 'declarer-probleme' },
  { icon: User,          label: 'Mon profil',            href: '/app/profil',             id: 'profil' },
  { icon: Bookmark,      label: 'Favoris',                href: '/app/favoris',           id: 'favoris' },
  // Coffre-fort personnel (PIN) : c'est une fonction locataire, mais l'entrée
  // n'existait que dans la nav loueur — donc inatteignable pour un locataire.
  // Ajoutée ici pour que la route, désormais ouverte, soit réellement accessible.
  { icon: Folder,        label: 'Mes documents',         href: '/app/documents',          id: 'documents' },
]
const locataireAccountItems: NavItem[] = [
  { icon: CreditCard, label: 'Abonnements', href: '/app/paiement',   id: 'paiement' },
  // [HIDDEN] parrainage - réactiver quand demandé
  // { icon: Gift,       label: 'Parrainage',  href: '/app/parrainage', id: 'parrainage' },
  { icon: Settings,   label: 'Paramètres',  href: '/app/parametres', id: 'parametres' },
]

// ── Mode Loueur ──────────────────────────────────────────────
const loueurGestionItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Tableau de bord',    href: '/app/dashboard-home', id: 'dashboard-home' },
  // [HIDDEN] deposer-annonce - remplacé par le bouton dans mes-annonces
  // { icon: Megaphone,       label: 'Déposer une annonce', href: '/app/annonce',       id: 'annonce' },
  { icon: FileText,        label: 'Mes annonces',       href: '/app/mes-annonces',   id: 'mes-annonces' },
  // [HIDDEN] candidatures - réactiver quand demandé
  // { icon: Inbox,           label: 'Mes candidatures',   href: '/app/candidatures',   id: 'candidatures' },
  {
    icon: ClipboardList, label: 'Mes baux', href: '/app/baux', id: 'baux',
    children: [
      { icon: Users,   label: 'Mes locataires', href: '/app/locataires', id: 'locataires' },
      { icon: Receipt, label: 'Mes loyers',     href: '/app/loyers',     id: 'loyers' },
    ],
  },
  { icon: Folder,          label: 'Mes documents',      href: '/app/documents',      id: 'documents' },
  { icon: Wrench,          label: 'Maintenance',        href: '/app/maintenance',    id: 'maintenance' },
]
const loueurCommunicationItems: NavItem[] = [
  { icon: MessageCircle, label: 'Messages', href: '/app/messages', id: 'messages' },
]
const loueurAccountItems: NavItem[] = [
  { icon: User,       label: 'Mon profil',   href: '/app/profil',     id: 'profil' },
  { icon: CreditCard, label: 'Abonnements',  href: '/app/paiement',   id: 'paiement' },
  { icon: Settings,   label: 'Paramètres',   href: '/app/parametres', id: 'parametres' },
]

/**
 * Le pivot 100% locataire est annulé : le mode d'affichage découle désormais
 * strictement de profiles.role, fixé par la question d'onboarding.
 *
 * Seul le compte à double vue (lib/roles.ts) conserve un switch visible et
 * peut basculer entre les deux navigations. Pour tout autre utilisateur, la
 * navigation correspond à son rôle, sans bascule possible.
 */

interface UserData {
  firstName: string
  lastName: string
  role: string
  email: string
  avatarUrl: string | null
  isAdmin: boolean
}

export default function Sidebar() {
  const pathname                    = usePathname()
  const router                      = useRouter()
  const { setMode: syncContextMode } = useLease()

  const [collapsed, setCollapsed]   = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [maintenanceCount, setMaintenanceCount] = useState(0)
  const [tenantMaintenanceCount, setTenantMaintenanceCount] = useState(0)
  const [currentMode, setCurrentMode] = useState<'locataire' | 'loueur'>('locataire')
  const [userData, setUserData]     = useState<UserData>({
    firstName: '', lastName: '', role: '', email: '', avatarUrl: null, isAdmin: false,
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

      // role initialise le switcher (colonne de référence du mode)
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, role, avatar_url, is_admin')
        .eq('id', user.id)
        .single()

      if (data) {
        setUserData({
          firstName: data.first_name ?? '',
          lastName:  data.last_name  ?? '',
          role:      data.role       ?? '',
          email:     user.email      ?? '',
          avatarUrl: data.avatar_url ?? null,
          isAdmin:   data.is_admin   === true,
        })
        // Hydrate local mode state + keep LeaseContext in sync.
        // Le rôle en base est la seule source de vérité du mode affiché.
        const dbMode = roleToMode(data.role)
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

      // Signalements de maintenance non traités (loueur)
      const { data: ownedLeases } = await supabase
        .from('leases')
        .select('id')
        .eq('owner_id', user.id)
      const ownedLeaseIds = (ownedLeases ?? []).map(l => l.id)
      if (ownedLeaseIds.length > 0) {
        const { count: mCount } = await supabase
          .from('maintenance_requests')
          .select('*', { count: 'exact', head: true })
          .in('lease_id', ownedLeaseIds)
          .neq('status', 'resolved')
        setMaintenanceCount(mCount ?? 0)
      }

      // Badge côté locataire : notifications maintenance non lues → dot mint sur "Déclarer un problème"
      const { count: tmCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'maintenance')
        .eq('read', false)
      setTenantMaintenanceCount(tmCount ?? 0)

      // Real-time badge update
      channel = supabase
        .channel('sidebar-unread')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const m = payload.new as { sender_id: string; read: boolean }
          if (m.sender_id !== user.id && !m.read) setUnreadCount(n => n + 1)
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
          const n = payload.new as { type: string; read: boolean }
          if (n.type === 'maintenance' && !n.read) setTenantMaintenanceCount(c => c + 1)
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

    /** Marque les notifications maintenance comme lues côté user (déclenché par la visite d'un signalement). */
    async function handleMaintenanceSeen() {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return
      await supabase.from('notifications')
        .update({ read: true }).eq('user_id', u.id).eq('type', 'maintenance').eq('read', false)
      setTenantMaintenanceCount(0)
    }

    window.addEventListener('messages-read', handleMessagesRead)
    window.addEventListener('maintenance-seen', handleMaintenanceSeen)
    loadProfile()
    return () => {
      if (channel) supabase.removeChannel(channel)
      window.removeEventListener('messages-read', handleMessagesRead)
      window.removeEventListener('maintenance-seen', handleMaintenanceSeen)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  async function handleModeSwitch(newMode: 'locataire' | 'loueur') {
    // Optimistic — update UI immediately
    setCurrentMode(newMode)
    syncContextMode(newMode)
    // Persist puis redirige vers dashboard-home (qui rend automatiquement
    // la variante correspondant au nouveau role). router.refresh() force le
    // re-render même quand on est déjà sur /app/dashboard-home.
    try {
      await fetch('/api/profile/mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      })
    } catch {}
    router.push('/app/dashboard-home')
    router.refresh()
  }

  const dualView    = canSwitchMode(userData.email)
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
        style={{
          borderColor: '#1F2937', padding: '14px 12px', gap: '8px', minHeight: '68px',
          justifyContent: collapsed ? 'center' : 'flex-end',
        }}
      >
        <SidebarToggle collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      </div>

      {/* ── Mode Switcher ──
          Réservé au compte à double vue : un utilisateur normal a un rôle fixé
          par l'onboarding et ne voit aucune bascule. */}
      {dualView && !collapsed && (
        <div className="flex-shrink-0 px-3 pt-3 pb-1">
          <ModeSwitcher currentMode={currentMode} onSwitch={handleModeSwitch} />
        </div>
      )}

      {/* ── Scrollable nav ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* La branche rendue suit strictement le mode, lui-même issu du rôle. */}
        {currentMode === 'loueur' ? (
          <>
            {!collapsed && <NavSection label="Gestion" />}
            {loueurGestionItems.map(item => (
              <div key={item.id}>
                <NavLink item={item} active={pathname === item.href} collapsed={collapsed} unread={item.id === 'maintenance' ? maintenanceCount : 0} />
                {!collapsed && item.children && item.children.length > 0 && (
                  <div
                    style={{
                      marginLeft: '22px', marginRight: '10px',
                      marginTop: '2px', marginBottom: '4px',
                      borderLeft: '2px solid rgba(78,203,160,0.45)',
                      paddingLeft: '4px',
                    }}
                  >
                    {item.children.map(sub => (
                      <NavSubLink key={sub.id} item={sub} active={pathname === sub.href} />
                    ))}
                  </div>
                )}
              </div>
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
              <NavLink key={item.id} item={item} active={pathname === item.href} collapsed={collapsed}
                unread={item.id === 'declarer-probleme' ? tenantMaintenanceCount : 0} />
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
              userData.avatarUrl.includes('googleusercontent.com') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userData.avatarUrl} alt={initials} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <Image src={userData.avatarUrl} alt={initials} width={40} height={40} className="w-10 h-10 rounded-full object-cover" />
              )
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

function NavSubLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className="flex items-center gap-2 py-1.5 no-underline transition-all duration-200"
      style={{
        paddingLeft: '10px', paddingRight: '10px',
        borderRadius: '6px',
        color: active ? '#4ECBA0' : '#9CA3AF',
        opacity: active ? 1 : 0.7,
        background: active ? 'rgba(78,203,160,0.08)' : 'transparent',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.color = '#E5E7EB'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.opacity = '0.7'
          e.currentTarget.style.color = '#9CA3AF'
        }
      }}
    >
      <Icon size={14} strokeWidth={1.75} style={{ flexShrink: 0, opacity: 0.6 }} />
      <span
        className="flex-1"
        style={{
          textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif",
          fontSize: '11px', fontWeight: 600, letterSpacing: '1px',
        }}
      >
        {item.label}
      </span>
    </Link>
  )
}

/**
 * Bouton de repli / dépliage de la sidebar.
 * Carré 28px, radius 10px (aligné sur Button.tsx), glass rgba blanc au repos
 * et accent mint au hover. Le chevron double pivote de 180° selon l'état —
 * une seule icône couvre les deux sens, la rotation porte le sens de l'action.
 */
function SidebarToggle({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const [hover, setHover] = useState(false)
  const label = collapsed ? 'Développer le menu' : 'Réduire le menu'

  return (
    <motion.button
      onClick={onToggle}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      whileTap={{ scale: 0.94 }}
      animate={{
        background:  hover ? 'rgba(16,185,129,0.10)' : 'rgba(255,255,255,0.04)',
        borderColor: hover ? 'rgba(16,185,129,0.30)' : 'rgba(255,255,255,0.08)',
      }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '28px', height: '28px', flexShrink: 0, padding: 0,
        borderRadius: '10px', borderWidth: '1px', borderStyle: 'solid',
        cursor: 'pointer',
      }}
      title={label}
      aria-label={label}
      aria-expanded={!collapsed}
    >
      <motion.span
        animate={{
          rotate: collapsed ? 180 : 0,
          color:  hover ? '#10B981' : 'rgba(255,255,255,0.45)',
        }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        style={{ display: 'flex' }}
      >
        <ChevronsLeft size={15} strokeWidth={2} />
      </motion.span>
    </motion.button>
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
