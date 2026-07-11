'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, Check } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useToast } from '@/hooks/use-toast'

interface Slot {
  id: string
  slot_date: string
  slot_time: string
  is_booked: boolean
}

/** Section "Planifier une visite" — page annonce, côté locataire. */
export default function VisitBooking({ listingId, ownerId, currentUserId }: {
  listingId: string
  ownerId: string | null
  currentUserId: string | null
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [booking, setBooking] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/visit-slots?listing_id=${listingId}`)
      if (res.ok) {
        const json = await res.json()
        setSlots((json.slots ?? []).map((s: Slot) => ({ ...s, slot_time: String(s.slot_time).slice(0, 5) })))
      }
    } catch {}
    setLoaded(true)
  }, [listingId])

  useEffect(() => { load() }, [load])

  const byDay = useMemo(() => {
    const map = new Map<string, Slot[]>()
    for (const s of slots) {
      const list = map.get(s.slot_date) ?? []
      list.push(s)
      map.set(s.slot_date, list)
    }
    return map
  }, [slots])

  const days = useMemo(() => Array.from(byDay.keys()).sort(), [byDay])

  // Le loueur ne réserve pas chez lui ; section masquée sans créneaux
  if (!loaded || days.length === 0 || (currentUserId && currentUserId === ownerId)) return null

  const freeOfDay = selectedDay ? (byDay.get(selectedDay) ?? []).filter(s => !s.is_booked) : []

  async function book() {
    if (!selectedSlot) return
    setBooking(true)
    try {
      const res = await fetch(`/api/visit-slots/${selectedSlot}/book`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        toast({ title: 'Visite réservée ✓', description: 'Un message a été envoyé au loueur.', duration: 3000 })
        if (json.conversationId) router.push('/app/messages')
        else load()
      } else {
        toast({ title: 'Impossible de réserver', description: json.error ?? 'Réessaie.', duration: 3500 })
        load()
      }
    } catch {
      toast({ title: 'Erreur réseau', duration: 3000 })
    }
    setBooking(false)
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '20px', padding: '20px', marginTop: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <CalendarClock size={18} color="#10B981" />
        <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>
          Planifier une visite
        </span>
      </div>

      {/* Jours */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {days.map(d => {
          const date = new Date(`${d}T12:00:00`)
          const free = (byDay.get(d) ?? []).some(s => !s.is_booked)
          const active = selectedDay === d
          return (
            <button
              key={d}
              onClick={() => { if (free) { setSelectedDay(active ? null : d); setSelectedSlot(null) } }}
              disabled={!free}
              style={{
                padding: '8px 14px', borderRadius: '12px', cursor: free ? 'pointer' : 'not-allowed',
                border: `1.5px solid ${active ? '#10B981' : free ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.08)'}`,
                background: active ? 'rgba(16,185,129,0.15)' : free ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
                color: active ? '#10B981' : free ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
                fontSize: '12.5px', fontWeight: 600, textAlign: 'center',
              }}
            >
              <div style={{ textTransform: 'capitalize' }}>{date.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
              <div style={{ fontSize: '15px', fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>{date.getDate()}</div>
              <div style={{ fontSize: '10px', opacity: 0.7 }}>{date.toLocaleDateString('fr-FR', { month: 'short' })}</div>
            </button>
          )
        })}
      </div>

      {/* Heures du jour sélectionné */}
      {selectedDay && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {freeOfDay.map(s => {
            const active = selectedSlot === s.id
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSlot(active ? null : s.id)}
                style={{
                  padding: '8px 16px', borderRadius: '10px', cursor: 'pointer',
                  border: `1.5px solid ${active ? '#10B981' : 'rgba(255,255,255,0.12)'}`,
                  background: active ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255,255,255,0.05)',
                  color: '#fff', fontSize: '13px', fontWeight: 700, fontFamily: "'Outfit', sans-serif",
                }}
              >
                {s.slot_time}
              </button>
            )
          })}
        </div>
      )}

      {selectedSlot && (
        <Button onClick={book} loading={booking} className="w-full">
          <Check size={15} /> Réserver ce créneau
        </Button>
      )}
    </div>
  )
}
