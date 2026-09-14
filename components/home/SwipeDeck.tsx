'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ListingSwipeCard, {
  type SwipeListing,
  type SwipeDirection,
  type ListingSwipeCardHandle,
} from '@/components/swipe/ListingSwipeCard'
import SwipeActions from '@/components/swipe/SwipeActions'
import { registerHref } from '@/lib/registerContext'
import type { HomeSearchResult } from '@/app/api/home-search/route'

/**
 * Pile swipe visiteur de la page d'accueil — carte + boutons + appel à
 * l'inscription. Extraite de SwipeModal pour être rendue à deux endroits sans
 * dupliquer la logique :
 *
 *   · en ligne, dans la colonne de droite de la page d'accueil (HomeClient) ;
 *   · dans la fenêtre plein écran (SwipeModal), inchangée pour le visiteur.
 *
 * Réutilise le VRAI composant components/swipe/ListingSwipeCard, celui de
 * /app/swipe, sans le redessiner. Deux points appellent de la vigilance :
 *
 * 1. DIMENSIONNEMENT. La carte est `absolute inset-0` : elle remplit son
 *    parent, et son bloc photo vaut 47 % de cette hauteur. Un parent sans
 *    hauteur réelle (ou trop court) fait déborder le corps sous la photo —
 *    c'est exactement le chevauchement « Infos appart » qu'on voulait éviter.
 *    L'appelant fournit donc une hauteur EXPLICITE (`cardHeight`), pas un
 *    simple max-height, et une largeur proche des 460 px de /app/swipe.
 *
 * 2. COMPATIBILITÉ. Un visiteur n'a pas de profil : `coloc={null}` et
 *    `colocLoading={false}`, ce qui fait tomber la carte sur sa variante
 *    « pas de score ». Aucun pourcentage inventé n'est affiché. L'appel à
 *    l'inscription vit dans l'habillage, pas dans la carte.
 *
 * Le composant est monté à neuf à chaque ouverture de la modale (elle rend
 * `null` fermée) : l'index et le verrou de redirection repartent donc de zéro
 * sans effet de réinitialisation.
 */

/** Nombre de logements montrés en aperçu à un visiteur non connecté.
 *  Depuis que le premier geste redirige, un seul est réellement atteignable ;
 *  la valeur est conservée pour que remettre l'avance dans `handleSwipe`
 *  suffise à retrouver l'aperçu à deux cartes. */
const PREVIEW_COUNT = 2

/** [HIDDEN - CTA SWIPE] Écran « C'était l'aperçu », inatteignable tant que le
 *  premier geste redirige vers l'inscription. Voir le bloc qu'il garde. */
const SHOW_PREVIEW_EXHAUSTED: boolean = false

function toSwipeListing(r: HomeSearchResult): SwipeListing {
  return {
    id: r.id,
    title: r.title,
    city: r.city,
    neighborhood: r.neighborhood,
    rent: r.rent,
    surface: r.surface,
    roomsAvailable: r.rooms,
    availableFrom: r.availableFrom,
    meuble: r.meuble,
    animauxOk: null,
    nonFumeur: null,
    photos: r.photos,
    ownerId: null,
    description: '',
    occupancy: r.occupancy,
    boostTier: null,
  }
}

interface Props {
  /** Résultats déjà chargés par la page — évite un second appel réseau. */
  listings: HomeSearchResult[]
  /** Hauteur EXPLICITE de la zone carte (voir point 1 ci-dessus). */
  cardHeight: string
}

export default function SwipeDeck({ listings, cardHeight }: Props) {
  const router = useRouter()
  // Jamais avancé tant que le premier geste redirige (voir [HIDDEN - CTA SWIPE]).
  const [index] = useState(0)
  const cardRef = useRef<ListingSwipeCardHandle>(null)
  /** Une redirection est déjà lancée : un second geste pendant l'animation
   *  de sortie ne doit pas en empiler une autre. */
  const leaving = useRef(false)

  const preview = listings.slice(0, PREVIEW_COUNT).map(toSwipeListing)
  const current = preview[index]
  const exhausted = preview.length > 0 && index >= preview.length

  /**
   * POINT DE CONVERGENCE UNIQUE des deux chemins d'action.
   *
   * `ListingSwipeCard` appelle `onSwipe(dir)` depuis son propre `fly()`, et
   * `fly()` est déclenché aussi bien par le glissement (handleDragEnd) que
   * par la poignée impérative `cardRef.current.swipe(dir)`. Les boutons
   * passent donc par la poignée plutôt que d'appeler la redirection
   * directement : il n'existe qu'un seul endroit qui décide quoi faire d'un
   * geste, et les deux chemins ne peuvent pas diverger. C'est exactement le
   * branchement de /app/swipe, où les boutons font `cardRef.current?.swipe()`.
   *
   * Aucun appel à /api/swipe : le visiteur n'a pas de compte, il n'y a rien
   * à enregistrer. Le geste sert uniquement à qualifier le message affiché
   * à l'inscription.
   */
  const handleSwipe = useCallback((dir: SwipeDirection) => {
    if (leaving.current) return
    leaving.current = true
    // 'super' n'est pas atteignable ici (bouton non rendu en variante
    // visiteur), mais le glissement vers le haut, lui, l'est : on le traite
    // comme un « j'adore » plutôt que de l'ignorer.
    const contexte = dir === 'left' ? 'pass' : 'like'
    // Laisse la carte sortir de l'écran avant de naviguer : le lien entre le
    // geste et la page d'inscription doit se voir. Même délai pour les deux
    // chemins, puisqu'ils passent tous les deux par ici.
    window.setTimeout(() => router.push(registerHref(contexte)), 320)
  }, [router])

  return (
    <>
      <div style={{ position: 'relative', width: '100%', height: cardHeight }}>
        {current && (
          <ListingSwipeCard
            key={current.id}
            ref={cardRef}
            listing={current}
            coloc={null}
            colocLoading={false}
            onSwipe={handleSwipe}
            onOpenScore={() => {}}
            onApply={() => router.push(registerHref('apply'))}
          />
        )}

        {/* [HIDDEN - CTA SWIPE] Écran de fin d'aperçu, devenu inatteignable.
            Il se montrait quand le visiteur avait parcouru les deux cartes ;
            désormais le premier geste — bouton comme glissement — redirige
            vers l'inscription, donc la pile n'avance jamais. Conservé tel
            quel : rétablir l'ancien comportement, c'est récupérer `setIndex`
            et remettre `setIndex(i => i + 1)` dans handleSwipe, et cet écran
            reprend son rôle sans être réécrit. */}
        {SHOW_PREVIEW_EXHAUSTED && exhausted && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 24,
            background: '#131110', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', textAlign: 'center', padding: 32, gap: 14,
          }}>
            <h3 className="isaly-serif" style={{
              fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: 24,
              margin: 0, color: '#F6F3F0',
            }}>
              C&apos;était l&apos;aperçu.
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: 'rgba(246,243,240,0.62)', margin: 0 }}>
              Crée ton compte pour swiper tous les logements et voir ton score de
              compatibilité avec les colocataires déjà en place.
            </p>
            <Link
              href="/auth/register"
              style={{
                marginTop: 6, background: '#4ADE80', color: '#08170F',
                fontWeight: 700, fontSize: 14, fontFamily: "'Outfit', sans-serif",
                padding: '12px 24px', borderRadius: 100, textDecoration: 'none',
              }}
            >
              Créer mon compte gratuitement
            </Link>
          </div>
        )}

        {preview.length === 0 && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 24,
            background: '#131110', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', padding: 32,
            fontSize: 14, color: 'rgba(246,243,240,0.62)',
          }}>
            Aucun logement à afficher pour le moment.
          </div>
        )}
      </div>

      {/* Boutons d'action — le composant de /app/swipe, variante visiteur :
          « Passer » et « J'adore » seulement. Ils ne redirigent pas eux-mêmes,
          ils jouent le swipe de la carte, qui rappelle handleSwipe. Un seul
          comportement pour le doigt et pour le clic. */}
      {preview.length > 0 && !exhausted && (
        <div style={{ marginTop: 18 }}>
          <SwipeActions
            variant="visitor"
            onPass={() => cardRef.current?.swipe('left')}
            onLike={() => cardRef.current?.swipe('right')}
          />
        </div>
      )}

      {/* Appel à l'inscription HORS de la carte : le composant réel n'est pas
          modifié pour le contexte visiteur. */}
      {!exhausted && preview.length > 0 && (
        <p style={{
          margin: '14px 0 0', textAlign: 'center', fontSize: 13,
          color: 'rgba(246,243,240,0.62)', lineHeight: 1.5,
        }}>
          Aperçu — passe ou aime ce logement pour continuer.{' '}
          <Link href={registerHref('like')} style={{ color: '#4ADE80', fontWeight: 600 }}>
            Crée ton compte
          </Link>{' '}
          pour voir ton score de compatibilité.
        </p>
      )}
    </>
  )
}
