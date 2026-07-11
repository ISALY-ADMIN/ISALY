'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

const HOURS = Array.from({ length: 13 }, (_, i) => 8 + i) // 8h → 20h
const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function mondayOf(offsetWeeks: number): Date {
  const now = new Date()
  const day = (now.getDay() + 6) % 7 // 0 = lundi
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + offsetWeeks * 7)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface SlotInfo { is_booked: boolean; id: string }

export default function CreneauxPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const listingId = params.id

  const [week, setWeek] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set()) // "YYYY-MM-DD|HH:00"
  const [booked, setBooked] = useState<Map<string, SlotInfo>>(new Map())
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState<string>('')

  const monday = useMemo(() => mondayOf(week), [week])
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  }), [monday])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/visit-slots?listing_id=${listingId}`)
      if (res.ok) {
        const { slots } = await res.json() as { slots: { id: string; slot_date: string; slot_time: string; is_booked: boolean }[] }
        const sel = new Set<string>()
        const bkd = new Map<string, SlotInfo>()
        for (const s of slots) {
          const key = `${s.slot_date}|${String(s.slot_time).slice(0, 5)}`
          if (s.is_booked) bkd.set(key, { is_booked: true, id: s.id })
          else sel.add(key)
        }
        setSelected(sel)
        setBooked(bkd)
      }
      const supabase = createClient()
      const { data: listing } = await supabase.from('listings').select('title').eq('id', listingId).single()
      if (listing?.title) setTitle(listing.title)
    } catch {}
    setLoading(false)
  }, [listingId])

  useEffect(() => { load() }, [load])

  function toggle(dateIso: string, hour: number) {
    const key = `${dateIso}|${String(hour).padStart(2, '0')}:00`
    if (booked.has(key)) return // créneau réservé : intouchable
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function save() {
    setSaving(true)
    try {
      const slots = Array.from(selected).map(key => {
        const [slot_date, slot_time] = key.split('|')
        return { slot_date, slot_time }
      })
      const res = await fetch('/api/visit-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, slots }),
      })
      if (res.ok) {
        toast({ title: 'Disponibilités enregistrées ✓', duration: 2500 })
      } else {
        const j = await res.json().catch(() => ({}))
        toast({ title: 'Erreur', description: j.error ?? 'Impossible d’enregistrer', duration: 3500 })
      }
    } catch {
      toast({ title: 'Erreur réseau', duration: 3000 })
    }
    setSaving(false)
  }

  const todayIso = iso(new Date())
  const weekLabel = `${days[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${days[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      <Topbar title="Créneaux de visite" />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 20px 48px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div>
            <button
              onClick={() => router.push('/app/mes-annonces')}
              className="border-none bg-transparent cursor-pointer p-0 flex items-center gap-1"
              style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12.5px', marginBottom: '6px' }}
            >
              <ChevronLeft size={14} /> Mes annonces
            </button>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: 700, color: '#fff', margin: 0 }}>
              Gérer les créneaux {title ? <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>· {title}</span> : ''}
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '6px 0 0' }}>
              Clique sur les cases pour ouvrir des créneaux de visite. Les locataires pourront les réserver depuis l&apos;annonce.
            </p>
          </div>
          <Button onClick={save} loading={saving} disabled={loading}>
            <Check size={15} /> Enregistrer les disponibilités
          </Button>
        </div>

        {/* Navigation semaine */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
          <button
            onClick={() => setWeek(w => Math.max(0, w - 1))}
            disabled={week === 0}
            className="border-none cursor-pointer rounded-full flex items-center justify-center"
            style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', color: week === 0 ? 'rgba(255,255,255,0.2)' : '#fff' }}
            aria-label="Semaine précédente"
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif", minWidth: 160, textAlign: 'center' }}>
            {weekLabel}
          </span>
          <button
            onClick={() => setWeek(w => Math.min(8, w + 1))}
            className="border-none cursor-pointer rounded-full flex items-center justify-center"
            style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', color: '#fff' }}
            aria-label="Semaine suivante"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Grille */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', padding: '16px', overflowX: 'auto',
        }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13.5px' }}>Chargement…</div>
          ) : (
            <div style={{ minWidth: 620 }}>
              {/* En-têtes jours */}
              <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
                <div />
                {days.map((d, i) => {
                  const isPast = iso(d) < todayIso
                  return (
                    <div key={i} style={{ textAlign: 'center', padding: '6px 0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: isPast ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.55)' }}>
                        {DAY_LABELS[i]}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: iso(d) === todayIso ? '#10B981' : isPast ? 'rgba(255,255,255,0.25)' : '#fff' }}>
                        {d.getDate()}
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* Lignes heures */}
              {HOURS.map(h => (
                <div key={h} style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' }}>
                    {h}h
                  </div>
                  {days.map((d, i) => {
                    const dateIso = iso(d)
                    const key = `${dateIso}|${String(h).padStart(2, '0')}:00`
                    const isPast = dateIso < todayIso
                    const isBooked = booked.has(key)
                    const isSelected = selected.has(key)
                    return (
                      <button
                        key={i}
                        onClick={() => !isPast && toggle(dateIso, h)}
                        disabled={isPast || isBooked}
                        title={isBooked ? 'Créneau réservé' : isSelected ? 'Cliquer pour retirer' : 'Cliquer pour ouvrir'}
                        style={{
                          height: 30, borderRadius: '8px', border: 'none',
                          cursor: isPast || isBooked ? 'not-allowed' : 'pointer',
                          background: isBooked
                            ? 'rgba(245,158,11,0.25)'
                            : isSelected
                              ? 'linear-gradient(135deg, #10B981, #059669)'
                              : isPast ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                          outline: isBooked ? '1px solid rgba(245,158,11,0.5)' : 'none',
                          transition: 'background 0.15s',
                          fontSize: '10px', fontWeight: 800, color: isBooked ? '#F59E0B' : 'transparent',
                        }}
                      >
                        {isBooked ? '●' : ''}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Légende */}
        <div style={{ display: 'flex', gap: '18px', justifyContent: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
          <Legend color="linear-gradient(135deg, #10B981, #059669)" label="Disponible" />
          <Legend color="rgba(245,158,11,0.35)" label="Réservé" />
          <Legend color="rgba(255,255,255,0.05)" label="Fermé" />
        </div>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
      <span style={{ width: 16, height: 16, borderRadius: '5px', background: color, display: 'inline-block' }} />
      {label}
    </span>
  )
}
