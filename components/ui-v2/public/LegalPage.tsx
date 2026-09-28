import Link from 'next/link'
import { Icon } from '../primitives'
import { PublicLayout } from './PublicLayout'
import { Toc } from './Toc'

/** Pages légales existantes (pas encore de page de mentions légales). */
const LEGAL_PAGES = [
  { href: '/cgu', t: 'CGU' },
  { href: '/confidentialite', t: 'Confidentialité' },
]

function anchor(title: string): string {
  return title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/**
 * Mise en page des pages légales (vLegal de la maquette) : titre, date de
 * mise à jour, bascule entre les pages, sommaire et texte. Les textes
 * juridiques sont fournis par chaque page, tels quels.
 */
export function LegalPage({
  title, current, updated, sections,
}: {
  title: string
  current: '/cgu' | '/confidentialite'
  updated: string
  sections: { title: string; content: string }[]
}) {
  const items = sections.map(s => ({ id: anchor(s.title), t: s.title.replace(/^\d+\.\s*/, '') }))
  return (
    <PublicLayout>
      <div className="wrap">
        <div style={{ padding: '36px 0 8px' }}>
          <h1 className="h1" style={{ fontSize: 'clamp(2rem,4.4vw,3.2rem)' }}>{title}</h1>
          <span className="upd"><Icon name="clock" size={16} />{`Dernière mise à jour : ${updated}`}</span>
        </div>
        <div className="mt">
          <nav className="seg" aria-label="Pages légales">
            {LEGAL_PAGES.map(p => (
              <Link key={p.href} href={p.href} aria-current={p.href === current ? 'page' : undefined}>{p.t}</Link>
            ))}
          </nav>
        </div>
        <div className="art-lay">
          <Toc items={items} />
          <div className="prose">
            {sections.map((s, i) => (
              <section key={i}>
                <h2 id={items[i].id} style={{ scrollMarginTop: 96 }}>{s.title}</h2>
                <p>{s.content}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
