'use client'

import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { longDateTime } from './format'
import { useToast } from './Toast'

interface Slot {
  id: string
  slot_date: string
  slot_time: string
  is_booked: boolean
}

/**
 * Choix d'un créneau de visite proposé par le bailleur. Même calendrier que
 * l'existant (VisitBooking) : GET /api/visit-slots?listing_id, puis
 * POST /api/visit-slots/[id]/book, qui prévient la coloc dans la messagerie.
 */
export function VisitSlotsModal({
  open, onClose, listingId, other, onBooked,
}: {
  open: boolean
  onClose: () => void
  listingId: string | null
  /** true : « Proposer un autre créneau ». */
  other?: boolean
  onBooked?: () => void
}) {
  const toast = useToast()
  const [slots, setSlots] = useState<Slot[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !listingId) return
    setSlots(null)
    fetch(`/api/visit-slots?listing_id=${listingId}`)
      .then(r => (r.ok ? r.json() : { slots: [] }))
      .then(j => setSlots(((j.slots ?? []) as Slot[]).filter(s => !s.is_booked)))
      .catch(() => setSlots([]))
  }, [open, listingId])

  async function book(s: Slot) {
    setBusy(s.id)
    try {
      const res = await fetch(`/api/visit-slots/${s.id}/book`, { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast(j.error ?? 'Ce créneau n’est plus disponible')
        return
      }
      toast('Visite confirmée : la coloc est prévenue')
      onBooked?.()
      onClose()
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={other ? 'Proposer un autre créneau' : 'Confirmer ta visite'}
      lead="Choisis un créneau : la coloc le reçoit tout de suite."
    >
      <div className="stackv mt" style={{ gap: 10 }}>
        {slots === null && <p className="s">Chargement des créneaux…</p>}
        {slots && slots.length === 0 && (
          <p className="soft">Aucun créneau libre pour le moment. Écris à la coloc pour convenir d’un moment.</p>
        )}
        {slots?.map(s => (
          <button key={s.id} type="button" className="opt" disabled={!!busy} onClick={() => book(s)}>
            <b style={{ fontSize: 17 }}>{longDateTime(`${s.slot_date}T${String(s.slot_time).slice(0, 5)}:00`)}</b>
          </button>
        ))}
      </div>
    </Modal>
  )
}
