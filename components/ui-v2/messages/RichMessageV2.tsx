'use client'

import { Button } from '../Button'
import { Icon, Ico, Pill } from '../primitives'
import { eur, longDateTime } from '../format'

/**
 * Messages riches existants (visite, réservation, annonce, document) au
 * style de la maquette (.rich, .doc). Même comportement que
 * components/messages/RichMessage.tsx : le destinataire accepte ou refuse
 * tant que la proposition est en attente.
 */
export default function RichMessageV2({
  type, payload, isMe, onRespond, onCounter, establishLeaseHref,
}: {
  type: string
  payload: Record<string, unknown> | null
  isMe: boolean
  onRespond?: (status: 'accepted' | 'refused') => void
  onCounter?: () => void
  establishLeaseHref?: string | null
}) {
  const p = payload ?? {}
  const status = (p.status as string) ?? 'pending'
  const canRespond = !isMe && status === 'pending' && (type === 'visite' || type === 'reservation')

  if (type === 'annonce') {
    return (
      <a className="doc" href={`/app/annonce/${String(p.listing_id ?? '')}`} style={{ textDecoration: 'none', minWidth: 250 }}>
        <Ico name="building" tone="brand" size={20} />
        <span className="grow">
          <span className="t">{String(p.title ?? 'Logement')}</span>
          <span className="s">{[p.city ? String(p.city) : null, p.rent ? `${eur(Number(p.rent))} par mois` : null].filter(Boolean).join(', ')}</span>
        </span>
        <Icon name="chevron" size={18} />
      </a>
    )
  }

  if (type === 'document') {
    return (
      <div className="doc" style={{ minWidth: 250 }}>
        <span className="ico"><Icon name="doc" size={20} /></span>
        <span className="grow">
          <span className="t">{String(p.name ?? 'Document')}</span>
          <span className="s">Document</span>
        </span>
        <a className="iconbtn" href={String(p.url ?? '#')} target="_blank" rel="noreferrer" aria-label={`Télécharger ${String(p.name ?? 'le document')}`} style={{ width: 38, height: 38 }}>
          <Icon name="download" size={18} />
        </a>
      </div>
    )
  }

  const isVisite = type === 'visite'
  const when = isVisite && p.date ? longDateTime(`${String(p.date)}T${String(p.time ?? '00:00')}:00`) : ''
  return (
    <div className="rich">
      <div className="acts" style={{ gap: 10, marginBottom: 12, flexWrap: 'nowrap' }}>
        <Ico name={isVisite ? 'calendar' : 'contract'} tone="brand" size={20} />
        <span>
          <span className="t">{isVisite ? 'Proposition de visite' : 'Demande de réservation'}</span>
          <span className="s">
            {isVisite
              ? `${when}${p.mode === 'visio' ? ', en visio' : ''}`
              : [p.listing_title ? String(p.listing_title) : null, p.message ? String(p.message) : null].filter(Boolean).join('. ')}
          </span>
        </span>
      </div>
      {status === 'accepted' && <Pill tone="ok" icon="check">{isVisite ? 'Visite acceptée' : 'Réservation acceptée'}</Pill>}
      {status === 'refused' && <Pill tone="bad">{isVisite ? 'Visite refusée' : 'Réservation refusée'}</Pill>}
      {status === 'pending' && !canRespond && <Pill>En attente de réponse</Pill>}
      {canRespond && (
        <div className="acts">
          <Button variant="main" size="sm" onClick={() => onRespond?.('accepted')}>Accepter</Button>
          {isVisite && onCounter ? (
            <Button variant="glass" size="sm" onClick={onCounter}>Autre créneau</Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => onRespond?.('refused')}>Refuser</Button>
        </div>
      )}
      {type === 'reservation' && status === 'accepted' && !isMe && establishLeaseHref && (
        <Button variant="main" size="sm" href={establishLeaseHref} icon="contract" className="mt">Établir le bail</Button>
      )}
    </div>
  )
}
