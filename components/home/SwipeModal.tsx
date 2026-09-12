'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import ListingSwipeCard, {
  type SwipeListing,
  type SwipeDirection,
  type ListingSwipeCardHandle,
} from '@/components/swipe/ListingSwipeCard'
import SwipeActions from '@/components/swipe/SwipeActions'
import { registerHref } from '@/lib/registerContext'
import type { HomeSearchResult } from '@/app/api/home-search/route'

/**
 * Fenêtre swipe de la page d'accueil — aperçu pour visiteur non connecté.
 *
 * Réutilise le VRAI composant components/swipe/ListingSwipeCard, celui de
 * /app/swipe, sans le redessiner. Deux points appellent de la vigilance :
 *
 * 1. DIMENSIONNEMENT. La carte est `absolute inset-0` : elle remplit son
 *    parent, et son bloc photo vaut 47 % de cette hauteur. Un parent sans
 *    hauteur réelle (ou trop court) fait déborder le corps sous la photo —
 *    c'est exactement le chevauchement « Infos appart » qu'on voulait éviter.
 *    On reprend donc le contrat de /app/swipe : largeur min(460px, 92vw) et
 *    une hauteur EXPLICITE, pas un simple max-height.
 *
 *    Écart assumé avec la maquette : son `.modal-box-swipe` fait 320 px de
 *    large, taillé pour sa fausse carte HTML. Le vrai composant est dessiné
 *    pour 460 px ; l'y contraindre à 320 px reproduirait le bug. On garde donc
 *    la modale, on élargit la boîte.
 *
 * 2. COMPATIBILITÉ. Un visiteur n'a pas de profil : `coloc={null}` et
 *    `colocLoading={false}`, ce qui fait tomber la carte sur sa variante
 *    « pas de score ». Aucun pourcentage inventé n'est affiché. L'appel à
 *    l'inscription vit dans l'habillage de la modale, pas dans la carte.
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
  open: boolean
  onClose: () => void
  /** Résultats déjà chargés par la page — évite un second appel réseau. */
  listings: HomeSearchResult[]
}

export default function SwipeModal({ open, onClose, listings }: Props) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const cardRef = useRef<ListingSwipeCardHandle>(null)
  /** Une redirection est déjà lancée : un second geste pendant l'animation
   *  de sortie ne doit pas en empiler une autre. */
  const leaving = useRef(false)

  const preview = listings.slice(0, PREVIEW_COUNT).map(toSwipeListing)
  const current = preview[index]
  const exhausted = preview.length > 0 && index >= preview.length

  useEffect(() => {
    if (open) { setIndex(0); leaving.current = false }
  }, [open])

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

  // Échap ferme, et le scroll de la page est gelé tant que la fenêtre est ouverte.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, overflowY: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Aperçu du mode swipe"
    >
      <div style={{ position: 'relative', width: 'min(460px, 92vw)', margin: 'auto' }}>
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: 'absolute', top: -46, right: 0, width: 34, height: 34,
            borderRadius: '50%', background: '#131110',
            border: '1px solid rgba(255,255,255,0.14)', color: '#F6F3F0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 3,
          }}
        >
          <X size={16} />
        </button>

        {/* Hauteur EXPLICITE : la carte est en position absolue et a besoin
            d'un parent dimensionné, sinon son corps passe sous la photo.
            560 px et non 620 : mesuré en aperçu visiteur, les deux panneaux
            ne remplissent pas une carte de 620 px et laissent ~76 px de vide
            beige sous « Postuler ». Le corps de la carte reste scrollable,
            donc une annonce occupée (avatars + pastille de score, plus haute)
            ne se retrouve pas coupée. */}
        <div style={{ position: 'relative', width: '100%', height: 'min(560px, 78vh)' }}>
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
              quel : rétablir l'ancien comportement, c'est remettre
              `setIndex(i => i + 1)` dans handleSwipe, et cet écran reprend son
              rôle sans être réécrit. */}
          {SHOW_PREVIEW_EXHAUSTED && exhausted && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 24,
              background: '#131110', border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', textAlign: 'center', padding: 32, gap: 14,
            }}>
              <h3 className="home-serif" style={{
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
      </div>
    </div>
  )
}
