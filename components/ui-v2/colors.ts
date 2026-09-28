/**
 * Couleurs des personnes (bulles, liens de constellation, scores).
 * Règle de la charte : corail, azur, menthe et soleil sont réservés aux
 * personnes et aux scores, jamais aux boutons. Le violet est « toi ».
 */
export const COL = {
  coral: '#FF5C8A',
  azure: '#2F6BFF',
  mint: '#16C79A',
  sun: '#FFB524',
  violet: '#6C4DFF',
  ink: '#48437A',
} as const

export type PersonColor = (typeof COL)[keyof typeof COL]

const PEOPLE: PersonColor[] = [COL.coral, COL.azure, COL.mint, COL.sun]

/** Couleur stable d'une personne à partir de son identifiant. */
export function personColor(id: string | null | undefined): PersonColor {
  if (!id) return COL.ink
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return PEOPLE[Math.abs(h) % PEOPLE.length]
}

const hex = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))

/** Mélange deux couleurs hexadécimales (t entre 0 et 1). */
export function mix(a: string, b: string, t: number): string {
  const B = hex(b)
  return '#' + hex(a).map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')
}
