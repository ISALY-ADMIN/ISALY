'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import SwipeDeck from '@/components/home/SwipeDeck'
import type { HomeSearchResult } from '@/app/api/home-search/route'

/**
 * Fenêtre swipe plein écran de la page d'accueil — aperçu pour visiteur non
 * connecté, ouverte par « Voir en plein écran » (pile en ligne) et par les
 * lanceurs de la section différenciante.
 *
 * La pile elle-même (vrai ListingSwipeCard, boutons, redirection vers
 * l'inscription) vit dans components/home/SwipeDeck, partagée avec la version
 * en ligne. Ce fichier ne porte plus que l'habillage : voile, fermeture, Échap,
 * gel du scroll.
 *
 * Dimensionnement : on reprend le contrat de /app/swipe, largeur
 * min(460px, 92vw) et une hauteur EXPLICITE. Écart assumé avec la maquette :
 * son `.modal-box-swipe` fait 320 px de large, taillé pour sa fausse carte
 * HTML. Le vrai composant est dessiné pour 460 px ; l'y contraindre à 320 px
 * reproduirait le bug de chevauchement. On garde donc la modale, on élargit
 * la boîte.
 */

interface Props {
  open: boolean
  onClose: () => void
  /** Résultats déjà chargés par la page — évite un second appel réseau. */
  listings: HomeSearchResult[]
}

export default function SwipeModal({ open, onClose, listings }: Props) {
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

        {/* 560 px et non 620 : mesuré en aperçu visiteur, les deux panneaux
            ne remplissent pas une carte de 620 px et laissent ~76 px de vide
            beige sous « Postuler ». Le corps de la carte reste scrollable,
            donc une annonce occupée (avatars + pastille de score, plus haute)
            ne se retrouve pas coupée. */}
        <SwipeDeck listings={listings} cardHeight="min(560px, 78vh)" />
      </div>
    </div>
  )
}
