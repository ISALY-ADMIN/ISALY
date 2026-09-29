'use client'

import { useState } from 'react'
import { Art, Icon, Modal } from '@/components/ui-v2'

/**
 * Galerie de l'annonce publique : cinq cases sur ordinateur (grande photo à
 * gauche), défilement horizontal sur mobile. Les cases sans photo reçoivent
 * l'illustration de la charte. « Voir les N photos » ouvre la galerie entière.
 */
export default function Gallery({ id, photos, title }: { id: string; photos: string[]; title: string }) {
  const [open, setOpen] = useState(false)
  const cells = Array.from({ length: 5 }, (_, i) => photos[i] ?? null)
  return (
    <>
      <div className="gal">
        {cells.map((p, i) => (
          <Art key={i} id={`${id}-${i}`} photo={p} style={{ position: 'relative' }}>
            {i === 4 && photos.length > 1 && (
              <button className="btn btn-glass btn-sm more" type="button" onClick={() => setOpen(true)}>
                <Icon name="image" size={16} />
                Voir les {photos.length} photos
              </button>
            )}
          </Art>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={title} wide>
        <div style={{ display: 'grid', gap: 12 }}>
          {photos.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p} src={p} alt={`Photo ${i + 1} sur ${photos.length}`} loading="lazy" referrerPolicy="no-referrer" style={{ width: '100%', borderRadius: 18 }} />
          ))}
        </div>
      </Modal>
    </>
  )
}
