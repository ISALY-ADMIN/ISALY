import { Skeleton } from '@/components/ui/Bento'

type Variant = 'bento' | 'list'

/**
 * Squelette de transition rendu par les `loading.tsx` de /app/*.
 *
 * Next affiche ce fallback dès le clic, pendant le chargement du chunk de la
 * route. Sans lui, l'ancienne page reste figée à l'écran jusqu'à ce que la
 * nouvelle soit prête : rien ne bouge, et la navigation paraît bloquée alors
 * que le chargement est en cours.
 *
 * La trame reprend celle des pages (barre 56px, conteneur 1080px, titre puis
 * grille bento ou liste) pour éviter un saut de mise en page à l'arrivée du
 * contenu réel. L'animation `.shimmer` vient de globals.css.
 */
export default function PageSkeleton({
  variant = 'bento',
  rows = 3,
}: {
  variant?: Variant
  rows?: number
}) {
  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      {/* Placeholder de la Topbar — statique : on ne monte pas le vrai
          composant pour ne pas déclencher ses fetchs le temps d'un fallback. */}
      <div
        className="h-[56px] sticky top-0 z-10 flex-shrink-0"
        style={{
          background: 'rgba(10,10,10,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      />

      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 24px 48px' }}>
        {/* Titre + sous-titre */}
        <div style={{ marginBottom: '28px' }}>
          <div
            className="shimmer"
            style={{
              width: '220px', height: '30px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)', marginBottom: '8px',
            }}
          />
          <div
            className="shimmer"
            style={{
              width: '140px', height: '14px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)',
            }}
          />
        </div>

        {variant === 'bento' ? (
          <div className="grid grid-cols-1 md:grid-cols-4 md:auto-rows-[148px] gap-4">
            <Skeleton className="md:col-span-2 md:row-span-2" />
            <Skeleton />
            <Skeleton />
            <Skeleton className="md:col-span-2" />
            <Skeleton />
            <Skeleton />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Array.from({ length: rows }, (_, i) => (
              <Skeleton key={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
