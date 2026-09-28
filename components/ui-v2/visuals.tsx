/**
 * Visuels partagés du dashboard v2 : constellation, radar, bandeau de
 * parcours, état vide, squelettes. Repris de constel(), radar() et des
 * blocs .pathband / .empty de la maquette.
 */
import type { CSSProperties, ReactNode } from 'react'
import { Icon, Pill, type Person, type Tone } from './primitives'
import type { IconName } from './icons'
import { pc } from './format'

/* ── Constellation : toi au centre, colocataires autour ───────────── */
const SPOTS: Record<number, [number, number][]> = {
  1: [[352, 160]],
  2: [[92, 160], [348, 160]],
  3: [[92, 80], [348, 80], [220, 276]],
  4: [[92, 76], [350, 80], [104, 250], [340, 250]],
}

export function Constellation({ people, label }: { people: Person[]; label: string }) {
  const cx = 220
  const cy = 160
  const list = people.slice(0, 4)
  const spots = SPOTS[Math.max(1, list.length)] ?? SPOTS[1]
  return (
    <svg viewBox="0 0 440 336" role="img" aria-label={label}>
      {list.map((p, i) => {
        const [x, y] = spots[i]
        return <line key={`l${i}`} className="cl-dash" x1={cx} y1={cy} x2={x} y2={y} stroke={p.c} strokeWidth="2.2" strokeDasharray="4 7" opacity=".6" />
      })}
      {list.map((p, i) => {
        const [x, y] = spots[i]
        return (
          <g key={`n${i}`} className="float" style={{ animationDelay: `${(-i * 1.7).toFixed(1)}s` }}>
            <circle cx={x} cy={y} r="30" fill={`url(#rb${p.c.slice(1)})`} />
            <text className="cl-init" x={x} y={y} textAnchor="middle" dominantBaseline="central">{(p.n || '?').charAt(0).toUpperCase()}</text>
            <text className="cl-name" x={x} y={y + 47} textAnchor="middle">{p.n}</text>
          </g>
        )
      })}
      <circle cx={cx} cy={cy} r="44" fill="url(#rb6C4DFF)" />
      <text className="cl-init" x={cx} y={cy} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 19 }}>Toi</text>
      {list.map((p, i) => {
        if (p.s == null) return null
        const [x, y] = spots[i]
        return (
          <g key={`t${i}`} className="cl-tag" transform={`translate(${(cx + x) / 2} ${(cy + y) / 2})`}>
            <rect x="-27" y="-14" width="54" height="28" rx="14" />
            <text textAnchor="middle" dominantBaseline="central">{pc(p.s)}</text>
          </g>
        )
      })}
    </svg>
  )
}

/* ── Radar 5 dimensions ───────────────────────────────────────────── */
export function Radar({ values, labels, label = 'Ton profil sur les 5 dimensions' }: { values: number[]; labels: string[]; label?: string }) {
  const size = 280
  const cx = 140
  const cy = 150
  const R = 96
  const n = labels.length || 5
  const pt = (i: number, f: number): [number, number] => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f]
  }
  const poly = (f: number) => labels.map((_, i) => pt(i, f).map(v => v.toFixed(1)).join(',')).join(' ')
  const vals = labels.map((_, i) => pt(i, Math.max(0, Math.min(100, values[i] ?? 0)) / 100).map(v => v.toFixed(1)).join(',')).join(' ')
  return (
    <svg className="radar" viewBox={`-40 -6 ${size + 80} ${size + 26}`} role="img" aria-label={label}>
      {[0.25, 0.5, 0.75, 1].map(f => (
        <polygon key={f} points={poly(f)} fill="none" stroke="var(--line-2)" strokeWidth="1" />
      ))}
      {labels.map((_, i) => {
        const [x, y] = pt(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={x.toFixed(1)} y2={y.toFixed(1)} stroke="var(--line)" />
      })}
      <polygon points={vals} fill="url(#gradFill)" stroke="url(#gradRing)" strokeWidth="2.5" strokeLinejoin="round" />
      {labels.map((d, i) => {
        const [x, y] = pt(i, 1.24)
        return (
          <text key={d} className="rl" x={x.toFixed(1)} y={y.toFixed(1)} textAnchor="middle" dominantBaseline="middle">{d}</text>
        )
      })}
    </svg>
  )
}

/* ── PathBanner : qui gère le logement ────────────────────────────── */
export function PathBanner({
  agency, icon, pill, pillTone, title, text, actions,
}: {
  agency?: boolean
  icon: IconName
  pill: string
  pillTone?: Tone
  title: ReactNode
  text: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className={agency ? 'pathband agency' : 'pathband'}>
      <span className="ico"><Icon name={icon} size={24} /></span>
      <div>
        <div className="chips"><Pill tone={pillTone ?? (agency ? 'warn' : 'brand')}>{pill}</Pill></div>
        <h2 style={{ marginTop: 8 }}>{title}</h2>
        <p>{text}</p>
      </div>
      {actions && <div className="acts">{actions}</div>}
    </section>
  )
}

/* ── EmptyState ───────────────────────────────────────────────────── */
export function EmptyState({
  icon, tone = 'brand', title, text, actions, className, style,
}: {
  icon: IconName
  tone?: Tone
  title: ReactNode
  text?: ReactNode
  actions?: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <section className={`panel empty${className ? ` ${className}` : ''}`} style={style}>
      <span className={tone ? `ico ${tone}` : 'ico'}><Icon name={icon} size={26} /></span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {actions && <div className="acts" style={{ justifyContent: 'center' }}>{actions}</div>}
    </section>
  )
}

/* ── Squelettes dans le style des panneaux ────────────────────────── */
export function SkelLine({ w = '100%', h = 14, style }: { w?: string | number; h?: number; style?: CSSProperties }) {
  return <span className="v-skel" style={{ width: w, height: h, ...style }} aria-hidden="true" />
}

export function SkelPanel({ lines = 3, height, className }: { lines?: number; height?: number; className?: string }) {
  return (
    <section className={`panel${className ? ` ${className}` : ''}`} aria-hidden="true" style={height ? { minHeight: height } : undefined}>
      <div className="phead"><SkelLine w="40%" h={18} /></div>
      <div style={{ display: 'grid', gap: 12 }}>
        {Array.from({ length: lines }, (_, i) => (
          <SkelLine key={i} w={`${90 - i * 12}%`} />
        ))}
      </div>
    </section>
  )
}

/** Écran de chargement générique : un titre et une grille de panneaux. */
export function SkelScreen({ panels = 4 }: { panels?: number }) {
  return (
    <div role="status" aria-label="Chargement">
      <div className="hello" aria-hidden="true">
        <div style={{ display: 'grid', gap: 12, width: 'min(520px,100%)' }}>
          <SkelLine w="60%" h={40} />
          <SkelLine w="90%" h={16} />
        </div>
      </div>
      <div className="v-grid g2">
        {Array.from({ length: panels }, (_, i) => <SkelPanel key={i} lines={3 + (i % 2)} />)}
      </div>
    </div>
  )
}

/* ── Visuel d'annonce : photo si disponible, sinon illustration ───── */
const ARTS = ['a1', 'a2', 'a3', 'a4', 'a5'] as const

export function artFor(id: string | null | undefined): (typeof ARTS)[number] {
  if (!id) return 'a1'
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) | 0
  return ARTS[Math.abs(h) % ARTS.length]
}

export function Art({
  id, photo, className, style, children,
}: {
  id: string | null | undefined
  photo?: string | null
  className?: string
  style?: CSSProperties
  children?: ReactNode
}) {
  const cls = ['art', photo ? 'has-photo' : artFor(id), className ?? ''].filter(Boolean).join(' ')
  return (
    <div className={cls} style={style}>
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="art-photo" src={photo} alt="" loading="lazy" referrerPolicy="no-referrer" />
      )}
      {children}
    </div>
  )
}
