'use client'

import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { Note } from './primitives'
import { eurCents } from './format'
import { useToast } from './Toast'

interface Price { amount: number | null; available: boolean }

/**
 * Mise en avant d'une annonce : 1, 3 ou 7 jours, un seul paiement Stripe
 * (mBoost de la maquette). Montants lus dans Stripe ; sans prix configuré,
 * le bouton affiche « Bientôt disponible ».
 */
export function BoostModal({ open, onClose, listingId, label }: { open: boolean; onClose: () => void; listingId: string | null; label: string }) {
  const toast = useToast()
  const [days, setDays] = useState<1 | 3 | 7>(3)
  const [prices, setPrices] = useState<Record<string, Price> | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setDays(3)
    fetch('/api/prices').then(r => r.json()).then(setPrices).catch(() => setPrices({}))
  }, [open])

  const price = prices?.[`boost${days}`]
  const available = !!price?.available

  async function pay() {
    if (!listingId) return
    setBusy(true)
    const res = await fetch('/api/listings/boost-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId, days }),
    })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (res.ok && j.url) window.location.href = j.url
    else toast(j.error ?? 'La mise en avant sera bientôt disponible')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mettre ton annonce en avant"
      lead={`${label}. Choisis la durée, tu paies une seule fois.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          {available
            ? <Button variant="main" disabled={busy} onClick={pay}>Payer et mettre en avant</Button>
            : <Button variant="main" disabled>Bientôt disponible</Button>}
        </>
      }
    >
      <div className="opts mt">
        {([1, 3, 7] as const).map(n => {
          const p = prices?.[`boost${n}`]
          return (
            <button key={n} type="button" className="opt" aria-pressed={days === n} onClick={() => setDays(n)}>
              <b>{n} jour{n > 1 ? 's' : ''}</b>
              <span>{p?.amount != null ? eurCents(p.amount) : 'Tarif bientôt disponible'}</span>
            </button>
          )
        })}
      </div>
      <Note className="mt">La mise en avant démarre au paiement et s’arrête toute seule après {days} jour{days > 1 ? 's' : ''}.</Note>
    </Modal>
  )
}
