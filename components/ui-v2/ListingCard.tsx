'use client'

import { useState, type KeyboardEvent } from 'react'
import { toggleListingFavorite } from '@/lib/favorites'
import { Icon, Stack, type Person } from './primitives'
import { Art } from './visuals'
import { eur, m2, pc } from './format'
import { personColor } from './colors'

export interface CardListing {
  id: string
  title: string
  city: string
  neighborhood: string | null
  rent: number
  charges?: number
  surface?: number | null
  photo: string | null
  score: number | null
  colocs: { id: string; firstName: string; avatarUrl: string | null; score: number | null }[]
}

export const colocPeople = (colocs: CardListing['colocs']): Person[] =>
  colocs.map(c => ({ n: c.firstName, c: personColor(c.id), s: c.score, avatar: c.avatarUrl }))

export function placeOf(l: { neighborhood: string | null; city: string }) {
  return [l.neighborhood, l.city].filter(Boolean).join(', ') || l.city
}

/** Bouton cœur des cartes (favoris existants, /api/favorites). */
export function FavButton({ id, initial = false, onChange }: { id: string; initial?: boolean; onChange?: (on: boolean) => void }) {
  const [on, setOn] = useState(initial)
  return (
    <button
      className="fav"
      type="button"
      aria-pressed={on}
      aria-label={on ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      onClick={async e => {
        e.stopPropagation()
        const next = await toggleListingFavorite(id)
        if (next !== null) {
          setOn(next)
          onChange?.(next)
        }
      }}
    >
      <Icon name="heart" size={20} />
    </button>
  )
}

/** Carte d'annonce (lcard de la maquette). */
export function ListingCard({
  l, fav, onOpen, onFav,
}: {
  l: CardListing
  fav?: boolean
  onOpen: (id: string) => void
  onFav?: (id: string, on: boolean) => void
}) {
  const total = l.rent + (l.charges ?? 0)
  const label = `${placeOf(l)}${l.score != null ? `, ${l.score} pour cent de compatibilité` : ''}`
  return (
    <article
      className="lcard"
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => onOpen(l.id)}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(l.id)
        }
      }}
    >
      <Art id={l.id} photo={l.photo}>
        {l.score != null && <span className="score-pill">{pc(l.score)}</span>}
        <FavButton id={l.id} initial={fav} onChange={on => onFav?.(l.id, on)} />
      </Art>
      <div className="body">
        <h3>{placeOf(l)}</h3>
        <span className="s">{l.surface ? `Chambre de ${m2(l.surface)}` : l.title}</span>
        <div className="foot">
          <span className="price">{eur(total)} <small>par mois</small></span>
          {l.colocs.length > 0 && <Stack people={colocPeople(l.colocs)} size={28} />}
        </div>
      </div>
    </article>
  )
}
