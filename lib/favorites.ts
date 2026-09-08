/**
 * Bascule d'un favori.
 *
 * `POST /api/favorites` est un vrai toggle côté serveur : il supprime la ligne
 * si elle existe, l'insère sinon, et renvoie l'état obtenu. C'est donc le
 * serveur qui fait autorité, pas le compteur local — deux onglets ouverts sur
 * la même annonce ne peuvent pas diverger.
 *
 * Extrait ici pour que la carte de swipe et la barre d'actions sous la carte
 * partagent exactement le même appel : le bouton a changé de place, pas de
 * comportement.
 *
 * Renvoie `null` si l'appel échoue — l'appelant doit alors laisser l'état
 * inchangé plutôt que d'afficher un favori qui n'a pas été enregistré.
 */
export async function toggleListingFavorite(listingId: string): Promise<boolean | null> {
  try {
    const res = await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_id: listingId, target_type: 'listing' }),
    })
    if (!res.ok) return null
    const json = await res.json()
    return typeof json?.saved === 'boolean' ? json.saved : null
  } catch {
    return null
  }
}
