import Link from 'next/link'
import { Icon } from '../primitives'
import { Art } from '../visuals'
import { eur, m2 } from '../format'

export interface PublicCardListing {
  id: string
  title: string | null
  city: string | null
  neighborhood: string | null
  rent: number | null
  charges: number | null
  surface: number | null
  photos: string[] | null
}

/**
 * Carte d'annonce des pages publiques (adCard de la maquette) : la
 * compatibilité reste verrouillée tant que le visiteur n'a pas fait le test.
 */
export function PublicListingCard({ l }: { l: PublicCardListing }) {
  const place = [l.neighborhood, l.city].filter(Boolean).join(', ') || l.city || 'Colocation'
  const total = (l.rent ?? 0) + (l.charges ?? 0)
  return (
    <Link className="lcard" href={`/annonce/${l.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Art id={l.id} photo={l.photos?.[0] ?? null}>
        <span className="lockscore"><Icon name="lock" />Ta compatibilité</span>
      </Art>
      <div className="body">
        <h3>{place}</h3>
        <span className="s">{l.surface ? `Chambre de ${m2(l.surface)}` : (l.title ?? `Colocation à ${l.city ?? ''}`)}</span>
        <div className="foot">
          <span className="price">{eur(total)} <small>par mois</small></span>
        </div>
      </div>
    </Link>
  )
}
