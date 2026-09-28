'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { Bubble, Icon, Logo } from '../primitives'
import { COL } from '../colors'
import type { IconName } from '../icons'
import { SiteRoot } from '../public/SiteRoot'

type CountKey = 'pendingVerifications' | 'pendingDocuments' | 'reportedReviews' | 'openReports' | 'newBugs'

interface AdmItem { href: string; t: string; ic: IconName; count?: CountKey }

/** Navigation de l'administration : Ã©crans de la maquette et Ã©crans existants. */
export const ADM_NAV: AdmItem[] = [
  { href: '/admin', t: 'Tableau de bord', ic: 'home' },
  { href: '/admin/analytics', t: 'Analytics', ic: 'chart' },
  { href: '/admin/utilisateurs', t: 'Utilisateurs', ic: 'users' },
  { href: '/admin/verifications', t: 'VÃ©rifications', ic: 'shield', count: 'pendingVerifications' },
  { href: '/admin/documents', t: 'Documents', ic: 'doc', count: 'pendingDocuments' },
  { href: '/admin/reviews', t: 'Avis', ic: 'chat', count: 'reportedReviews' },
  { href: '/admin/annonces', t: 'Annonces', ic: 'building' },
  { href: '/admin/signalements', t: 'Signalements', ic: 'flag', count: 'openReports' },
  { href: '/admin/paiements', t: 'Paiements', ic: 'card' },
  { href: '/admin/agences', t: 'Agences partenaires', ic: 'globe' },
  { href: '/admin/bug-reports', t: 'Retours bÃªta', ic: 'bug', count: 'newBugs' },
  { href: '/admin/bug-reports/archives', t: 'Tickets archivÃ©s', ic: 'inbox' },
]

/**
 * Ã‰crans dÃ©jÃ  passÃ©s au site v2 (Â« /* Â» : la route et ses sous-routes). Les
 * autres gardent leur apparence d'origine dans un cadre sombre (.ui-legacy),
 * le temps de leur migration.
 */
const V2_ADMIN: string[] = ['/admin', '/admin/utilisateurs/*', '/admin/verifications', '/admin/annonces', '/admin/signalements', '/admin/paiements', '/admin/agences']

function isV2Admin(pathname: string): boolean {
  return V2_ADMIN.some(p => (p.endsWith('/*') ? pathname.startsWith(p.slice(0, -1)) || pathname === p.slice(0, -2) : pathname === p))
}

function activeItem(pathname: string): AdmItem | undefined {
  // L'entrÃ©e la plus prÃ©cise gagne (/admin/bug-reports/archives avant /admin/bug-reports).
  return [...ADM_NAV]
    .sort((a, b) => b.href.length - a.href.length)
    .find(i => (i.href === '/admin' ? pathname === '/admin' : pathname === i.href || pathname.startsWith(`${i.href}/`)))
}

/** Titre de la barre du haut (fiche utilisateur comprise). */
function titleFor(pathname: string): string {
  if (/^\/admin\/utilisateurs\/[^/]+$/.test(pathname)) return 'Fiche utilisateur'
  return activeItem(pathname)?.t ?? 'Administration'
}

/** Coque de l'administration (admin() de la maquette) : mÃªmes classes que l'espace connectÃ©. */
export function AdminShell({ children, email, name }: { children: ReactNode; email: string; name: string }) {
  const pathname = usePathname() ?? '/admin'
  const [counts, setCounts] = useState<Partial<Record<CountKey, number>>>({})
  const cur = activeItem(pathname)
  const legacy = !isV2Admin(pathname)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/counts')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (!cancelled && data) setCounts(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [pathname])

  return (
    <SiteRoot>
      <div className="app">
        <aside className="side">
          <Link className="brand" href="/admin" aria-label="ISALY Administration"><Logo />isaly</Link>
          <div style={{ padding: '0 10px 8px' }}><span className="adm-badge">Administration</span></div>
          <nav className="nav" aria-label="Administration">
            {ADM_NAV.map(i => {
              const n = i.count ? counts[i.count] ?? 0 : 0
              return (
                <Link key={i.href} href={i.href} aria-current={cur?.href === i.href ? 'page' : undefined}>
                  <Icon name={i.ic} />
                  <span>{i.t}</span>
                  {n > 0 && <span className="count">{n > 99 ? '99+' : n}</span>}
                </Link>
              )
            })}
          </nav>
          <div className="side-card">
            <b>Retour Ã  lâ€™app</b>
            <p>Tu restes connectÃ© avec ton compte.</p>
            <Link className="link" href="/app/dashboard-home">Ouvrir lâ€™espace connectÃ©</Link>
          </div>
          <div className="side-me">
            <Bubble name={name || 'ISALY'} color={COL.violet} size={38} />
            <div className="grow"><b>{name || 'Ã‰quipe ISALY'}</b><span>{email}</span></div>
          </div>
        </aside>
        <div className="main">
          <header className="bar">
            <span className="logo-m"><Logo /></span>
            <h1>{titleFor(pathname)}</h1>
            <span className="sp" />
          </header>
          <nav className="adm-mnav" aria-label="Administration">
            {ADM_NAV.map(i => (
              <Link key={i.href} href={i.href} aria-current={cur?.href === i.href ? 'page' : undefined}>{i.t}</Link>
            ))}
          </nav>
          <main className={legacy ? 'view is-legacy' : 'view'} id="contenu" tabIndex={-1}>
            {legacy ? <div className="ui-legacy">{children}</div> : <div className="screen enter">{children}</div>}
          </main>
        </div>
      </div>
    </SiteRoot>
  )
}
