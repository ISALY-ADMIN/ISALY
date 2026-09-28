'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Home, Room } from '@/lib/v2/owner'
import {
  Bubble, Button, EmptyState, Icon, Ico, Note, Panel, Pill, SkelScreen, dayMonth, eur, monthYear, pc, personColor, plural, useToast,
  type Tone,
} from '@/components/ui-v2'
import type { IconName } from '@/components/ui-v2/icons'

interface Data {
  firstName: string
  homes: Home[]
  autogestion: { required: boolean; active: boolean; periodEnd: string | null }
  newCandidatures: number
  newCandListing: string | null
  toChoose: { id: string; listingId: string; name: string }[]
  maintenance: { id: string; title: string; status: string; createdAt: string; leaseId: string; by: string }[]
  perf: { listingId: string; title: string; days: { label: string; views: number; likes: number }[]; totals: { views: number; likes: number; requests: number } } | null
}

export function homeLabel(h: Home) {
  return [h.address, h.city].filter(Boolean).join(', ')
}

export function occupiedRooms(h: Home) {
  return h.rooms.filter(r => r.kind === 'occupied')
}

/** Carte d'un logement : une bulle par chambre (libre, occupée, préavis, retard). */
export function HomeCard({ h, onOpen }: { h: Home; onOpen?: () => void }) {
  if (h.mode === 'delegue') {
    return (
      <div className="home ro">
        <span className="hl">
          <span className="hrow" style={{ justifyContent: 'flex-start' }}>
            <span className="ht">{homeLabel(h)}</span>
            <Pill tone="warn" icon="lock">Agence partenaire</Pill>
          </span>
          <span className="s">Confié à {h.agency?.name ?? 'une agence partenaire'}{h.delegatedAt ? ` depuis le ${dayMonth(h.delegatedAt, true)}` : ''}. ISALY n’intervient plus sur ce logement.</span>
        </span>
        <span className="rooms" title={`${h.rooms.length} chambres gérées par l’agence`}>
          {h.rooms.map((_, i) => <span key={i} className="room"><span className="free" style={{ borderStyle: 'solid', opacity: 0.55 }}><Icon name="lock" size={16} /></span></span>)}
        </span>
      </div>
    )
  }
  const occ = occupiedRooms(h)
  const path = h.mode === 'autogestion' ? <Pill tone="brand">Autogestion</Pill> : <Pill tone="info">Parcours à choisir</Pill>
  const sub = h.mode === 'autogestion'
    ? `${occ.length} ${plural(occ.length, 'chambre', 'chambres')} sur ${h.rooms.length} ${plural(occ.length, 'occupée', 'occupées')}`
    : `Nouveau logement, ${h.rooms.length} ${plural(h.rooms.length, 'chambre', 'chambres')} en location`
  return (
    <button className="home" type="button" onClick={onOpen}>
      <span className="hl">
        <span className="hrow" style={{ justifyContent: 'flex-start' }}><span className="ht">{homeLabel(h)}</span>{path}</span>
        <span className="s">{sub}</span>
      </span>
      <span className="rooms">
        {h.rooms.flatMap((r, i) => r.kind === 'free'
          ? [<span key={`f${i}`} className="room"><span className="free"><Icon name="plus" size={16} /></span>Libre</span>]
          : (r.occupants ?? []).map(o => (
            <span key={`${r.leaseId}-${o.id}`} className="room">
              <span className="rb">
                <Bubble name={o.firstName} color={personColor(o.id)} size={44} avatar={o.avatarUrl} />
                {r.notice ? <span className="flag" title="Préavis en cours"><Icon name="door" size={12} /></span>
                  : r.pay?.status === 'late' ? <span className="flag bad" title="Loyer en retard"><Icon name="euro" size={12} /></span> : null}
              </span>
              {o.firstName}
            </span>
          )))}
      </span>
    </button>
  )
}

function PerfChart({ days }: { days: { label: string; views: number; likes: number }[] }) {
  const W = 460, H = 190, top = 12, base = 158, step = (W - 20) / 7
  const maxV = Math.max(10, ...days.map(d => d.views)) * 1.1
  const maxL = Math.max(5, ...days.map(d => d.likes)) * 1.2
  const pts = days.map((d, i) => [10 + i * step + step / 2, base - (d.likes / maxL) * (base - top)])
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Vues et swipes à droite sur 7 jours">
      {days.map((d, i) => {
        const h = (d.views / maxV) * (base - top)
        const x = 10 + i * step + step / 2 - 13
        return (
          <g key={i}>
            <rect x={x.toFixed(1)} y={(base - h).toFixed(1)} width="26" height={Math.max(h, 2).toFixed(1)} rx="8" fill="#6C4DFF" opacity={i === 6 ? 1 : 0.32} />
            <text x={(x + 13).toFixed(1)} y="180" textAnchor="middle">{d.label}</text>
          </g>
        )
      })}
      <polyline points={pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')} fill="none" stroke="#16C79A" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r="4" fill="#16C79A" stroke="var(--solid)" strokeWidth="2" />)}
    </svg>
  )
}

export default function OwnerDashboard() {
  const router = useRouter()
  const toast = useToast()
  const [d, setD] = useState<Data | null>(null)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/v2/bailleur', { cache: 'no-store' })
      if (res.status === 401) return router.push('/auth/login')
      if (!res.ok) throw new Error()
      setD(await res.json())
      setError(false)
    } catch {
      setError(true)
    }
  }, [router])

  useEffect(() => { load() }, [load])

  // Temps réel : nouveaux messages et notifications relancent le chargement.
  useEffect(() => {
    const supabase = createClient()
    let t: ReturnType<typeof setTimeout> | null = null
    const refetch = () => { if (t) clearTimeout(t); t = setTimeout(load, 800) }
    const channel = supabase
      .channel(`v2-owner-dash:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, refetch)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'maintenance_requests' }, refetch)
      .subscribe()
    return () => { if (t) clearTimeout(t); supabase.removeChannel(channel) }
  }, [load])

  if (error && !d) return <EmptyState icon="alert" tone="bad" title="Ton tableau de bord n’a pas pu se charger" text="Vérifie ta connexion puis réessaie." actions={<Button variant="main" onClick={load}>Réessayer</Button>} />
  if (!d) return <SkelScreen />

  // Chiffres clés : logements en autogestion uniquement.
  const auto = d.homes.filter(h => h.mode === 'autogestion')
  const rooms = auto.flatMap(h => h.rooms)
  const occ = rooms.filter(r => r.kind === 'occupied')
  const received = occ.filter(r => r.pay?.status === 'paid').reduce((s, r) => s + (r.pay?.amount ?? r.rent ?? 0), 0)
  const expected = occ.reduce((s, r) => s + (r.pay?.amount ?? r.rent ?? 0), 0)
  const late = occ.filter(r => r.pay?.status === 'late')
  const mates = occ.reduce((s, r) => s + (r.occupants?.length ?? 0), 0)
  const openMaint = d.maintenance.filter(m => m.status !== 'in_progress')
  const notices = auto.flatMap(h => occupiedRooms(h).filter(r => r.notice).map(r => ({ h, r })))

  async function remind(h: Home, r: Room) {
    const o = r.occupants?.[0]
    if (!r.leaseId || !o || !r.pay) return
    const res = await fetch('/api/loyers/relance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lease_id: r.leaseId, tenant_id: o.id, month: r.pay.month, amount: r.pay.amount }),
    })
    const j = await res.json().catch(() => ({}))
    toast(res.ok ? `Relance envoyée à ${o.firstName}` : j.error ?? 'La relance n’a pas pu être envoyée')
  }

  type Todo = { ic: IconName; tone: Tone; t: string; s: string; label: string; onClick: () => void }
  const todo: Todo[] = []
  for (const h of auto) {
    for (const r of occupiedRooms(h).filter(x => x.pay?.status === 'late')) {
      todo.push({ ic: 'euro', tone: 'bad', t: `Loyer en retard : ${r.occupants?.[0]?.firstName ?? 'un locataire'}`, s: `${homeLabel(h)}, ${eur(r.pay?.amount ?? 0)} attendus depuis ${r.pay?.lateDays ?? 0} jours.`, label: 'Relancer', onClick: () => remind(h, r) })
    }
  }
  for (const c of d.toChoose) {
    const h = d.homes.find(x => x.listingId === c.listingId)
    todo.push({ ic: 'shield', tone: 'ok', t: `Dossier de ${c.name} validé`, s: `${h ? homeLabel(h) : 'Ton logement'}. Choisis comment gérer ce logement.`, label: 'Choisir', onClick: () => router.push(`/app/candidatures?annonce=${c.listingId}&candidature=${c.id}`) })
  }
  if (d.newCandidatures) {
    todo.push({ ic: 'inbox', tone: 'brand', t: `${d.newCandidatures} ${plural(d.newCandidatures, 'nouvelle candidature', 'nouvelles candidatures')}`, s: 'À examiner dans Candidatures.', label: 'Voir', onClick: () => router.push(d.newCandListing ? `/app/candidatures?annonce=${d.newCandListing}` : '/app/candidatures') })
  }
  for (const m of openMaint.slice(0, 2)) {
    todo.push({ ic: 'wrench', tone: 'warn', t: m.title, s: `Signalé par ${m.by}, le ${dayMonth(m.createdAt)}.`, label: 'Traiter', onClick: () => router.push(`/app/maintenance?signalement=${m.id}`) })
  }
  for (const { r } of notices) {
    todo.push({ ic: 'door', tone: 'info', t: `${r.occupants?.[0]?.firstName ?? 'Un colocataire'} part le ${dayMonth(r.notice)}`, s: 'Préavis reçu. La chambre peut être republiée.', label: 'Republier', onClick: () => router.push('/app/mes-annonces') })
  }

  const sentence = `${d.newCandidatures} ${plural(d.newCandidatures, 'nouvelle candidature', 'nouvelles candidatures')}, ${late.length ? (late.length > 1 ? `${late.length} loyers en retard` : 'un loyer en retard') : 'aucun loyer en retard'} et ${openMaint.length} ${plural(openMaint.length, 'signalement ouvert', 'signalements ouverts')} ${d.newCandidatures + late.length + openMaint.length > 1 ? 't’attendent' : 't’attend'}.`
  const month = monthYear(new Date()).split(' ')[0].toLowerCase()

  return (
    <div className="screen">
      <div className="hello">
        <div>
          <h2>Bonjour {d.firstName || 'toi'}</h2>
          <p>{sentence}</p>
        </div>
        <div className="acts">
          <Button variant="main" icon="plus" href="/app/mes-annonces?publier=1">Publier une annonce</Button>
          <Button variant="glass" href="/app/candidatures">Voir les candidatures</Button>
        </div>
      </div>

      {!d.autogestion.active && (
        <section className="note" style={{ background: 'var(--warn-bg)', marginBottom: 18, alignItems: 'center' }}>
          <Icon name="alert" size={18} />
          <span className="grow"><b>Ton abonnement autogestion est inactif.</b> Tes logements en autogestion restent consultables, mais tu ne peux plus les gérer tant qu’il n’est pas réactivé.</span>
          <Button variant="main" size="sm" href="/app/paiement">Réactiver</Button>
        </section>
      )}

      <section className="panel kpis" aria-label="Chiffres clés">
        <div className="kpi"><div className="l">Loyers reçus en {month}</div><div className="v num">{eur(received)}</div><div className="d">sur {eur(expected)} attendus</div></div>
        <div className="kpi"><div className="l">Chambres occupées</div><div className="v num">{pc(rooms.length ? Math.round((occ.length / rooms.length) * 100) : 0)}</div><div className="d">{occ.length} sur {rooms.length}, en autogestion</div></div>
        <div className="kpi"><div className="l">Colocataires</div><div className="v num">{mates}</div><div className="d">dans {auto.length} {plural(auto.length, 'logement', 'logements')}</div></div>
        <div className="kpi"><div className="l">Loyers en retard</div><div className="v num">{late.length}</div><div className={late.length ? 'd bad' : 'd'}>{late.length ? `${late[0].occupants?.[0]?.firstName ?? 'Un locataire'}, ${late[0].pay?.lateDays ?? 0} jours` : 'Aucun'}</div></div>
      </section>

      <div className="v-grid wide-l mt">
        <Panel title="Mes logements" action={<a className="link" href="/app/baux">Gérer les baux</a>}>
          {d.homes.length ? (
            <div className="homes">
              {d.homes.map(h => <HomeCard key={h.id} h={h} onOpen={() => router.push(`/app/baux?logement=${h.id}`)} />)}
            </div>
          ) : (
            <EmptyState icon="building" title="Aucun logement pour le moment" text="Publie une annonce pour recevoir des candidatures compatibles avec tes colocataires." actions={<Button variant="main" href="/app/mes-annonces?publier=1">Publier une annonce</Button>} style={{ border: 0, background: 'none' }} />
          )}
        </Panel>
        <div className="stackv">
          <Panel title="À traiter" action={<span className="pill">{todo.length}</span>}>
            {todo.length ? (
              <div className="rows">
                {todo.map((t, i) => (
                  <div key={i} className="row">
                    <Ico name={t.ic} tone={t.tone} />
                    <span className="grow"><span className="t">{t.t}</span><span className="s">{t.s}</span></span>
                    <Button variant="glass" size="sm" onClick={t.onClick}>{t.label}</Button>
                  </div>
                ))}
              </div>
            ) : <p className="soft">Rien à traiter pour le moment.</p>}
          </Panel>
          {d.perf ? (
            <Panel title={d.perf.title} action={<span className="s">7 derniers jours</span>}>
              <PerfChart days={d.perf.days} />
              <div className="legend mt"><span><i style={{ background: '#6C4DFF' }} />Vues</span><span><i style={{ background: '#16C79A' }} />Swipes à droite</span></div>
              <div className="lstats">
                <span><b className="num">{d.perf.totals.views.toLocaleString('fr-FR')}</b> {plural(d.perf.totals.views, 'vue', 'vues')}</span>
                <span><b className="num">{d.perf.totals.likes}</b> {plural(d.perf.totals.likes, 'swipe à droite', 'swipes à droite')}</span>
                <span><b className="num">{d.perf.totals.requests}</b> {plural(d.perf.totals.requests, 'demande', 'demandes')}</span>
              </div>
            </Panel>
          ) : (
            <Note icon="bolt">Publie une annonce pour suivre ici ses vues et ses swipes à droite.</Note>
          )}
        </div>
      </div>
    </div>
  )
}
