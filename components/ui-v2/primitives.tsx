/**
 * Composants de base du dashboard v2, équivalents React de bub, stack, chip,
 * pill, seg, ring, barRow et tog de la maquette (design/isaly-dashboard-v2.html).
 * Les classes CSS sont celles de la maquette, portées dans styles/ui-v2.css.
 */
import type { CSSProperties, ReactNode } from 'react'
import { ICONS, LOGO_PATH, type IconName } from './icons'
import { COL } from './colors'
import { pc } from './format'

type CSSVars = CSSProperties & Record<`--${string}`, string | number>

/* ── Icon ─────────────────────────────────────────────────────────── */
export function Icon({ name, size = 20, className, style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg
      className={className ? `ic ${className}` : 'ic'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={style}
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  )
}

/* ── Logo ─────────────────────────────────────────────────────────── */
export function Logo({ size }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" width={size} height={size}>
      <path d={LOGO_PATH} fill="url(#lg)" stroke="url(#lg)" strokeWidth="7" strokeLinejoin="round" transform="translate(0 2)" />
    </svg>
  )
}

/* ── Bubble et Stack ──────────────────────────────────────────────── */
export interface Person {
  /** Prénom affiché (l'initiale sert dans la bulle). */
  n: string
  /** Couleur de la personne (COL). */
  c: string
  /** Score de compatibilité 0-100, si connu. */
  s?: number | null
  /** Photo, si disponible : remplace l'initiale. */
  avatar?: string | null
}

export function Bubble({ name, color = COL.violet, size = 36, avatar }: { name: string; color?: string; size?: number; avatar?: string | null }) {
  const style: CSSVars = { '--c': color, '--s': `${size}px` }
  if (avatar) {
    return (
      <span className="bub" style={{ ...style, overflow: 'hidden' }} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </span>
    )
  }
  return (
    <span className="bub" style={style} aria-hidden="true">
      {(name || '?').trim().charAt(0).toUpperCase()}
    </span>
  )
}

export function Stack({ people, size = 30 }: { people: Person[]; size?: number }) {
  return (
    <span className="stack">
      {people.map((p, i) => (
        <Bubble key={`${p.n}-${i}`} name={p.n} color={p.c} size={size} avatar={p.avatar} />
      ))}
    </span>
  )
}

/* ── Chip (personne et score) ─────────────────────────────────────── */
export function Chip({ person }: { person: Person }) {
  const dot: CSSVars = { '--c': person.c }
  return (
    <span className="chip">
      <i style={dot} />
      {person.n} {person.s != null && <b>{pc(person.s)}</b>}
    </span>
  )
}

/* ── Pill (statut) ────────────────────────────────────────────────── */
export type Tone = '' | 'ok' | 'warn' | 'bad' | 'info' | 'brand'

export function Pill({ children, tone = '', icon }: { children: ReactNode; tone?: Tone; icon?: IconName }) {
  return (
    <span className={tone ? `pill ${tone}` : 'pill'}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  )
}

/* ── Segmented ────────────────────────────────────────────────────── */
export interface SegOption<V extends string> {
  value: V
  label: ReactNode
  icon?: IconName
}

export function Segmented<V extends string>({
  options, value, onChange, label = 'Choisir une vue', className, style,
}: {
  options: SegOption<V>[]
  value: V
  onChange: (v: V) => void
  label?: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={className ? `seg ${className}` : 'seg'} role="group" aria-label={label} style={style}>
      {options.map(o => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={17} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ── Toggle (role=switch) ─────────────────────────────────────────── */
export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      className="tog"
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  )
}

/* ── Ring (anneau de progression en dégradé) ──────────────────────── */
export function Ring({ value, max = 100, size = 112, children }: { value: number; max?: number; size?: number; children?: ReactNode }) {
  const r = size / 2 - 9
  const c = 2 * Math.PI * r
  const off = c * (1 - Math.min(Math.max(value, 0) / (max || 1), 1))
  const h = size / 2
  return (
    <div className="v-ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <circle cx={h} cy={h} r={r} fill="none" stroke="var(--bg-2)" strokeWidth="9" />
        <circle
          cx={h} cy={h} r={r} fill="none" stroke="url(#gradRing)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c.toFixed(1)} strokeDashoffset={off.toFixed(1)} transform={`rotate(-90 ${h} ${h})`}
        />
      </svg>
      <div className="ring-in">{children}</div>
    </div>
  )
}

/* ── BarRow (barre de compatibilité) ──────────────────────────────── */
export function BarRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="barrow">
      <span>{label}</span>
      <span className="track"><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></span>
      <b>{pc(value)}</b>
    </div>
  )
}

/* ── Meter (jauge fine) ───────────────────────────────────────────── */
export function Meter({ value, style }: { value: number; style?: CSSProperties }) {
  return (
    <div className="meter" style={style}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

/* ── Panel (verre) ────────────────────────────────────────────────── */
export function Panel({
  title, action, children, className, solid, as = 'section', style, ariaLabel,
}: {
  title?: ReactNode
  action?: ReactNode
  children?: ReactNode
  className?: string
  solid?: boolean
  as?: 'section' | 'div' | 'article' | 'aside'
  style?: CSSProperties
  ariaLabel?: string
}) {
  const Tag = as
  const cls = ['panel', solid ? 'solid' : '', className ?? ''].filter(Boolean).join(' ')
  return (
    <Tag className={cls} style={style} aria-label={ariaLabel}>
      {(title || action) && (
        <div className="phead">
          {typeof title === 'string' ? <h2>{title}</h2> : title}
          {action}
        </div>
      )}
      {children}
    </Tag>
  )
}

/* ── Note (encadré violet clair) ──────────────────────────────────── */
export function Note({ icon = 'info', children, className, style }: { icon?: IconName; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={className ? `note ${className}` : 'note'} style={style}>
      <Icon name={icon} size={18} />
      <span>{children}</span>
    </div>
  )
}

/* ── Ico (pastille d'icône carrée) ────────────────────────────────── */
export function Ico({ name, tone = '', size = 18, style }: { name: IconName; tone?: Tone; size?: number; style?: CSSProperties }) {
  return (
    <span className={tone ? `ico ${tone}` : 'ico'} style={style}>
      <Icon name={name} size={size} />
    </span>
  )
}
