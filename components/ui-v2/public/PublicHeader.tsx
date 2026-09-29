'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Icon, Logo } from '../primitives'

/** Liens de la landing (public/landing.html), dans le même ordre. */
export const PUBLIC_LINKS: { t: string; href: string; match?: (p: string) => boolean }[] = [
  { t: 'Le matching', href: '/#matching' },
  { t: 'Annonces', href: '/#annonces', match: p => p.startsWith('/annonce/') || p.startsWith('/colocation/') },
  { t: 'Bailleurs', href: '/#bailleurs' },
  { t: 'Tarifs', href: '/#tarifs' },
  { t: 'Blog', href: '/blog', match: p => p === '/blog' || p.startsWith('/blog/') },
]

/** En-tête public, identique à celui de la landing ; menu repliable sur mobile. */
export function PublicHeader() {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)

  // Le menu mobile se referme à chaque changement de page.
  useEffect(() => setOpen(false), [pathname])

  return (
    <header className="phdr">
      <div className="wrap">
        <Link className="plogo" href="/" aria-label="ISALY, accueil">
          <Logo />
          isaly
        </Link>
        <nav className="pnav" aria-label="Navigation principale">
          {PUBLIC_LINKS.map(l => (
            <a key={l.t} href={l.href} aria-current={l.match?.(pathname) ? 'page' : undefined}>{l.t}</a>
          ))}
        </nav>
        <span className="sp" />
        <div className="phdr-cta">
          <Link className="login" href="/auth/login">Connexion</Link>
          <Link className="btn btn-main btn-sm" href="/auth/register">Trouver ma coloc</Link>
          <button
            className="iconbtn burger"
            type="button"
            aria-expanded={open}
            aria-controls="menu-public"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setOpen(o => !o)}
          >
            <Icon name={open ? 'x' : 'menu'} />
          </button>
        </div>
      </div>
      <div className="wrap">
        <nav className="mnav" id="menu-public" aria-label="Menu" hidden={!open}>
          {PUBLIC_LINKS.map(l => (
            <a key={l.t} href={l.href} onClick={() => setOpen(false)}>{l.t}</a>
          ))}
          <Link href="/auth/login">Connexion</Link>
        </nav>
      </div>
    </header>
  )
}
