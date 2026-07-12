'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, ShieldCheck, Megaphone,
  Flag, CreditCard, ArrowLeft, FileCheck, Star, BarChart3,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  icon: LucideIcon
  label: string
  href: string
  badgeKey?: 'pendingDocuments' | 'reportedReviews' | 'openReports'
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Tableau de bord', href: '/admin' },
  { icon: BarChart3,       label: 'Analytics',       href: '/admin/analytics' },
  { icon: Users,           label: 'Utilisateurs',    href: '/admin/utilisateurs' },
  { icon: ShieldCheck,     label: 'Vérifications',   href: '/admin/verifications' },
  { icon: FileCheck,       label: 'Documents',       href: '/admin/documents', badgeKey: 'pendingDocuments' },
  { icon: Star,            label: 'Avis',            href: '/admin/reviews',   badgeKey: 'reportedReviews' },
  { icon: Megaphone,       label: 'Annonces',        href: '/admin/annonces' },
  { icon: Flag,            label: 'Signalements',    href: '/admin/signalements', badgeKey: 'openReports' },
  { icon: CreditCard,      label: 'Paiements',       href: '/admin/paiements' },
]

type Counts = { pendingDocuments: number; reportedReviews: number; openReports: number }

export default function AdminSidebar() {
  const pathname = usePathname()
  const [counts, setCounts] = useState<Counts | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/counts')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelled && data) setCounts(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [pathname])

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className="fixed top-0 left-0 bottom-0 z-50 flex flex-col"
      style={{ width: '220px', background: '#0A0A0A', borderRight: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Header */}
      <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: '#10B981', textTransform: 'uppercase', marginBottom: '2px', fontFamily: "'Outfit', sans-serif" }}>
          Admin
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
          const badge = item.badgeKey && counts ? counts[item.badgeKey] : 0
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 mx-2 my-px rounded-[10px] no-underline transition-all duration-150"
              style={
                active
                  ? { background: 'rgba(16,185,129,0.12)', color: '#10B981', padding: '10px 14px', paddingLeft: 'calc(14px - 3px)', borderLeft: '3px solid #10B981' }
                  : { color: '#9CA3AF', padding: '10px 14px' }
              }
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#E5E7EB' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#9CA3AF' } }}
            >
              <Icon size={17} strokeWidth={1.75} style={{ flexShrink: 0, opacity: 0.8 }} />
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '12px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', flex: 1 }}>
                {item.label}
              </span>
              {badge > 0 && (
                <span style={{
                  fontSize: '10.5px', fontWeight: 800, minWidth: '20px', height: '20px',
                  borderRadius: '10px', padding: '0 6px',
                  background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.35)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Outfit', sans-serif", flexShrink: 0,
                }}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Back to app */}
      <div style={{ padding: '10px 8px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Link
          href="/app/dashboard-home"
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] no-underline transition-all"
          style={{ color: '#6B7280' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#E5E7EB' }}
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
