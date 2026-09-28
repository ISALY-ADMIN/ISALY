'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Home, Room } from '@/lib/v2/owner'
import {
  Bubble, Button, EmptyState, Icon, Ico, Meter, Panel, PathBanner, Pill, Segmented, SkelPanel,
  dayMonth, eur, monthYear, personColor, plural, useToast,
} from '@/components/ui-v2'
import { AgencyRows } from '@/components/ui-v2/screens/TenantDashboard'
import { homeLabel } from '@/components/ui-v2/screens/OwnerDashboard'

type Tab = 'colocataires' | 'loyers' | 'documents' | 'fin'
interface Doc { id: string; homeId: string; tenantName: string; status: string; ownerSigned: boolean; tenantSigned: boolean; hasPdf: boolean }
interface Data { homes: Home[]; autogestion: { active: boolean }; documents: Doc[] }

const TABS: Tab[] = ['colocataires', 'loyers', 'documents', 'fin']

export default function Baux() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const toast = useToast()
  const [d, setD] = useState<Data | null>(null)
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const raw = params.get('onglet') as Tab | null
  const tab: Tab = raw && TABS.includes(raw) ? raw : 'colocataires'

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/v2/baux', { cache: 'no-store' })
      if (res.status === 401) return router.push('/auth/login')
      if (!res.ok) throw new Error()
      setD(await res.json())
      setError(false)
    } catch {
      setError(true)
    }
  }, [router])

  useEffect(() => { load() }, [load])

  const home = useMemo(() => {
    if (!d?.homes.length) return null
    const want = params.get('logement')
    return d.homes.find(h => h.id === want) ?? d.homes[0]
  }, [d, params])

  const go = (q: { logement?: string; onglet?: Tab }) => {
    const p = new URLSearchParams(params.toString())
    if (q.logement) p.set('logement', q.logement)
    if (q.onglet) p.set('onglet', q.onglet)
    router.replace(`${pathname}?${p}`, { scroll: false })
  }

  async function call(key: string, url: string, init: RequestInit, ok: string) {
    setBusy(key)
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init })
    const j = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok) return toast(j.error ?? 'L’action n’a pas pu aboutir')
    toast(ok)
    load()
  }

  if (error && !d) return <EmptyState icon="alert" tone="bad" title="Tes baux n’ont pas pu se charger" text="Vérifie ta connexion puis réessaie." actions={<Button variant="main" onClick={load}>Réessayer</Button>} />
  if (!d) return <div className="stackv"><SkelPanel lines={2} /><SkelPanel lines={5} /></div>
  if (!home) {
    return <EmptyState icon="contract" title="Pas encore de bail" text="Publie une annonce et valide un dossier : tes baux apparaîtront ici." actions={<Button variant="main" href="/app/mes-annonces?publier=1">Publier une annonce</Button>} />
  }

  const toolbar = (
    <div className="toolbar">
      <Segmented options={d.homes.map(h => ({ value: h.id, label: h.address }))} value={home.id} onChange={v => go({ logement: v })} label="Choisir le logement" />
    </div>
  )

  if (home.mode === 'delegue') {
    return (
      <div className="screen">
        {toolbar}
        <PathBanner agency icon="lock" pill="Lecture seule" pillTone="warn"
          title={`Confié à ${home.agency?.name ?? 'une agence partenaire'}`}
          text={`${home.delegatedAt ? `Depuis le ${dayMonth(home.delegatedAt, true)}, l’agence` : 'L’agence'} gère le bail et la location de ce logement. ISALY n’intervient plus : ces informations sont figées à la date de transmission.`} />
        <div className="v-grid g2 mt">
          <Panel title="Transmission">
            <div className="kv">
              <div><span>Date</span><b>{home.delegatedAt ? dayMonth(home.delegatedAt, true) : 'Non précisée'}</b></div>
              <div><span>Chambres</span><b>{home.rooms.length}</b></div>
              <div><span>Frais pour toi</span><b>Aucun</b></div>
            </div>
          </Panel>
          <Panel title="Contacter l’agence">{home.agency ? <AgencyRows agency={home.agency} /> : <p className="soft">Coordonnées de l’agence indisponibles.</p>}</Panel>
        </div>
      </div>
    )
  }

  if (!home.mode) {
    return (
      <div className="screen">
        {toolbar}
        <EmptyState icon="contract" tone="info" title={`Pas encore de bail pour ${home.address}`}
          text="Valide d’abord le dossier d’un candidat, puis choisis comment gérer ce logement : avec une agence partenaire ou avec ISALY."
          actions={<Button variant="main" href={home.listingId ? `/app/candidatures?annonce=${home.listingId}` : '/app/candidatures'}>Choisir le parcours</Button>} />
      </div>
    )
  }

  const ro = !d.autogestion.active
  const occ = home.rooms.filter(r => r.kind === 'occupied')
  const free = home.rooms.length - occ.length

  return (
    <div className="screen">
      {toolbar}
      <section className="panel">
        <div className="hrow">
          <span>
            <span className="t" style={{ fontSize: 'clamp(1.4rem,2.2vw,1.9rem)', fontWeight: 800, letterSpacing: '-.04em' }}>{homeLabel(home)}</span>
            <span className="s">{[home.neighborhood, `colocation ${home.meuble === false ? 'non meublée' : 'meublée'}`, `${home.rooms.length} ${plural(home.rooms.length, 'chambre', 'chambres')}`].filter(Boolean).join(', ')}</span>
          </span>
          <span className="acts">
            <Pill tone="brand">Autogestion</Pill>
            {free ? <Pill tone="info">{free} {plural(free, 'chambre libre', 'chambres libres')}</Pill> : <Pill tone="ok">Complet</Pill>}
          </span>
        </div>
      </section>
      {ro && (
        <section className="note" style={{ background: 'var(--warn-bg)', marginTop: 18 }}>
          <Icon name="lock" size={18} />
          <span><b>Lecture seule :</b> ton abonnement autogestion est inactif. <a className="link" href="/app/paiement">Le réactiver</a></span>
        </section>
      )}
      <div className="toolbar" style={{ margin: '18px 0 0' }}>
        <Segmented
          options={[{ value: 'colocataires', label: 'Colocataires' }, { value: 'loyers', label: 'Loyers' }, { value: 'documents', label: 'Documents' }, { value: 'fin', label: 'Préavis et fin de bail' }]}
          value={tab} onChange={t => go({ onglet: t })} label="Sections du bail" />
      </div>

      {tab === 'colocataires' && (
        <Panel className="mt">
          <div className="tscroll">
            <table className="tbl">
              <thead><tr><th>Colocataire</th><th>Chambre</th><th>Loyer</th><th>Depuis le</th><th>Statut</th></tr></thead>
              <tbody>
                {home.rooms.map((r, i) => r.kind === 'free' ? (
                  <tr key={`f${i}`}>
                    <td><span className="acts" style={{ gap: 10, flexWrap: 'nowrap' }}><span className="room" style={{ width: 'auto' }}><span className="free" style={{ width: 34, height: 34 }}><Icon name="plus" size={14} /></span></span><span className="s">Chambre libre</span></span></td>
                    <td>Chambre {i + 1}</td><td className="num">-</td><td>-</td><td><Pill tone="info">À louer</Pill></td>
                  </tr>
                ) : (r.occupants ?? []).map(o => (
                  <tr key={`${r.leaseId}-${o.id}`}>
                    <td><a className="acts" href={`/app/locataires/${o.id}`} style={{ gap: 10, flexWrap: 'nowrap', textDecoration: 'none' }}><Bubble name={o.firstName} color={personColor(o.id)} size={34} avatar={o.avatarUrl} /><b>{o.firstName}</b></a></td>
                    <td>Chambre {i + 1}</td>
                    <td className="num">{eur(r.rent)}</td>
                    <td>{r.since ? dayMonth(r.since, true) : '-'}</td>
                    <td>{r.notice ? <Pill tone="warn" icon="door">Départ le {dayMonth(r.notice)}</Pill> : r.endDate ? <Pill tone="info">Fin le {dayMonth(r.endDate)}</Pill> : <Pill tone="ok">En place</Pill>}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === 'loyers' && (() => {
        if (!occ.length) return <EmptyState className="mt" icon="euro" title="Pas encore de loyer" text="Les loyers apparaîtront ici dès le premier bail actif." />
        const got = occ.filter(r => r.pay?.status === 'paid').reduce((s, r) => s + (r.pay?.amount ?? r.rent ?? 0), 0)
        const all = occ.reduce((s, r) => s + (r.pay?.amount ?? r.rent ?? 0), 0)
        const month = occ.find(r => r.pay)?.pay?.month ?? new Date().toISOString().slice(0, 7) + '-01'
        return (
          <Panel className="mt" title={monthYear(month)} action={home.dueDay ? <span className="s">Échéance le {home.dueDay} de chaque mois</span> : undefined}>
            <Meter value={all ? (got / all) * 100 : 0} style={{ marginBottom: 6 }} />
            <p className="s" style={{ marginBottom: 10 }}><b className="num" style={{ color: 'var(--ink)' }}>{eur(got)}</b> reçus sur {eur(all)}</p>
            <div className="rows">
              {occ.map(r => <RentRow key={r.leaseId} r={r} ro={ro} busy={busy} month={month} call={call} />)}
            </div>
          </Panel>
        )
      })()}

      {tab === 'documents' && (
        <Panel className="mt" title="Documents" action={
          <div className="acts">
            <Button variant="main" size="sm" icon="plus" disabled={ro} href={home.listingId ? `/app/baux/nouveau?listing=${home.listingId}` : '/app/baux/nouveau'}>Préparer un bail</Button>
          </div>
        }>
          {d.documents.filter(x => x.homeId === home.id).length ? (
            <div className="vault">
              {d.documents.filter(x => x.homeId === home.id).map(x => (
                <div key={x.id} className="doc">
                  <Ico name="contract" size={20} />
                  <span className="grow">
                    <span className="t">Bail de {x.tenantName}</span>
                    <span className="s">{x.status === 'active' ? 'Signé en ligne' : x.status === 'pending_signature' ? (x.ownerSigned ? 'En attente de la signature du locataire' : 'À signer') : x.status === 'ended' ? 'Terminé' : 'Brouillon'}</span>
                  </span>
                  <a className="iconbtn" href={`/app/bail/${x.id}`} aria-label={`Ouvrir le bail de ${x.tenantName}`} style={{ width: 38, height: 38 }}><Icon name={x.hasPdf ? 'download' : 'chevron'} size={18} /></a>
                </div>
              ))}
            </div>
          ) : <p className="soft">Aucun bail pour ce logement. Prépare-le en ligne puis envoie-le à la signature.</p>}
        </Panel>
      )}

      {tab === 'fin' && (() => {
        const items = occ.filter(r => r.notice || r.endDate)
        if (!items.length) return <EmptyState className="mt" icon="check" tone="ok" title="Aucun départ prévu" text="Les préavis de tes colocataires et les fins de bail apparaîtront ici." />
        return (
          <Panel className="mt">
            <div className="rows">
              {items.map(r => {
                const o = r.occupants?.[0]
                return r.notice ? (
                  <div key={r.leaseId} className="row">
                    <Bubble name={o?.firstName ?? '?'} color={personColor(o?.id)} size={40} avatar={o?.avatarUrl} />
                    <span className="grow"><span className="t">{o?.firstName} part le {dayMonth(r.notice)}</span><span className="s">{home.meuble === false ? 'Logement non meublé : trois mois de préavis.' : 'Logement meublé : un mois de préavis.'}</span></span>
                    <Button variant="main" size="sm" href="/app/mes-annonces">Republier la chambre</Button>
                  </div>
                ) : (
                  <div key={r.leaseId} className="row">
                    <Bubble name={o?.firstName ?? '?'} color={personColor(o?.id)} size={40} avatar={o?.avatarUrl} />
                    <span className="grow"><span className="t">Le bail de {o?.firstName} se termine le {dayMonth(r.endDate)}</span><span className="s">Propose un renouvellement ou prépare la sortie.</span></span>
                    <Button variant="glass" size="sm" disabled={ro} href={`/app/bail/${r.leaseId}`}>Ouvrir le bail</Button>
                  </div>
                )
              })}
            </div>
          </Panel>
        )
      })()}
    </div>
  )
}

function RentRow({ r, ro, busy, month, call }: { r: Room; ro: boolean; busy: string | null; month: string; call: (k: string, url: string, init: RequestInit, ok: string) => void }) {
  const o = r.occupants?.[0]
  const name = o?.firstName ?? 'Locataire'
  const amount = r.pay?.amount ?? r.rent ?? 0
  const markPaid = () => call(`p-${r.leaseId}`, `/api/loyers/${r.pay?.paymentId ?? 'new'}`, {
    method: 'PATCH',
    body: JSON.stringify({ lease_id: r.leaseId, tenant_id: o?.id, month: r.pay?.month ?? month, amount }),
  }, `Loyer de ${name} marqué comme reçu`)
  return (
    <div className="row">
      <Bubble name={name} color={personColor(o?.id)} size={36} avatar={o?.avatarUrl} />
      <span className="grow">
        <span className="t">{name}</span>
        <span className="s">{eur(amount)}{r.pay?.status === 'paid' ? `, reçu le ${dayMonth(r.pay.paidAt)}` : r.pay?.status === 'late' ? `, attendu depuis ${r.pay.lateDays} jours` : ''}</span>
      </span>
      {r.pay?.status === 'paid' ? (
        <>
          <Pill tone="ok" icon="check">Reçu</Pill>
          <Button variant="ghost" size="sm" disabled={ro || busy === `q-${r.leaseId}`}
            onClick={() => call(`q-${r.leaseId}`, '/api/quittances/generate', { method: 'POST', body: JSON.stringify({ lease_id: r.leaseId, month: (r.pay?.month ?? month).slice(0, 7) }) }, `Quittance envoyée à ${name}`)}>Quittance</Button>
        </>
      ) : (
        <>
          {r.pay?.status === 'late' ? <Pill tone="bad">{r.pay.lateDays} jours de retard</Pill> : <Pill tone="info">À venir</Pill>}
          {r.pay?.status === 'late' && (
            <Button variant="glass" size="sm" disabled={ro || busy === `r-${r.leaseId}`}
              onClick={() => call(`r-${r.leaseId}`, '/api/loyers/relance', { method: 'POST', body: JSON.stringify({ lease_id: r.leaseId, tenant_id: o?.id, month: r.pay?.month ?? month, amount }) }, `Relance envoyée à ${name}`)}>Relancer</Button>
          )}
          <Button variant="main" size="sm" disabled={ro || busy === `p-${r.leaseId}`} onClick={markPaid}>Marquer reçu</Button>
        </>
      )}
    </div>
  )
}
