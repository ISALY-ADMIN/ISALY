import { createClient } from '@/lib/supabase/server'
import { getCoordsForCity, jitterCoords } from '@/lib/geo'
import { listingOccupancy } from '@/lib/utils'
import HomeClient from '@/components/home/HomeClient'
import type { HomeSearchResult } from '@/app/api/home-search/route'

/**
 * Page d'accueil publique (visiteur non connecté).
 *
 * Les métadonnées SEO ne vivent PAS ici : elles sont déclarées une fois pour
 * tout le site dans app/layout.tsx (title, description, robots, canonical,
 * openGraph, twitter), qui monte aussi <CookieConsent />. Cette page n'a donc
 * rien à réexporter — et surtout rien à écraser.
 *
 * Composant serveur : le premier écran de résultats est rendu côté serveur,
 * pour que le contenu soit indexable et qu'il n'y ait pas de grille vide au
 * chargement. La suite (recherche, filtres, carte, swipe) est prise en charge
 * par HomeClient.
 *
 * L'ancienne landing n'est pas supprimée : elle vit dans
 * components/landing/LegacyLanding.tsx, marquée [HIDDEN - REFONTE ACCUEIL].
 */

export const dynamic = 'force-dynamic'

/** Nombre d'annonces affichées au premier rendu, avant toute recherche. */
const INITIAL_LIMIT = 12

async function getInitialListings(): Promise<{ results: HomeSearchResult[]; total: number }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(60)

    if (error || !data) return { results: [], total: 0 }

    const results: HomeSearchResult[] = data.map(l => {
      const exact = l.latitude != null && l.longitude != null
        ? [Number(l.latitude), Number(l.longitude)] as [number, number]
        : getCoordsForCity((l.city as string) ?? '')
      return {
        id: l.id as string,
        title: (l.title as string) || `Colocation à ${l.city}`,
        city: (l.city as string) ?? '',
        neighborhood: (l.neighborhood as string) ?? null,
        rent: (l.rent as number) ?? 0,
        surface: (l.surface as number) ?? null,
        rooms: (l.rooms_available as number) ?? 0,
        photos: (l.photos as string[] | null) ?? [],
        occupancy: listingOccupancy(l),
        // Même règle de confidentialité que partout ailleurs sur le site :
        // position bruitée (~±500 m), jamais l'adresse exacte.
        coords: exact ? jitterCoords(exact, l.id as string) : null,
        meuble: (l.meuble as boolean | null) ?? null,
        availableFrom: (l.available_from as string | null) ?? null,
        createdAt: (l.created_at as string) ?? '',
      }
    })

    return { results: results.slice(0, INITIAL_LIMIT), total: results.length }
  } catch {
    // La page doit s'afficher même si la base est injoignable.
    return { results: [], total: 0 }
  }
}

export default async function HomePage() {
  const { results, total } = await getInitialListings()
  return <HomeClient initialResults={results} initialTotal={total} />
}
