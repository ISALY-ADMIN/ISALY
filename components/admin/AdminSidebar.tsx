'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, ShieldCheck, Megaphone,
  Flag, CreditCard, ArrowLeft,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  icon: LucideIcon
  label: string
  href: string
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Tableau de bord', href: '/admin' },
  { icon: Users,           label: 'Utilisateurs',    href: '/admin/utilisateurs' },
  { icon: ShieldCheck,     label: 'Vérifications',   href: '/admin/verifications' },
  { icon: Megaphone,       label: 'Annonces',        href: '/admin/annonces' },
  { icon: Flag,            label: 'Signalements',    href: '/admin/signalements' },
  { icon: CreditCard,      label: 'Paiements',       href: '/admin/paiements' },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className="fixed top-0 left-0 bottom-0 z-50 flex flex-col"
      style={{ width: '220px', background: '#111827', borderRight: '1px solid #1F2937' }}
    >
      {/* Header */}
      <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid #1F2937' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#EF4444', textTransform: 'uppercase', marginBottom: '2px', fontFamily: "'Outfit', sans-serif" }}>
          Administration
        </div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', fontFamily: "'Outfit', sans-serif" }}>
          ISALY
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map(item => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 mx-2 my-px rounded-[10px] no-underline transition-all duration-150"
              style={
                active
                  ? { background: '#16302a', color: '#4ECBA0', padding: '10px 14px', paddingLeft: 'calc(14px - 3px)', borderLeft: '3px solid #4ECBA0' }
                  : { color: '#9CA3AF', padding: '10px 14px' }
              }
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#1F2937'; e.currentTarget.style.color = '#E5E7EB' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9CA3AF' } }}
            >
              <Icon size={17} strokeWidth={1.75} style={{ flexShrink: 0, opacity: 0.8 }} />
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '12px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Back to app */}
      <div style={{ padding: '10px 8px 16px', borderTop: '1px solid #1F2937' }}>
        <Link
          href="/app/dashboard-home"
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] no-underline transition-all"
          style={{ color: '#6B7280' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#1F2937'; e.currentTarget.style.color = '#E5E7EB' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6B7280' }}
        >
          <ArrowLeft size={16} strokeWidth={1.75} />
          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '12px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Retour à l&apos;app
          </span>
        </Link>
      </div>
    </aside>
  )
}
