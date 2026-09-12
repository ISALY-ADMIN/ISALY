'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import ListingSwipeCard, {
  type SwipeListing,
  type SwipeDirection,
  type ListingSwipeCardHandle,
} from '@/components/swipe/ListingSwipeCard'
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

/** Nombre de logements montrés en aperçu à un visiteur non connecté. */
const PREVIEW_COUNT = 2

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
  const [index, setIndex] = useState(0)
  const cardRef = useRef<ListingSwipeCardHandle>(null)

  const preview = listings.slice(0, PREVIEW_COUNT).map(toSwipeListing)
  const current = preview[index]
  const exhausted = preview.length > 0 && index >= preview.length

  useEffect(() => { if (open) setIndex(0) }, [open])

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

  function handleSwipe(_dir: SwipeDirection) {
    setIndex(i => i + 1)
  }

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
              onApply={() => { window.location.href = '/auth/register' }}
            />
          )}

          {exhausted && (
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

        {/* Appel à l'inscription HORS de la carte : le composant réel n'est pas
            modifié pour le contexte visiteur. */}
        {!exhausted && preview.length > 0 && (
          <p style={{
            margin: '16px 0 0', textAlign: 'center', fontSize: 13,
            color: 'rgba(246,243,240,0.62)', lineHeight: 1.5,
          }}>
            Aperçu · {Math.min(index + 1, preview.length)}/{preview.length} — glisse la carte
            pour passer ou aimer.{' '}
            <Link href="/auth/register" style={{ color: '#4ADE80', fontWeight: 600 }}>
              Crée ton compte
            </Link>{' '}
            pour voir ton score de compatibilité.
          </p>
        )}
      </div>
    </div>
  )
}
