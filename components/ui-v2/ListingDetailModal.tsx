'use client'

import { Modal } from './Modal'
import { Button } from './Button'
import { BarRow, Chip, Pill } from './primitives'
import { Art } from './visuals'
import { dayMonth, eur, m2, pc } from './format'
import { colocPeople, placeOf, type CardListing } from './ListingCard'

export interface DetailListing extends CardListing {
  ownerId: string | null
  availableFrom?: string | null
  meuble?: boolean | null
  dimensions?: number[] | null
}

export function availabilityLabel(d: string | null | undefined): string {
  if (!d) return 'Disponible maintenant'
  const date = new Date(d)
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return 'Disponible maintenant'
  return `Dès le ${dayMonth(date)}`
}

/** Fiche d'une annonce (mDetail de la maquette). */
export function ListingDetailModal({
  l, open, onClose, dimLabels, asked, fav, onFav, onAsk, busy,
}: {
  l: DetailListing | null
  open: boolean
  onClose: () => void
  dimLabels: string[]
  asked: boolean
  fav: boolean
  onFav: () => void
  onAsk: () => void
  busy?: boolean
}) {
  if (!l) return null
  const total = l.rent + (l.charges ?? 0)
  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      head={
        <Art id={l.id} photo={l.photo} style={{ height: 220, borderRadius: 22, margin: '-6px 0 18px' }}>
          {l.score != null && <span className="score-pill">{pc(l.score)} avec la coloc</span>}
        </Art>
      }
      title={placeOf(l)}
      lead={`${l.surface ? `Chambre de ${m2(l.surface)}` : l.title}${l.meuble == null ? '' : l.meuble ? ', meublée' : ', non meublée'}. ${availabilityLabel(l.availableFrom)}.`}
      footer={
        <>
          <Button variant="ghost" href={`/app/annonce/${l.id}`}>Voir l’annonce complète</Button>
          <Button variant="glass" icon="heart" onClick={onFav}>{fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}</Button>
          {asked ? (
            <Pill tone="ok" icon="check">Demande déjà envoyée</Pill>
          ) : (
            <Button variant="main" onClick={onAsk} disabled={busy}>Envoyer une demande</Button>
          )}
        </>
      }
    >
      <div className="meta mt">
        <b>{eur(total)}</b>
        <span>par mois, charges comprises</span>
      </div>
      {l.colocs.length > 0 ? (
        <div className="v-grid g2 mt">
          <div>
            <span className="flabel">Avec chacun</span>
            <div className="chips" style={{ marginTop: 8 }}>
              {colocPeople(l.colocs).map((p, i) => <Chip key={i} person={p} />)}
            </div>
          </div>
          {l.dimensions && (
            <div className="bars">
              {dimLabels.map((d, i) => <BarRow key={d} label={d} value={l.dimensions![i] ?? 0} />)}
            </div>
          )}
        </div>
      ) : (
        <p className="soft mt">Pas encore de colocataire en place : pour ce logement, ton dossier vérifié suffit.</p>
      )}
    </Modal>
  )
}
