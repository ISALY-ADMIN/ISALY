'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { PartnerAgency } from '@/lib/managementMode'
import {
  Bubble, Button, Constellation, EmptyState, Icon, Ico, Meter, Panel, Pill, Ring,
  SkelScreen, dayMonth, eur, longDateTime, NBSP, NNBSP, pc, personColor, plural,
} from '@/components/ui-v2'
import { ListingCard, colocPeople, placeOf, type CardListing } from '@/components/ui-v2/ListingCard'
import { DeposeModal } from '@/components/ui-v2/DeposeModal'
import { VisitSlotsModal } from '@/components/ui-v2/VisitSlotsModal'

interface Mate { id: string; firstName: string; avatarUrl: string | null; score: number | null }
interface Req extends CardListing {
  listingId: string
  ownerId: string | null
  status: 'pending' | 'accepted' | 'rejected' | 'waitlisted' | 'visit_proposed'
  visit: { slotId: string; date: string; time: string } | null
}
interface Overview {
  firstName: string
  profileCreated: boolean
  testDone: boolean
  installed: boolean
  lease: {
    id: string
    address: string
    city: string
    ownerId: string
    ownerFirstName: string
    monthlyRent: number
    charges: number
    mates: Mate[]
    conversationId: string | null
    management: { mode: 'autogestion' | 'delegue' | null; agency: PartnerAgency | null }
  } | null
  quota: { used: number; limit: number; plus: boolean }
  dossier: { items: { key: string; label: string; state: string }[]; done: number; total: number }
  isalyScore: number | null
  requests: Req[]
  suggestions: CardListing[]
  nextRent: { month: string; amount: number; status: string; due_date?: string | null } | null
  openIssue: { id: string; title: string; status: string; comment: string | null } | null
  lastMessages: { id: string; senderId: string; content: string; createdAt: string }[]
}

const names = (list: { firstName: string }[]) => {
  const n = list.map(m => m.firstName)
  if (n.length <= 1) return n.join('')
  return `${n.slice(0, -1).join(', ')} et ${n[n.length - 1]}`
}

const MONTHS_DE = ['de janvier', 'de février', 'de mars', 'd’avril', 'de mai', 'de juin', 'de juillet', 'd’août', 'de septembre', 'd’octobre', 'de novembre', 'de décembre']

export default function TenantDashboard() {
  const router = useRouter()
  const [d, setD] = useState<Overview | null>(null)
  const [error, setError] = useState(false)
  const [depose, setDepose] = useState(false)
  const [slotFor, setSlotFor] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/v2/locataire', { cache: 'no-store' })
      if (res.status === 401) {
        router.push('/auth/login')
        return
      }
      if (!res.ok) throw new Error(String(res.status))
      setD((await res.json()) as Overview)
      setError(false)
    } catch {
      setError(true)
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  // Temps réel, comme l'ancien tableau de bord : nouveaux messages et
  // notifications relancent le chargement (callbacks posés avant subscribe).
  useEffect(() => {
    const supabase = createClient()
    let t: ReturnType<typeof setTimeout> | null = null
    const refetch = () => {
      if (t) clearTimeout(t)
      t = setTimeout(load, 800)
    }
    const channel = supabase
      .channel(`v2-tenant-dash:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, refetch)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, refetch)
      .subscribe()
    return () => {
      if (t) clearTimeout(t)
      supabase.removeChannel(channel)
    }
  }, [load])

  if (error && !d) {
    return (
      <EmptyState
        icon="alert"
        tone="bad"
        title="Ton tableau de bord n’a pas pu se charger"
        text="Vérifie ta connexion puis réessaie."
        actions={<Button variant="main" onClick={load}>Réessayer</Button>}
      />
    )
  }
  if (!d) return <SkelScreen />

  const openListing = (id: string) => router.push(`/app/annonce/${id}`)

  return (
    <div className="screen">
      {d.installed && d.lease ? (
        <HomeState d={d} onDepose={() => setDepose(true)} />
      ) : (
        <SearchState d={d} onDepose={() => setDepose(true)} onConfirm={id => setSlotFor(id)} onOpen={openListing} />
      )}
      <DeposeModal open={depose} onClose={() => setDepose(false)} />
      <VisitSlotsModal open={!!slotFor} listingId={slotFor} onClose={() => setSlotFor(null)} onBooked={load} />
    </div>
  )
}

/* ── En recherche ─────────────────────────────────────────────────── */
function SearchState({ d, onDepose, onConfirm, onOpen }: { d: Overview; onDepose: () => void; onConfirm: (listingId: string) => void; onOpen: (id: string) => void }) {
  const booked = d.requests.find(r => r.visit && new Date(`${r.visit.date}T${r.visit.time}`).getTime() > Date.now())
  const proposed = d.requests.find(r => r.status === 'visit_proposed' && !r.visit)
  const focus = booked ?? proposed ?? d.requests.find(r => r.colocs.length) ?? null
  const n85 = d.suggestions.filter(s => (s.score ?? 0) >= 85).length
  const visitWhen = booked?.visit ? longDateTime(`${booked.visit.date}T${booked.visit.time}:00`) : null

  const tail = n85
    ? `${n85} ${plural(n85, 'annonce compatible', 'annonces compatibles')} à 85${NNBSP}% ou plus ${plural(n85, 't’attend', 't’attendent')}`
    : ''
  let sentence: string
  if (booked && visitWhen) sentence = `Ta visite à ${placeOf(booked)} est confirmée pour ${visitWhen.charAt(0).toLowerCase()}${visitWhen.slice(1)}${tail ? `, et ${tail}` : ''}.`
  else if (proposed) sentence = `Une visite t’est proposée à ${placeOf(proposed)}${tail ? `, et ${tail}` : ''}.`
  else if (tail) sentence = `${tail.charAt(0).toUpperCase()}${tail.slice(1)}.`
  else sentence = 'Swipe les annonces du moment pour trouver la coloc qui te ressemble.'

  const missing = d.dossier.items.find(i => i.state === 'missing' || i.state === 'rejected')
  const steps: { t: string; done: boolean; s?: string; action?: { label: string; href?: string; onClick?: () => void } }[] = [
    { t: 'Créer ton profil', done: d.profileCreated, action: { label: 'Compléter', href: '/app/profil' } },
    { t: 'Faire le test de compatibilité', done: d.testDone, action: { label: 'Faire le test', href: '/app/quiz' } },
    {
      t: 'Compléter ton dossier',
      done: d.dossier.total > 0 && d.dossier.done === d.dossier.total,
      s: missing ? `Il manque : ${missing.label.charAt(0).toLowerCase()}${missing.label.slice(1)}.` : 'Des pièces sont en cours de vérification.',
      action: { label: 'Ajouter', href: '/app/profil?section=dossier' },
    },
  ]
  if (proposed || booked) {
    const r = (proposed ?? booked)!
    steps.push({
      t: 'Confirmer ta visite',
      done: !!booked && !proposed,
      s: `${r.title}.`,
      action: { label: 'Confirmer', onClick: () => onConfirm(r.listingId) },
    })
  }
  const done = steps.filter(s => s.done).length
  const left = Math.max(0, d.quota.limit - d.quota.used)
  const count = (f: (r: Req) => boolean) => d.requests.filter(f).length

  return (
    <>
      <div className="hello">
        <div>
          <h2>Bonjour {d.firstName || 'toi'}</h2>
          <p>{sentence}</p>
        </div>
        <div className="acts">
          <Button variant="main" href="/app/swipe" icon="cards">Continuer à swiper</Button>
          <Button variant="glass" icon="plus" onClick={onDepose}>Déposer une annonce</Button>
        </div>
      </div>

      <div className="v-grid wide-l">
        {focus ? (
          <section className="panel constel">
            <div className="info">
              <div className="chips">
                {booked?.visit ? (
                  <Pill tone="brand" icon="calendar">Visite {longDateTime(`${booked.visit.date}T${booked.visit.time}:00`).toLowerCase()}</Pill>
                ) : proposed ? (
                  <Pill tone="brand" icon="calendar">Visite proposée</Pill>
                ) : (
                  <Pill tone="info" icon="send">Demande envoyée</Pill>
                )}
              </div>
              <h3>{placeOf(focus)}</h3>
              <p>
                {focus.colocs.length ? `${names(focus.colocs)} ${focus.colocs.length > 1 ? 't’attendent' : 't’attend'}. ` : ''}
                {focus.score != null && <>Ta compatibilité avec la coloc : <b>{pc(focus.score)}</b>.</>}
              </p>
              <div className="acts mt">
                <Button variant="glass" size="sm" onClick={() => onOpen(focus.listingId)}>Voir l’annonce</Button>
                {focus.ownerId && (
                  <Button variant="ghost" size="sm" icon="chat" href={`/app/messages?owner=${focus.ownerId}&listing=${focus.listingId}`}>Écrire à la coloc</Button>
                )}
              </div>
            </div>
            {focus.colocs.length > 0 && (
              <Constellation people={colocPeople(focus.colocs)} label={`Ta compatibilité avec ${names(focus.colocs)}`} />
            )}
          </section>
        ) : (
          <EmptyState
            icon="compass"
            title="Pas encore de coloc en vue"
            text="Swipe les annonces compatibles : la coloc que tu choisis apparaîtra ici avec ta compatibilité avec chacun."
            actions={<Button variant="main" href="/app/swipe">Trouver une coloc</Button>}
          />
        )}

        <div className="stackv">
          <Panel title="Tes prochaines étapes" action={<span className="pill">{done} sur {steps.length}</span>}>
            <Meter value={(done / steps.length) * 100} style={{ marginBottom: 6 }} />
            <div className="checks">
              {steps.map(s => (
                <div key={s.t} className={s.done ? 'check done' : 'check'}>
                  <span className="box"><Icon name="check" /></span>
                  <span className="grow">
                    <span className="t">{s.t}</span>
                    {!s.done && s.s && <span className="s">{s.s}</span>}
                  </span>
                  {!s.done && s.action && (
                    s.action.href
                      ? <Button variant="glass" size="sm" href={s.action.href}>{s.action.label}</Button>
                      : <Button variant="glass" size="sm" onClick={s.action.onClick}>{s.action.label}</Button>
                  )}
                </div>
              ))}
            </div>
          </Panel>
          {d.quota.plus ? (
            <Panel title="Swipes du jour" action={<Pill tone="brand" icon="spark">Swiper Plus</Pill>}>
              <div className="acts" style={{ gap: 16, flexWrap: 'nowrap' }}>
                <Ring value={1} max={1} size={112}><b>∞</b><small>sans limite</small></Ring>
                <p className="soft">Pas de limite quotidienne, et tes demandes passent en priorité.</p>
              </div>
            </Panel>
          ) : (
            <Panel title="Swipes du jour" action={<a className="link" href="/app/paiement">Swiper Plus</a>}>
              <div className="acts" style={{ gap: 16, flexWrap: 'nowrap' }}>
                <Ring value={left} max={d.quota.limit} size={112}><b className="num">{left}</b><small>sur {d.quota.limit}</small></Ring>
                <p className="soft">Tes {d.quota.limit} swipes reviennent chaque jour. Avec Swiper Plus, plus de limite.</p>
              </div>
            </Panel>
          )}
        </div>
      </div>

      <div className="v-grid g2 mt">
        <Panel title="Tes demandes" action={<a className="link" href="/app/demandes">Tout voir</a>}>
          <div className="rows">
            <div className="row"><Ico name="send" tone="info" /><span className="grow"><span className="t">En attente de réponse</span></span><b className="num">{count(r => r.status === 'pending' || r.status === 'waitlisted')}</b></div>
            <div className="row"><Ico name="calendar" tone="brand" /><span className="grow"><span className="t">Visite proposée</span></span><b className="num">{count(r => r.status === 'visit_proposed')}</b></div>
            <div className="row"><Ico name="check" /><span className="grow"><span className="t">Réponse reçue</span></span><b className="num">{count(r => r.status === 'accepted' || r.status === 'rejected')}</b></div>
          </div>
        </Panel>
        <ScorePanel score={d.isalyScore} text={missing ? 'Ajoute la pièce manquante de ton dossier pour gagner des points et rassurer les colocs.' : 'Réponds vite à tes messages et confirme tes visites pour faire monter ton score.'} />
      </div>

      <div className="mt">
        <section>
          <div className="phead">
            <h2>D’autres colocs faites pour toi</h2>
            <a className="link" href="/app/swipe?vue=liste">Tout voir</a>
          </div>
          {d.suggestions.length ? (
            <div className="hlist">
              {d.suggestions.slice(0, 3).map(l => <ListingCard key={l.id} l={l} onOpen={onOpen} />)}
            </div>
          ) : (
            <p className="soft">Tu as vu toutes les annonces du moment.</p>
          )}
        </section>
      </div>
    </>
  )
}

function ScorePanel({ score, text }: { score: number | null; text: string }) {
  return (
    <Panel title="ISALY Score" action={<a className="link" href="/app/profil">Détail</a>}>
      <div className="acts" style={{ gap: 16, flexWrap: 'nowrap' }}>
        <Ring value={score ?? 0} max={100} size={112}>
          <b className="num">{score ?? '-'}</b>
          <small>sur 100</small>
        </Ring>
        <p className="soft">{text}</p>
      </div>
    </Panel>
  )
}

/* ── Installé ─────────────────────────────────────────────────────── */
export function AgencyRows({ agency }: { agency: PartnerAgency }) {
  return (
    <div className="rows">
      <div className="row"><Ico name="building" tone="warn" /><span className="grow"><span className="t">{agency.name}</span><span className="s">Agence partenaire d’ISALY</span></span></div>
      {agency.phone && (
        <div className="row"><Ico name="phone" /><span className="grow"><a className="t" href={`tel:${agency.phone.replace(/\s/g, '')}`} style={{ textDecoration: 'none' }}>{agency.phone}</a>{agency.opening_hours && <span className="s">{agency.opening_hours}</span>}</span></div>
      )}
      {agency.email && (
        <div className="row"><Ico name="mail" /><span className="grow"><a className="t" href={`mailto:${agency.email}`} style={{ textDecoration: 'none' }}>{agency.email}</a><span className="s">Réponse sous 48 h ouvrées</span></span></div>
      )}
      {agency.address && (
        <div className="row"><Ico name="pin" /><span className="grow"><span className="t">{agency.address}</span></span></div>
      )}
    </div>
  )
}

function HomeState({ d, onDepose }: { d: Overview; onDepose: () => void }) {
  const lease = d.lease!
  const agency = lease.management.mode === 'delegue'
  const people = useMemo(() => lease.mates.map(m => ({ n: m.firstName, c: personColor(m.id), s: m.score, avatar: m.avatarUrl })), [lease.mates])
  const due = d.nextRent ? new Date(d.nextRent.due_date ?? d.nextRent.month) : null
  const rentTotal = d.nextRent?.amount ?? lease.monthlyRent + lease.charges
  let sentence: string
  if (agency) {
    sentence = `Ton logement est géré par ${lease.management.agency?.name ?? 'une agence partenaire'}. Pour le loyer et les réparations, c’est elle que tu contactes.`
  } else {
    const parts: string[] = []
    if (due && d.nextRent) parts.push(`Ton loyer ${MONTHS_DE[new Date(d.nextRent.month).getMonth()]} est attendu le ${dayMonth(due)}`)
    if (d.openIssue) parts.push(`ton signalement « ${d.openIssue.title} » est en cours`)
    sentence = parts.length ? `${parts.join(', et ')}.` : 'Tout est à jour dans ta coloc.'
  }
  const convHref = lease.conversationId ? `/app/messages?conversation=${lease.conversationId}` : '/app/messages'
  const mateById = new Map(lease.mates.map(m => [m.id, m]))

  return (
    <>
      <div className="hello">
        <div>
          <h2>Bonjour {d.firstName || 'toi'}</h2>
          <p>{sentence}</p>
        </div>
        <div className="acts">
          <Button variant="main" href="/app/maison" icon="house">Ouvrir Ma maison</Button>
          <Button variant="glass" icon="plus" onClick={onDepose}>Déposer une annonce</Button>
        </div>
      </div>

      <div className="v-grid wide-l">
        <section className="panel constel">
          <div className="info">
            <div className="chips">
              {agency ? <Pill tone="warn">Géré par une agence partenaire</Pill> : <Pill tone="brand">Géré avec ISALY</Pill>}
            </div>
            <h3>{[lease.address, lease.city].filter(Boolean).join(', ')}</h3>
            <p>{lease.mates.length ? `Ta colocation avec ${names(lease.mates)}.` : 'Ta colocation.'}</p>
            <div className="acts mt">
              <Button variant="glass" size="sm" icon="chat" href={convHref}>Écrire à la coloc</Button>
            </div>
          </div>
          {people.length > 0 && <Constellation people={people} label="Ta compatibilité avec tes colocataires" />}
        </section>

        {agency && lease.management.agency ? (
          <Panel title="Ton agence"><AgencyRows agency={lease.management.agency} /></Panel>
        ) : (
          <div className="stackv">
            <Panel title="Prochain loyer" action={due ? <Pill tone={d.nextRent?.status === 'late' ? 'bad' : 'info'}>Avant le {dayMonth(due)}</Pill> : undefined}>
              <div className="big num">{eur(rentTotal)}</div>
              <p className="s" style={{ marginTop: 4 }}>
                Loyer {eur(lease.monthlyRent)} et charges {eur(lease.charges)}, à régler à {lease.ownerFirstName} selon ton bail.
              </p>
            </Panel>
            {d.openIssue ? (
              <Panel title="Signalement en cours" action={<Pill tone={d.openIssue.status === 'in_progress' ? 'warn' : 'bad'}>{d.openIssue.status === 'in_progress' ? 'En cours' : 'Ouvert'}</Pill>}>
                <span className="t">{d.openIssue.title}</span>
                {d.openIssue.comment && <span className="s">{lease.ownerFirstName}{NBSP}: {d.openIssue.comment}</span>}
                <div className="acts mt">
                  <Button variant="glass" size="sm" href="/app/maison?onglet=signalements">Suivre le signalement</Button>
                </div>
              </Panel>
            ) : (
              <Panel title="Signalements">
                <p className="soft">Aucun signalement en cours.</p>
                <div className="acts mt">
                  <Button variant="glass" size="sm" href="/app/maison?onglet=signalements">Signaler un problème</Button>
                </div>
              </Panel>
            )}
          </div>
        )}
      </div>

      <div className="v-grid g2 mt">
        <Panel title="Dans ta coloc" action={<a className="link" href={convHref}>Ouvrir</a>}>
          {d.lastMessages.length ? (
            <div className="rows">
              {d.lastMessages.map(m => {
                const mate = mateById.get(m.senderId)
                const isOwner = m.senderId === lease.ownerId
                const name = mate?.firstName ?? (isOwner ? lease.ownerFirstName : 'Toi')
                return (
                  <div key={m.id} className="row">
                    <Bubble name={name} color={mate ? personColor(mate.id) : '#48437A'} size={36} avatar={mate?.avatarUrl} />
                    <span className="grow"><span className="t">{name}</span><span className="s">{m.content}</span></span>
                    <span className="s">{new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="soft">Pas encore de message dans le fil de la coloc.</p>
          )}
        </Panel>
        <ScorePanel score={d.isalyScore} text="Loyer réglé à l’heure et dossier complet : ton score monte." />
      </div>
    </>
  )
}
