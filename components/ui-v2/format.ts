/**
 * Typographie française du dashboard v2 : espace fine insécable avant % ? ! ;
 * et espace insécable avant € et m². Toujours passer par ces aides plutôt
 * que d'écrire les espaces à la main.
 */
export const NBSP = ' '
export const NNBSP = ' '

/** 1 240 € (séparateur de milliers fr-FR, espace insécable avant €). */
export function eur(n: number | null | undefined): string {
  const v = Number(n ?? 0)
  return `${Math.round(v).toLocaleString('fr-FR')}${NBSP}€`
}

/** Montant avec centimes si nécessaire (5,99 €). */
export function eurCents(cents: number): string {
  const v = cents / 100
  const txt = Number.isInteger(v)
    ? v.toLocaleString('fr-FR')
    : v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${txt}${NBSP}€`
}

/** 92 % avec espace fine insécable. */
export function pc(n: number | null | undefined): string {
  return `${Math.round(Number(n ?? 0))}${NNBSP}%`
}

/** 13 m² avec espace insécable. */
export function m2(n: number | null | undefined): string {
  return `${Math.round(Number(n ?? 0))}${NBSP}m²`
}

/** Remplace l'espace ordinaire devant ? ! ; : % par une espace fine insécable. */
export function frText(s: string): string {
  return s.replace(/ ([?!;%])/g, `${NNBSP}$1`).replace(/ :/g, `${NBSP}:`)
}

/** Accord simple : 1 annonce, 2 annonces. */
export function plural(n: number, one: string, many: string): string {
  return n > 1 ? many : one
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

/** « 1er octobre », « 12 septembre » (avec l'année si demandée). */
export function dayMonth(d: string | Date | null | undefined, withYear = false): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return ''
  const day = date.getDate() === 1 ? '1er' : String(date.getDate())
  return `${day} ${MONTHS[date.getMonth()]}${withYear ? ` ${date.getFullYear()}` : ''}`
}

/** « Jeudi 1er octobre à 18 h 30 ». */
export function longDateTime(d: string | Date | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return ''
  const wd = DAYS[date.getDay()]
  const h = date.getHours()
  const m = date.getMinutes()
  const hour = m ? `${h}${NBSP}h${NBSP}${String(m).padStart(2, '0')}` : `${h}${NBSP}h`
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${dayMonth(date)} à ${hour}`
}

/** « Septembre 2026 ». */
export function monthYear(d: string | Date | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return ''
  const m = MONTHS[date.getMonth()]
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${date.getFullYear()}`
}

/** « 18:15 », « Hier » ou « 12 septembre ». */
export function relativeWhen(d: string | Date | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  const y = new Date(now)
  y.setDate(now.getDate() - 1)
  if (date.toDateString() === y.toDateString()) return 'Hier'
  return dayMonth(date)
}

/** « Il y a 20 min », « Il y a 3 h », « Hier », « 12 septembre ». */
export function agoLabel(d: string | Date | null | undefined): string {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  const diff = Date.now() - date.getTime()
  if (Number.isNaN(diff)) return ''
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'À l’instant'
  if (min < 60) return `Il y a ${min}${NBSP}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Il y a ${h}${NBSP}h`
  if (h < 48) return 'Hier'
  return dayMonth(date)
}
