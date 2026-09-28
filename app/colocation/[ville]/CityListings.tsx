'use client'

import { useMemo, useState } from 'react'
import { PublicListingCard, type PublicCardListing } from '@/components/ui-v2/public'

const PAGE = 12

/**
 * Annonces d'une ville : filtres par quartier (tirés des annonces réelles) et
 * « Voir plus d’annonces ». Les annonces arrivent déjà triées (mises en avant
 * d'abord) depuis la page serveur.
 */
export default function CityListings({ listings }: { listings: PublicCardListing[] }) {
  const [q, setQ] = useState<string | null>(null)
  const [shown, setShown] = useState(PAGE)

  const quartiers = useMemo(() => {
    const set = new Set<string>()
    for (const l of listings) if (l.neighborhood?.trim()) set.add(l.neighborhood.trim())
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [listings])

  const filtered = q ? listings.filter(l => l.neighborhood?.trim() === q) : listings
  const visible = filtered.slice(0, shown)

  return (
    <>
      {quartiers.length > 1 && (
        <div className="qchips" style={{ marginTop: 26 }} role="group" aria-label="Filtrer par quartier">
          <button type="button" className="fchip" aria-pressed={q === null} onClick={() => { setQ(null); setShown(PAGE) }}>Tous les quartiers</button>
          {quartiers.map(name => (
            <button key={name} type="button" className="fchip" aria-pressed={q === name} onClick={() => { setQ(name); setShown(PAGE) }}>{name}</button>
          ))}
        </div>
      )}
      <div className="gridcards mt">
        {visible.map(l => <PublicListingCard key={l.id} l={l} />)}
      </div>
      {filtered.length > shown && (
        <div style={{ textAlign: 'center', marginTop: 22 }}>
          <button className="btn btn-glass" type="button" onClick={() => setShown(s => s + PAGE)}>Voir plus d’annonces</button>
        </div>
      )}
    </>
  )
}
