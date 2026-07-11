'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { X, CalendarClock, MapPin } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Visit {
  id: string
  slot_date: string
  slot_time: string
  role: 'loueur' | 'locataire'
  otherName: string | null
  otherAvatar: string | null
  listingTitle: string | null
  listingCity: string | null
}

/** Drawer "Agenda" — visites à venir (messages). */
export default function AgendaPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast()
  const [visits, setVisits] = useState<Visit[]>([])
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/visit-slots?mine=1')
      if (res.ok) {
        const json = await res.json()
        setVisits((json.visits ?? []).map((v: Visit) => ({ ...v, slot_time: String(v.slot_time).slice(0, 5) })))
      }
    } catch {}
    setLoaded(true)
  }, [])

  useEffect(() => { if (open) load() }, [open, load])

  async function cancel(id: string) {
    setVisits(prev => prev.filter(v => v.id !== id))
    const res = await fetch(`/api/visit-slots/${id}/book`, { method: 'DELETE' }).catch(() => null)
    if (res?.ok) toast({ title: 'Visite annulée', duration: 2500 })
    else load()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-hidden"
            style={{ width: 'min(380px, 92vw)', background: '#111111', boxShadow: '-8px 0 32px rgba(0,0,0,0.4)' }}
          >
            <div className="flex items-center justify-between flex-shrink-0" style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CalendarClock size={18} color="#10B981" />
                <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '17px', fontWeight: 700, color: '#fff' }}>Agenda des visites</span>
              </div>
              <button
                onClick={onClose}
                aria-label="Fermer"
                className="flex items-center justify-center border-none cursor-pointer rounded-full"
                style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ padding: '16px 20px' }}>
              {!loaded ? (
                <div style={{ padding: '40px 0', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Chargement…</div>
              ) : visits.length === 0 ? (
                <div style={{ padding: '48px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>📅</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Aucune visite planifiée</div>
                  <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                    Les visites réservées apparaîtront ici.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {visits.map(v => {
                    const date = new Date(`${v.slot_date}T${v.slot_time}`)
                    return (
                      <div key={v.id} style={{
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '14px', padding: '14px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          {v.otherAvatar ? (
                            <Image src={v.otherAvatar} alt="" width={34} height={34} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{
                              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                              background: 'linear-gradient(135deg, #10B981, #059669)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontSize: '13px', fontWeight: 800,
                            }}>{v.otherName?.[0] ?? '?'}</div>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff' }}>
                              {v.role === 'loueur' ? `Visite de ${v.otherName ?? 'un locataire'}` : `Visite chez ${v.otherName ?? 'le loueur'}`}
                            </div>
                            {v.listingTitle && (
                              <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                <MapPin size={10} /> {v.listingTitle}{v.listingCity ? ` · ${v.listingCity}` : ''}
                              </div>
                            )}
                          </div>
                          <span style={{
                            fontSize: '10.5px', fontWeight: 800, padding: '4px 9px', borderRadius: '14px', flexShrink: 0,
                            background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.35)',
                          }}>
                            Confirmée
                          </span>
                        </div>
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                          background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
                          borderRadius: '10px', padding: '9px 12px',
                        }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#10B981', textTransform: 'capitalize' }}>
                            {date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {v.slot_time}
                          </span>
                          <button
                            onClick={() => cancel(v.id)}
                            className="border-none cursor-pointer bg-transparent p-0"
                            style={{ fontSize: '11.5px', fontWeight: 600, color: '#EF4444' }}
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
