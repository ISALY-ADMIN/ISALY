import Link from 'next/link'
import type { ReactNode } from 'react'
import { Bubble, Icon } from '../primitives'
import { personColor } from '../colors'

/** Cellule « personne » des tableaux (whoCell de la maquette). */
export function Who({ id, name, sub, avatar }: { id: string; name: string; sub?: ReactNode; avatar?: string | null }) {
  return (
    <div className="who">
      <Bubble name={name || '?'} color={personColor(id)} size={34} avatar={avatar} />
      <span><b>{name || 'Sans nom'}</b>{sub != null && <span>{sub}</span>}</span>
    </div>
  )
}

/** Tableau dans un panneau, défilement horizontal sur mobile (tbl de la maquette). */
export function Tbl({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="panel" style={{ padding: '8px 8px 4px' }}>
      <div className="tscroll">
        <table className="tbl">
          <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          <tbody>{children}</tbody>
        </table>
      </div>
      {empty && <p className="soft" style={{ padding: '18px 12px', textAlign: 'center' }}>{empty}</p>}
    </div>
  )
}

/** Recherche en GET (le serveur filtre) : champ « q », autres paramètres conservés. */
export function SearchBox({ placeholder, q, keep }: { placeholder: string; q?: string; keep?: Record<string, string | undefined> }) {
  return (
    <form className="srch" role="search" method="get">
      <label className="sr" htmlFor="adm-q">{placeholder}</label>
      <Icon name="search" size={18} />
      <input id="adm-q" className="input" type="search" name="q" defaultValue={q} placeholder={placeholder} />
      {Object.entries(keep ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
    </form>
  )
}

/** Filtres en segments sous forme de liens (paramètre d'URL). */
export function SegLinks({ base, param, value, options, label, keep }: {
  base: string
  param: string
  value: string
  options: [string, string][]
  label: string
  keep?: Record<string, string | undefined>
}) {
  const href = (v: string) => {
    const p = new URLSearchParams()
    for (const [k, x] of Object.entries(keep ?? {})) if (x) p.set(k, x)
    p.set(param, v)
    return `${base}?${p.toString()}`
  }
  return (
    <nav className="seg" aria-label={label}>
      {options.map(([v, t]) => (
        <Link key={v} href={href(v)} aria-current={v === value ? 'page' : undefined}>{t}</Link>
      ))}
    </nav>
  )
}

/** Date courte des tableaux (27 sept. 2026). */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
