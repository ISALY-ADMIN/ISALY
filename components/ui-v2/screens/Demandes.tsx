'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Art, Button, EmptyState, Ico, Note, Panel, Pill, SkelPanel, eur, longDateTime, pc, useToast,
} from '@/components/ui-v2'
import { placeOf } from '@/components/ui-v2/ListingCard'
import { VisitSlotsModal } from '@/components/ui-v2/VisitSlotsModal'

interface Req {
  id: string
  listingId: string
  ownerId: string | null
  title: string
  city: string
  neighborhood: string | null
  rent: number
  charges: number
  photo: string | null
  status: 'pending' | 'accepted' | 'rejected' | 'waitlisted' | 'visit_proposed'
  appliedAt: string | null
  visit: { slotId: string; date: string; time: string } | null
  score: number | null
  colocs: { firstName: string }[]
  priority: boolean
}

const STEPS = ['Envoyée', 'Vue par la coloc', 'Visite', 'Réponse']

/** Étape courante de la frise (1 à 4), 5 quand tout est fait. */
function stepOf(r: Req): { st: number; no: boolean; confirmed: boolean } {
  if (r.status === 'rejected') return { st: 4, no: true, confirmed: false }
  if (r.status === 'accepted') return { st: 5, no: false, confirmed: !!r.visit }
  if (r.visit) return { st: 4, no: false, confirmed: true }
  if (r.status === 'visit_proposed') return { st: 3, no: false, confirmed: false }
  if (r.status === 'waitlisted') return { st: 2, no: false, confirmed: false }
  return { st: 1, no: false, confirmed: false }
}

const visitDate = (v: Req['visit']) => (v ? new Date(`${v.date}T${v.time}:00`) : null)

function icsFor(r: Req): string {
  const d = visitDate(r.visit)!
  const end = new Date(d.getTime() + 30 * 60000)
  const f = (x: Date) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ISALY//Visites//FR', 'BEGIN:VEVENT',
    `UID:${r.id}@isaly.fr`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(d)}`, `DTEND:${f(end)}`,
    `SUMMARY:Visite de la coloc ${placeOf(r)}`, `LOCATION:${placeOf(r)}`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
}

export default function Demandes() {
  const router = useRouter()
  const toast = useToast()
  const [data, setData] = useState<{ requests: Req[]; plus: boolean } | null>(null)
  const [error, setError] = useState(false)
  const [slotFor, setSlotFor] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/v2/demandes', { cache: 'no-store' })
      if (res.status === 401) return router.push('/auth/login')
      if (!res.ok) throw new Error()
      setData(await res.json())
      setError(false)
    } catch {
      setError(true)
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  const visits = useMemo(
    () => (data?.requests ?? []).filter(r => r.visit && visitDate(r.visit)!.getTime() > Date.now() - 3600000)
      .sort((a, b) => visitDate(a.visit)!.getTime() - visitDate(b.visit)!.getTime()),
    [data],
  )

  async function cancel(r: Req) {
    const res = await fetch(`/api/v2/demandes?id=${r.id}`, { method: 'DELETE' })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) return toast(j.error ?? 'La demande n’a pas pu être annulée')
    toast('Demande annulée')
    load()
  }

  function addToAgenda() {
    const r = visits[0]
    if (!r) return
    const blob = new Blob([icsFor(r)], { type: 'text/calendar' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'visite-isaly.ics'
    a.click()
    URL.revokeObjectURL(a.href)
    toast('Visite ajoutée à ton agenda')
  }

  if (error && !data) {
    return <EmptyState icon="alert" tone="bad" title="Tes demandes n’ont pas pu se charger" text="Vérifie ta connexion puis réessaie." actions={<Button variant="main" onClick={load}>Réessayer</Button>} />
  }
  if (!data) {
    return <div className="v-grid wide-l"><div className="stackv"><SkelPanel lines={3} /><SkelPanel lines={3} /></div><SkelPanel lines={6} /></div>
  }

  return (
    <div className="screen">
      <div className="v-grid wide-l">
        <div className="stackv">
          {data.requests.length === 0 && (
            <EmptyState icon="send" title="Aucune demande pour le moment"
              text="Swipe à droite une annonce, ou envoie une demande depuis sa fiche : tu suivras ici chaque étape jusqu’à la réponse."
              actions={<Button variant="main" href="/app/swipe">Trouver une coloc</Button>} />
          )}
          {data.requests.map(r => {
            const { st, no, confirmed } = stepOf(r)
            const v = visitDate(r.visit)
            let act: React.ReactNode
            if (r.status === 'visit_proposed' && !r.visit) {
              act = (
                <>
                  <Button variant="main" size="sm" onClick={() => setSlotFor(r.listingId)}>Confirmer la visite</Button>
                  {r.ownerId && <Button variant="glass" size="sm" href={`/app/messages?owner=${r.ownerId}&listing=${r.listingId}`}>Autre créneau</Button>}
                </>
              )
            } else if (confirmed && r.status !== 'accepted') {
              act = <Pill tone="ok" icon="check">Visite confirmée</Pill>
            } else if (no) {
              act = <Button variant="glass" size="sm" href="/app/swipe">Voir d’autres annonces</Button>
            } else if (r.status === 'accepted') {
              act = <Pill tone="ok" icon="check">Dossier accepté</Pill>
            } else if (r.status === 'pending') {
              act = <Button variant="ghost" size="sm" onClick={() => cancel(r)}>Annuler la demande</Button>
            }
            return (
              <article key={r.id} className="panel req">
                <Art id={r.listingId} photo={r.photo} className="thumb" />
                <div className="grow">
                  <div className="acts" style={{ gap: 8 }}>
                    <span className="t">{placeOf(r)}</span>
                    {r.priority && <Pill tone="brand" icon="spark">Prioritaire</Pill>}
                  </div>
                  <span className="s">
                    {eur(r.rent + r.charges)} par mois{r.score != null ? `, ${pc(r.score)} avec la coloc` : ''}
                    {v ? `. ${longDateTime(v)}.` : ''}
                  </span>
                </div>
                <div className="acts">{act}</div>
                <ol className="steps" aria-label="Avancement de la demande">
                  {STEPS.map((s, i) => {
                    const n = i + 1
                    let c = n < st ? 'done' : n === st ? 'now' : ''
                    let t = s
                    if (no && n === 3) { c = ''; t = 'Pas de visite' }
                    if (no && n === 4) { c = 'no'; t = 'Refusée' }
                    return <li key={s} className={c}><i />{t}</li>
                  })}
                </ol>
              </article>
            )
          })}
        </div>

        <div className="stackv">
          <Panel title="Tes visites">
            <Calendar events={visits.map(r => visitDate(r.visit)!)} />
            <div className="hr" />
            {visits.length ? (
              <div className="rows">
                {visits.map(r => (
                  <div key={r.id} className="row">
                    <Ico name="calendar" tone="brand" />
                    <span className="grow">
                      <span className="t">{longDateTime(visitDate(r.visit))}</span>
                      <span className="s">{r.title}{r.colocs.length ? `, avec ${r.colocs.map(c => c.firstName).join(', ')}` : ''}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="s">Aucune visite prévue pour le moment.</p>
            )}
            {visits.length > 0 && <Button variant="glass" size="sm" className="mt" onClick={addToAgenda}>Ajouter à mon agenda</Button>}
          </Panel>
          {!data.plus && (
            <Note icon="spark">
              <b>Passe devant.</b> Avec Swiper Plus, tes demandes arrivent en priorité chez les colocs. <a className="link" href="/app/paiement">Découvrir</a>
            </Note>
          )}
        </div>
      </div>
      <VisitSlotsModal open={!!slotFor} listingId={slotFor} onClose={() => setSlotFor(null)} onBooked={load} />
    </div>
  )
}

/** Deux semaines à partir du lundi de la semaine en cours. */
function Calendar({ events }: { events: Date[] }) {
  const days = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const cells = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
  const has = (d: Date) => events.some(e => e.toDateString() === d.toDateString())
  return (
    <div className="cal" aria-label="Calendrier des deux prochaines semaines">
      {days.map(d => <span key={d}>{d}</span>)}
      {cells.map(d => {
        const cls = has(d) ? 'ev' : d.getTime() === today.getTime() ? 'today' : d < today ? 'muted' : ''
        return <b key={d.toISOString()} className={cls}>{d.getDate()}</b>
      })}
    </div>
  )
}
