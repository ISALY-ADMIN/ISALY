'use client'

import { motion } from 'framer-motion'
import { RotateCcw, X, Star, Heart, Info, Bookmark } from 'lucide-react'

/**
 * Deux variantes, une seule rangée de boutons.
 *
 * `full` (défaut) — /app/swipe, utilisateur connecté : les six boutons.
 * `visitor` — aperçu de la page d'accueil : seuls « Passer » et « J'adore ».
 *
 * [HIDDEN - VISITEUR] Les quatre autres ne sont pas supprimés, ils ne sont pas
 * rendus dans cette variante. Chacun suppose un compte : Annuler rejoue un
 * swipe déjà enregistré, Superlike et Favori écrivent en base, Info ouvre la
 * description d'une carte qu'un visiteur ne peut de toute façon pas suivre.
 * Les montrer à quelqu'un sans compte promettrait une action impossible.
 *
 * Le type est une union discriminée plutôt qu'une liste de props optionnelles :
 * la variante visiteur ne peut pas recevoir de gestionnaire inutile, et la
 * variante complète ne peut pas en oublier un.
 */
interface CommonProps {
  onPass: () => void
  onLike: () => void
}

interface FullProps extends CommonProps {
  variant?: 'full'
  onUndo: () => void
  canUndo: boolean
  onSuperLike: () => void
  onInfo: () => void
  /** Favori de la carte courante. Descendu ici depuis la photo, qui doit
   *  rester vierge (maquette) — mêmes appels, autre emplacement. */
  onFavorite: () => void
  isFavorite: boolean
}

interface VisitorProps extends CommonProps {
  variant: 'visitor'
}

type SwipeActionsProps = FullProps | VisitorProps

interface ActionButtonProps {
  onClick: () => void
  size: number
  label: string
  disabled?: boolean
  glow?: string
  style: React.CSSProperties
  children: React.ReactNode
}

function ActionButton({ onClick, size, label, disabled, glow, style, children }: ActionButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      whileHover={disabled ? undefined : { scale: 1.1, boxShadow: glow }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      className="flex items-center justify-center rounded-full cursor-pointer flex-shrink-0"
      style={{
        width: size,
        height: size,
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'default' : 'pointer',
        ...style,
      }}
    >
      {children}
    </motion.button>
  )
}

export default function SwipeActions(props: SwipeActionsProps) {
  const { onPass, onLike } = props
  const full = props.variant !== 'visitor'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="flex flex-col items-center gap-2 flex-shrink-0"
    >
      {/* Six boutons depuis l'ajout du favori : à 16 px d'écart la rangée
          mesure 380 px et déborde d'un écran de 360 px. L'écart est resserré
          sous 640 px, rétabli au-dessus. */}
      <div className="flex items-center justify-center gap-2.5 sm:gap-4">
        {/* Undo */}
        {full && (
          <ActionButton
            onClick={props.onUndo}
            disabled={!props.canUndo}
            size={44}
            label="Annuler le dernier swipe"
            glow="0 0 20px rgba(255,255,255,0.15)"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}
          >
            <RotateCcw size={18} />
          </ActionButton>
        )}

        {/* Passer */}
        <ActionButton
          onClick={onPass}
          size={56}
          label="Passer"
          glow="0 0 24px rgba(239,68,68,0.4)"
          style={{ background: 'rgba(255,255,255,0.05)', border: '2px solid rgba(239,68,68,0.5)', color: '#EF4444' }}
        >
          <X size={26} strokeWidth={2.5} />
        </ActionButton>

        {/* Superlike */}
        {full && (
          <ActionButton
            onClick={props.onSuperLike}
            size={48}
            label="Superlike"
            glow="0 0 24px rgba(245,158,11,0.45)"
            style={{ background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.5)', color: '#F59E0B' }}
          >
            <Star size={22} fill="currentColor" />
          </ActionButton>
        )}

        {/* J'adore */}
        <ActionButton
          onClick={onLike}
          size={64}
          label="J'adore"
          glow="0 0 32px rgba(16,185,129,0.65)"
          style={{
            background: 'linear-gradient(135deg, #10B981, #059669)',
            border: 'none',
            color: '#fff',
            boxShadow: '0 6px 28px rgba(16,185,129,0.5)',
          }}
        >
          <Heart size={30} fill="currentColor" />
        </ActionButton>

        {/* Info */}
        {full && (
          <ActionButton
            onClick={props.onInfo}
            size={44}
            label="Voir les détails"
            glow="0 0 20px rgba(255,255,255,0.15)"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}
          >
            <Info size={18} />
          </ActionButton>
        )}

        {/* Favori — anciennement posé sur la photo */}
        {full && (
          <ActionButton
            onClick={props.onFavorite}
            size={44}
            label={props.isFavorite ? 'Retirer des favoris' : 'Sauvegarder en favori'}
            glow="0 0 20px rgba(16,185,129,0.35)"
            style={props.isFavorite
              ? { background: 'rgba(16,185,129,0.9)', border: '1.5px solid rgba(16,185,129,0.9)', color: '#fff' }
              : { background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}
          >
            <Bookmark size={18} fill={props.isFavorite ? '#fff' : 'none'} />
          </ActionButton>
        )}
      </div>

      {/* Hints clavier — desktop uniquement, et variante complète uniquement :
          les raccourcis sont câblés par /app/swipe, pas par la modale de la
          page d'accueil. Les afficher au visiteur annoncerait des touches
          sans effet. */}
      {full && (
        <div
          className="hidden md:block text-center"
          style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Outfit', sans-serif", letterSpacing: '0.3px' }}
        >
          ← Passer&nbsp;&nbsp;&nbsp;→ J&apos;adore&nbsp;&nbsp;&nbsp;↑ Super&nbsp;&nbsp;&nbsp;Z Annuler&nbsp;&nbsp;&nbsp;Espace Photo
        </div>
      )}
    </motion.div>
  )
}
