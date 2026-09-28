'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { PartnerAgency } from '@/lib/managementMode'
import {
  Button, Constellation, EmptyState, Icon, Ico, Modal, Note, Panel, PathBanner, Pill, Segmented, SkelPanel,
  dayMonth, eur, monthYear, personColor, useToast, NBSP,
} from '@/components/ui-v2'
import Vault from '@/components/ui-v2/Vault'
import { AgencyRows } from '@/components/ui-v2/screens/TenantDashboard'

type Tab = 'apercu' | 'bail' | 'loyers' | 'signalements' | 'coffre'

interface Lease {
  id: string
  status: 'active' | 'pending_signature'
  address: string
  city: string
  ownerId: string
  ownerFirstName: string
  monthlyRent: number
  charges: number
  deposit: number | null
  startDate: string | null
  endDate: string | null
  meuble: boolean | null
  signedAt: string | null
  mates: { id: string; firstName: string; avatarUrl: string | null; score: number | null }[]
  management: { mode: 'autogestion' | 'delegue' | null; agency: PartnerAgency | null; delegatedAt: string | null }
  conversationId: string | null
}
interface Payment { id: string; month: string; amount: number; status: 'pending' | 'paid' | 'late'; paid_at: string | null; receipt_url: string | null; due_date: string | null }
interface Issue { id: string; title: string; category: string; description: string | null; status: string; created_at: string; bailleur_comment: string | null }
interface Data { lease: Lease | null; payments: Payment[]; requests: Issue[]; preavis: { id: string; date_declaration: string; date_fin_effective: string; delai_mois: number } | null }

const CATS = [
  { id: 'plomberie', label: 'Plomberie' },
  { id: 'electricite', label: 'Électricité' },
  { id: 'chauffage', label: 'Chauffage' },
  { id: 'serrurerie', label: 'Serrurerie' },
  { id: 'electromenager', label: 'Électroménager' },
  { id: 'menuiserie', label: 'Menuiserie' },
  { id: 'autre', label: 'Autre' },
]
export const CAT_LABELS: Record<string, string> = { ...Object.fromEntries(CATS.map(c => [c.id, c.label])), nuisibles: 'Nuisibles' }
export const ISSUE_STATUS: Record<string, [string, 'bad' | 'warn' | 'ok']> = {
  sent: ['Ouvert', 'bad'], received: ['Ouvert', 'bad'], in_progress: ['En cours', 'warn'], resolved: ['Résolu', 'ok'],
}

const TAB_IDS: Tab[] = ['apercu', 'bail', 'loyers', 'signalements', 'coffre']

export default function Maison() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [d, setD] = useState<Data | null>(null)
  const [error, setError] = useState(false)
  const raw = params.get('onglet') as Tab | null
  const tab: Tab = raw && TAB_IDS.includes(raw) ? raw : 'apercu'

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/v2/maison', { cache: 'no-store' })
      if (res.status === 401) return router.push('/auth/login')
      if (!res.ok) throw new Error()
      setD(await res.json())
      setError(false)
    } catch {
      setError(true)
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  const setTab = (t: Tab) => router.replace(`${pathname}${t === 'apercu' ? '' : `?onglet=${t}`}`, { scroll: false })

  if (error && !d) return <EmptyState icon="alert" tone="bad" title="Ma maison n’a pas pu se charger" text="Vérifie ta connexion puis réessaie." actions={<Button variant="main" onClick={load}>Réessayer</Button>} />
  if (!d) return <div className="stackv"><SkelPanel lines={2} /><div className="v-grid wide-l"><SkelPanel lines={5} /><SkelPanel lines={4} /></div></div>

  const lease = d.lease
  if (!lease || lease.status !== 'active') {
    return (
      <div className="screen">
        {lease?.status === 'pending_signature' ? (
          <EmptyState icon="contract" title="Ton bail t’attend" style={{ padding: '48px 24px' }}
            text="Ton bail est prêt : signe-le en ligne pour ouvrir Ma maison. Tu y retrouveras ensuite tes loyers et quittances, tes signalements et ton coffre-fort."
            actions={<Button variant="main" href={`/app/bail/${lease.id}`} icon="edit">Signer mon bail</Button>} />
        ) : (
          <EmptyState icon="house" title="Ma maison s’ouvre quand ton bail est signé" style={{ padding: '48px 24px' }}
            text="Tu y retrouveras ton bail, tes loyers et quittances, tes signalements et ton coffre-fort de documents. Tu verras aussi qui gère ton logement : ton bailleur avec ISALY, ou une agence partenaire."
            actions={<><Button variant="main" href="/app/demandes">Suivre mes demandes</Button><Button variant="glass" href="/app/swipe">Trouver une coloc</Button></>} />
        )}
      </div>
    )
  }

  const agency = lease.management.mode === 'delegue'
  const tabs: { value: Tab; label: string }[] = agency
    ? [{ value: 'apercu', label: 'Aperçu' }, { value: 'coffre', label: 'Coffre-fort' }]
    : [{ value: 'apercu', label: 'Aperçu' }, { value: 'bail', label: 'Bail' }, { value: 'loyers', label: 'Loyers et quittances' }, { value: 'signalements', label: 'Signalements' }, { value: 'coffre', label: 'Coffre-fort' }]
  const current = tabs.some(t => t.value === tab) ? tab : 'apercu'
  const convHref = lease.conversationId ? `/app/messages?conversation=${lease.conversationId}` : '/app/messages'
  const agencyPhone = lease.management.agency?.phone?.replace(/\s/g, '') ?? ''

  return (
    <div className="screen">
      {agency ? (
        <PathBanner
          agency
          icon="building"
          pill="Géré par une agence partenaire"
          title={`${lease.management.agency?.name ?? 'Une agence partenaire'} gère ton logement`}
          text="Ton bailleur a confié ce logement à une agence partenaire d’ISALY. Pour le loyer, les réparations et les documents du bail, contacte l’agence : ISALY n’intervient plus sur la gestion."
          actions={agencyPhone ? <Button variant="main" href={`tel:${agencyPhone}`} external icon="phone">Appeler l’agence</Button> : undefined}
        />
      ) : (
        <PathBanner
          icon="house"
          pill="Géré avec ISALY"
          title={`${lease.ownerFirstName} gère ton logement avec ISALY`}
          text={`Loyers et quittances, signalements, bail et documents : tout se passe ici, et ${lease.ownerFirstName} reçoit tout de suite ce que tu envoies.`}
          actions={<Button variant="glass" href={convHref} icon="chat">Écrire à {lease.ownerFirstName}</Button>}
        />
      )}
      <div className="toolbar" style={{ margin: '18px 0 0' }}>
        <Segmented options={tabs} value={current} onChange={setTab} label="Sections de Ma maison" />
      </div>
      {current === 'apercu' && <Apercu d={d} lease={lease} agency={agency} convHref={convHref} onTab={setTab} />}
      {current === 'bail' && <Bail d={d} lease={lease} reload={load} />}
      {current === 'loyers' && <Loyers d={d} lease={lease} />}
      {current === 'signalements' && <Signalements d={d} lease={lease} reload={load} />}
      {current === 'coffre' && <Vault />}
    </div>
  )
}

function Mates({ lease }: { lease: Lease }) {
  const people = lease.mates.map(m => ({ n: m.firstName, c: personColor(m.id), s: m.score, avatar: m.avatarUrl }))
  return (
    <Panel title="Ta colocation" action={<span className="pill">{[lease.address, lease.city].filter(Boolean).join(', ')}</span>}>
      {people.length ? (
        <div className="constel" style={{ gridTemplateColumns: 'minmax(0,1fr)', minHeight: 0 }}>
          <Constellation people={people} label="Tes colocataires" />
        </div>
      ) : (
        <p className="soft">Tes colocataires apparaîtront ici dès qu’ils seront rattachés au bail.</p>
      )}
    </Panel>
  )
}

function nextPayment(d: Data) {
  return [...d.payments].filter(p => p.status !== 'paid').sort((a, b) => a.month.localeCompare(b.month))[0] ?? null
}

function Apercu({ d, lease, agency, convHref, onTab }: { d: Data; lease: Lease; agency: boolean; convHref: string; onTab: (t: Tab) => void }) {
  if (agency) {
    return (
      <div className="v-grid wide-l mt">
        <Mates lease={lease} />
        <div className="stackv">
          <Panel title="Contacter l’agence">
            {lease.management.agency ? <AgencyRows agency={lease.management.agency} /> : <p className="soft">Les coordonnées de l’agence arrivent bientôt.</p>}
          </Panel>
          <Note icon="chat">Tes messages avec tes colocataires restent sur ISALY. <a className="link" href={convHref}>Ouvrir le fil de la coloc</a></Note>
        </div>
      </div>
    )
  }
  const next = nextPayment(d)
  const due = next ? new Date(next.due_date ?? next.month) : null
  const issue = d.requests.find(r => r.status !== 'resolved')
  return (
    <div className="v-grid wide-l mt">
      <Mates lease={lease} />
      <div className="stackv">
        <Panel title="Prochain loyer" action={due ? <Pill tone={next?.status === 'late' ? 'bad' : 'info'}>{next?.status === 'late' ? 'En retard' : `Avant le ${dayMonth(due)}`}</Pill> : undefined}>
          <div className="big num">{eur(next?.amount ?? lease.monthlyRent + lease.charges)}</div>
          <p className="s" style={{ marginTop: 4 }}>Loyer {eur(lease.monthlyRent)} et charges {eur(lease.charges)}, à régler à {lease.ownerFirstName} selon ton bail.</p>
          <div className="acts mt"><Button variant="glass" size="sm" onClick={() => onTab('loyers')}>Voir mes quittances</Button></div>
        </Panel>
        <Panel title={issue ? 'Signalement en cours' : 'Signalements'} action={issue ? <Pill tone={ISSUE_STATUS[issue.status]?.[1] ?? 'bad'}>{ISSUE_STATUS[issue.status]?.[0] ?? 'Ouvert'}</Pill> : undefined}>
          {issue ? (
            <>
              <span className="t">{issue.title}</span>
              {issue.bailleur_comment && <span className="s">{lease.ownerFirstName}{NBSP}: {issue.bailleur_comment}</span>}
            </>
          ) : <p className="soft">Aucun signalement en cours.</p>}
          <div className="acts mt"><Button variant="glass" size="sm" onClick={() => onTab('signalements')}>{issue ? 'Suivre le signalement' : 'Signaler un problème'}</Button></div>
        </Panel>
      </div>
    </div>
  )
}

function Bail({ d, lease, reload }: { d: Data; lease: Lease; reload: () => void }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<{ type_logement: 'meuble' | 'non_meuble' | null; preview: { delai_mois: number; date_fin_effective: string } | null } | null>(null)
  const [type, setType] = useState<'meuble' | 'non_meuble'>('meuble')
  const [busy, setBusy] = useState(false)
  const meuble = lease.meuble
  const kind = meuble == null ? 'Bail de colocation' : meuble ? 'Bail de colocation meublée' : 'Bail de colocation non meublée'

  useEffect(() => {
    if (!open) return
    fetch(`/api/preavis?lease_id=${lease.id}`).then(r => r.json()).then(setPreview).catch(() => setPreview(null))
  }, [open, lease.id])

  async function send() {
    setBusy(true)
    const res = await fetch('/api/preavis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lease_id: lease.id, confirm: true, ...(preview?.type_logement ? {} : { type_logement: type }) }),
    })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return toast(j.error ?? 'Le préavis n’a pas pu être envoyé')
    setOpen(false)
    toast(`Préavis envoyé à ${lease.ownerFirstName}`)
    reload()
  }

  async function withdraw() {
    if (!d.preavis) return
    const res = await fetch('/api/preavis', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: d.preavis.id }) })
    if (!res.ok) return toast('Le préavis n’a pas pu être retiré')
    toast('Préavis retiré')
    reload()
  }

  const delai = preview?.preview?.delai_mois ?? (preview?.type_logement ? (preview.type_logement === 'meuble' ? 1 : 3) : type === 'meuble' ? 1 : 3)
  const fin = preview?.preview?.date_fin_effective

  return (
    <div className="v-grid wide-l mt">
      <Panel title="Ton bail" action={<Pill tone="ok" icon="check">Signé</Pill>}>
        <div className="doc">
          <span className="ico"><Icon name="contract" size={20} /></span>
          <span className="grow">
            <span className="t">{kind}</span>
            <span className="s">{lease.signedAt ? `Signé électroniquement le ${dayMonth(lease.signedAt, true)} par ${lease.ownerFirstName} et toi` : `Signé par ${lease.ownerFirstName} et toi`}</span>
          </span>
          <Button variant="glass" size="sm" icon="download" href={`/app/bail/${lease.id}`}>PDF</Button>
        </div>
        <div className="kv mt">
          <div><span>Début</span><b>{lease.startDate ? dayMonth(lease.startDate, true) : 'Non précisé'}</b></div>
          <div><span>Fin prévue</span><b>{lease.endDate ? dayMonth(lease.endDate, true) : 'Tacite reconduction'}</b></div>
          <div><span>Loyer</span><b>{eur(lease.monthlyRent)} par mois</b></div>
          <div><span>Charges</span><b>{eur(lease.charges)} par mois, provision</b></div>
          <div><span>Dépôt de garantie</span><b>{lease.deposit != null ? eur(lease.deposit) : 'Non précisé'}</b></div>
          <div><span>Préavis</span><b>{meuble == null ? 'Selon ton bail' : meuble ? '1 mois, logement meublé' : '3 mois, logement non meublé'}</b></div>
        </div>
      </Panel>
      <Panel title="Quitter le logement">
        <p className="soft">Ton préavis est {meuble === false ? 'de trois mois' : meuble ? 'd’un mois' : 'd’un ou trois mois selon ton logement'}. Dès que tu l’envoies, {lease.ownerFirstName} le reçoit et la date de fin s’affiche ici.</p>
        {d.preavis ? (
          <>
            <Note icon="check" className="mt"><b>Préavis envoyé le {dayMonth(d.preavis.date_declaration)}.</b> Ton bail se termine le {dayMonth(d.preavis.date_fin_effective, true)}.</Note>
            <Button variant="ghost" size="sm" className="mt" onClick={withdraw}>Retirer mon préavis</Button>
          </>
        ) : (
          <Button variant="glass" icon="door" className="mt" onClick={() => setOpen(true)}>Donner mon préavis</Button>
        )}
      </Panel>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Donner ton préavis"
        lead={preview?.type_logement || !preview
          ? <>Ton logement est {delai === 1 ? 'meublé' : 'non meublé'} : ton préavis est {delai === 1 ? 'd’un mois' : 'de trois mois'}.{fin ? <> En l’envoyant aujourd’hui, ton bail se termine le <b>{dayMonth(fin, true)}</b>.</> : null}</>
          : 'Ton bail ne précise pas si le logement est meublé : indique-le pour calculer ton préavis.'}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button variant="main" disabled={busy || !preview} onClick={send}>Envoyer mon préavis</Button></>}
      >
        {preview && !preview.type_logement && (
          <div className="field mt">
            <span className="flabel">Type de logement</span>
            <Segmented options={[{ value: 'meuble', label: 'Meublé' }, { value: 'non_meuble', label: 'Non meublé' }]} value={type} onChange={setType} label="Type de logement" />
          </div>
        )}
        <Note className="mt">{lease.ownerFirstName} reçoit ton préavis tout de suite, et la date s’affiche dans Ma maison pour toute la coloc.</Note>
      </Modal>
    </div>
  )
}

function Loyers({ d, lease }: { d: Data; lease: Lease }) {
  if (!d.payments.length) {
    return <EmptyState className="mt" icon="euro" title="Pas encore de loyer enregistré" text={`Tes loyers et quittances apparaîtront ici dès que ${lease.ownerFirstName} les aura enregistrés.`} />
  }
  return (
    <Panel className="mt" title="Loyers et quittances">
      <div className="tscroll">
        <table className="tbl">
          <thead><tr><th>Mois</th><th>Montant</th><th>Statut</th><th><span className="sr">Quittance</span></th></tr></thead>
          <tbody>
            {d.payments.map(p => {
              const due = new Date(p.due_date ?? p.month)
              return (
                <tr key={p.id}>
                  <td><b>{monthYear(p.month)}</b></td>
                  <td className="num">{eur(p.amount)}</td>
                  <td>
                    {p.status === 'paid' ? <Pill tone="ok" icon="check">Payé</Pill> : p.status === 'late' ? <Pill tone="bad">En retard</Pill> : <Pill tone="info">À venir</Pill>}
                    <span className="s">{p.status === 'paid' ? (p.paid_at ? `Reçu par ${lease.ownerFirstName} le ${dayMonth(p.paid_at)}` : `Reçu par ${lease.ownerFirstName}`) : `À régler avant le ${dayMonth(due)}`}</span>
                  </td>
                  <td>
                    {p.status === 'paid' && p.receipt_url
                      ? <Button variant="glass" size="sm" icon="download" href={p.receipt_url} external>Quittance</Button>
                      : <span className="s">Quittance après paiement</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function Signalements({ d, lease, reload }: { d: Data; lease: Lease; reload: () => void }) {
  const toast = useToast()
  const [cat, setCat] = useState(CATS[0].id)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    const photos: string[] = []
    if (photo) {
      const supabase = createClient()
      const path = `maintenance/${Date.now()}-${photo.name.replace(/\s/g, '_')}`
      const { error } = await supabase.storage.from('documents').upload(path, photo)
      if (!error) photos.push(supabase.storage.from('documents').getPublicUrl(path).data.publicUrl)
    }
    const res = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: cat, title: title.trim(), description: desc.trim() || title.trim(), urgency: 'normal', photos }),
    })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return toast(j.error ?? 'Le signalement n’a pas pu être envoyé')
    setTitle('')
    setDesc('')
    setPhoto(null)
    toast(`Signalement envoyé à ${lease.ownerFirstName}`)
    reload()
  }

  const sorted = useMemo(() => d.requests, [d.requests])

  return (
    <div className="v-grid wide-r mt">
      <form className="panel form" onSubmit={submit}>
        <div className="phead" style={{ margin: 0 }}><h2>Signaler un problème</h2></div>
        <div className="field"><label htmlFor="scat">Catégorie</label>
          <select id="scat" className="select" value={cat} onChange={e => setCat(e.target.value)}>
            {CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="sobj">Objet</label><input id="sobj" className="input" required value={title} onChange={e => setTitle(e.target.value)} placeholder="Par exemple : fuite sous l’évier" /></div>
        <div className="field"><label htmlFor="sdesc">Détail</label><textarea id="sdesc" className="textarea" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Depuis quand, dans quelle pièce, ce que tu as déjà essayé" /></div>
        <button type="button" className="dropzone" onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer', background: 'none' }}>
          <Icon name="image" size={24} />
          <span>{photo ? photo.name : 'Ajoute une photo, c’est plus rapide à régler'}</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
        <Button variant="main" type="submit" icon="send" disabled={busy || !title.trim()}>Envoyer à {lease.ownerFirstName}</Button>
      </form>
      <Panel title="Mes signalements">
        {sorted.length ? (
          <div className="rows">
            {sorted.map(s => {
              const [label, tone] = ISSUE_STATUS[s.status] ?? ['Ouvert', 'bad']
              return (
                <div key={s.id} className="row" style={{ alignItems: 'flex-start' }}>
                  <Ico name="wrench" tone={tone} />
                  <span className="grow">
                    <span className="t">{s.title}</span>
                    <span className="s">{CAT_LABELS[s.category] ?? s.category}, {dayMonth(s.created_at)}</span>
                    {s.bailleur_comment && <span className="s" style={{ marginTop: 6, color: 'var(--ink-2)' }}><b>{lease.ownerFirstName}{NBSP}:</b> {s.bailleur_comment}</span>}
                  </span>
                  <Pill tone={tone}>{label}</Pill>
                </div>
              )
            })}
          </div>
        ) : <p className="soft">Aucun signalement pour le moment.</p>}
      </Panel>
    </div>
  )
}
