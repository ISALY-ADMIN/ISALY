'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  BarRow, Bubble, Button, EmptyState, Ico, Icon, Modal, Note, Pill, Segmented, SkelPanel, dayMonth, longDateTime, pc, personColor, useToast, NNBSP,
} from '@/components/ui-v2'

interface Cand {
  id: string
  userId: string
  listingId: string
  firstName: string
  avatarUrl: string | null
  job: string | null
  moveIn: string | null
  message: string
  status: 'pending' | 'accepted' | 'rejected' | 'waitlisted' | 'visit_proposed'
  priority: boolean
  first: boolean
  per: { id: string; firstName: string; score: number | null }[]
  score: number | null
  dims: number[] | null
  visit: { date: string; time: string } | null
  dossier: { identity: string; income: string; guarantor: string }
}
interface Listing { id: string; title: string; place: string; city: string; isActive: boolean; mode: 'autogestion' | 'delegue' | null; agency: { id: string; name: string } | null }
interface Data { listings: Listing[]; candidatures: Cand[]; dimLabels: string[]; autogestionActive: boolean }

type CF = 'all' | 'pending' | 'visit_proposed' | 'accepted'
const CST: Record<string, string> = { pending: 'nouvelle candidature', visit_proposed: 'visite prévue', accepted: 'dossier validé', rejected: 'refusée', waitlisted: 'en attente' }

export default function Candidatures() {
  const router = useRouter()
  const params = useSearchParams()
  const toast = useToast()
  const [d, setD] = useState<Data | null>(null)
  const [error, setError] = useState(false)
  const [ad, setAd] = useState<string | null>(params.get('annonce'))
  const [cf, setCf] = useState<CF>('all')
  const [sel, setSel] = useState<string | null>(params.get('candidature'))
  const [busy, setBusy] = useState(false)
  const [refuse, setRefuse] = useState<Cand | null>(null)
  const [delegate, setDelegate] = useState<Cand | null>(null)
  const detailRef = useRef<HTMLElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/v2/candidatures', { cache: 'no-store' })
      if (res.status === 401) return router.push('/auth/login')
      if (!res.ok) throw new Error()
      setD(await res.json())
      setError(false)
    } catch {
      setError(true)
    }
  }, [router])

  useEffect(() => { load() }, [load])

  const ads = useMemo(() => (d?.listings ?? []).filter(l => l.isActive || d?.candidatures.some(c => c.listingId === l.id)), [d])
  const currentAd = ads.find(a => a.id === ad) ?? ads[0] ?? null
  const list = useMemo(
    () => (d?.candidatures ?? []).filter(c => c.listingId === currentAd?.id && (cf === 'all' || c.status === cf)),
    [d, currentAd, cf],
  )
  const cur = list.find(c => c.id === sel) ?? list[0] ?? null

  function pick(id: string) {
    setSel(id)
    if (window.innerWidth <= 900) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  async function decide(c: Cand, status: Cand['status'], msg: string) {
    setBusy(true)
    const res = await fetch(`/api/candidatures/${c.id}/decision`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return toast(j.error ?? 'La décision n’a pas pu être enregistrée')
    toast(msg)
    load()
  }

  /** Même logique que l'ancien centre de décision : conversation via un match. */
  async function contact(c: Cand) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/auth/login')
    const { data: existing } = await supabase.from('matches').select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${c.userId}),and(user1_id.eq.${c.userId},user2_id.eq.${user.id})`).maybeSingle()
    let matchId = (existing?.id as string | undefined) ?? null
    if (!matchId) {
      const { data: m } = await supabase.from('matches').insert({ user1_id: user.id, user2_id: c.userId }).select('id').single()
      matchId = (m?.id as string | undefined) ?? null
    }
    if (!matchId) return toast('La conversation n’a pas pu être ouverte')
    const { data: conv } = await supabase.from('conversations').select('id').eq('match_id', matchId).maybeSingle()
    let convId = (conv?.id as string | undefined) ?? null
    if (!convId) {
      const { data: nc } = await supabase.from('conversations').insert({ match_id: matchId }).select('id').single()
      convId = (nc?.id as string | undefined) ?? null
    }
    router.push(convId ? `/app/messages?conversation=${convId}` : '/app/messages')
  }

  async function chooseAuto(c: Cand, l: Listing) {
    setBusy(true)
    const res = await fetch(`/api/gestion/${l.id}/autogestion`, { method: 'POST' })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return toast(j.error ?? 'Le choix n’a pas pu être enregistré')
    toast(`${l.title} est maintenant en autogestion`)
    router.push(`/app/baux/nouveau?tenant=${c.userId}&listing=${l.id}`)
  }

  async function doDelegate(c: Cand, l: Listing) {
    setBusy(true)
    const res = await fetch(`/api/gestion/${l.id}/delegation`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenant_id: c.userId }) })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    setDelegate(null)
    if (!res.ok) return toast(j.error ?? 'Le dossier n’a pas pu être transmis')
    toast(`Dossier transmis à ${j.agency?.name ?? 'l’agence partenaire'}`)
    load()
  }

  if (error && !d) return <EmptyState icon="alert" tone="bad" title="Les candidatures n’ont pas pu se charger" text="Vérifie ta connexion puis réessaie." actions={<Button variant="main" onClick={load}>Réessayer</Button>} />
  if (!d) return <div className="cands"><SkelPanel lines={5} /><SkelPanel lines={7} /></div>
  if (!ads.length) {
    return <EmptyState icon="inbox" title="Pas encore de candidature" text="Publie une annonce : les candidatures compatibles avec tes colocataires arriveront ici." actions={<Button variant="main" href="/app/mes-annonces?publier=1">Publier une annonce</Button>} />
  }

  const countFor = (id: string) => d.candidatures.filter(c => c.listingId === id).length

  return (
    <div className="screen">
      <div className="toolbar">
        <Segmented
          options={ads.map(a => ({ value: a.id, label: <>{a.title} <span className="n">{countFor(a.id)}</span></> }))}
          value={currentAd?.id ?? ''}
          onChange={v => { setAd(v); setCf('all'); setSel(null) }}
          label="Choisir l’annonce"
        />
        <Segmented
          options={[{ value: 'all', label: 'Toutes' }, { value: 'pending', label: 'Nouvelles' }, { value: 'visit_proposed', label: 'Visites' }, { value: 'accepted', label: 'Validées' }]}
          value={cf}
          onChange={setCf}
          label="Filtrer par statut"
        />
      </div>
      <div className="cands">
        <section className="panel" style={{ padding: 10 }} aria-label="Liste des candidatures">
          {list.length ? list.map(c => (
            <button key={c.id} className="cand" type="button" aria-current={cur?.id === c.id} onClick={() => pick(c.id)}>
              <Bubble name={c.firstName} color={personColor(c.userId)} size={44} avatar={c.avatarUrl} />
              <span className="grow">
                <span className="t">{c.firstName}</span>
                <span className="s">{[c.job, CST[c.status]].filter(Boolean).join(', ')}</span>
              </span>
              <span style={{ display: 'grid', justifyItems: 'end', gap: 4 }}>
                {c.first ? <span className="s">1er coloc</span> : c.score != null ? <span className="cscore gradtext num">{pc(c.score)}</span> : <span className="s">Test à faire</span>}
                {c.priority && <Pill tone="brand" icon="spark">Prioritaire</Pill>}
              </span>
            </button>
          )) : <p className="s" style={{ padding: 14 }}>Aucune candidature pour ce filtre.</p>}
        </section>
        {cur && currentAd && (
          <Detail
            innerRef={detailRef}
            c={cur}
            l={currentAd}
            dimLabels={d.dimLabels}
            busy={busy}
            subActive={d.autogestionActive}
            onVisit={() => decide(cur, 'visit_proposed', `Visite proposée à ${cur.firstName}. Pense à publier tes créneaux.`)}
            onValidate={() => decide(cur, 'accepted', 'Dossier validé')}
            onRefuse={() => setRefuse(cur)}
            onWrite={() => contact(cur)}
            onAuto={() => chooseAuto(cur, currentAd)}
            onDelegate={() => setDelegate(cur)}
          />
        )}
      </div>

      <Modal
        open={!!refuse}
        onClose={() => setRefuse(null)}
        title={refuse ? <>Refuser la candidature de {refuse.firstName}{NNBSP}?</> : ''}
        lead={refuse ? `${refuse.firstName} est prévenu avec un message neutre, et sa candidature quitte ta liste.` : ''}
        footer={<><Button variant="ghost" onClick={() => setRefuse(null)}>Annuler</Button><Button variant="danger" disabled={busy} onClick={() => { const c = refuse!; setRefuse(null); decide(c, 'rejected', 'Candidature refusée') }}>Refuser la candidature</Button></>}
      />
      <Modal
        open={!!delegate}
        onClose={() => setDelegate(null)}
        title={delegate ? <>Transmettre le dossier de {delegate.firstName}{NNBSP}?</> : ''}
        lead={delegate && currentAd ? `${currentAd.agency?.name ?? 'L’agence partenaire'} reçoit le dossier et gère ensuite le bail et la location de ${currentAd.title}. Le logement passe en lecture seule sur ISALY : tu ne pourras plus le gérer ici.` : ''}
        footer={<><Button variant="ghost" onClick={() => setDelegate(null)}>Annuler</Button><Button variant="main" disabled={busy} onClick={() => delegate && currentAd && doDelegate(delegate, currentAd)}>Transmettre le dossier</Button></>}
      >
        <Note className="mt">Aucun abonnement ni frais pour toi. Tes locataires verront que l’agence gère le logement.</Note>
      </Modal>
    </div>
  )
}

const Detail = function Detail({
  c, l, dimLabels, busy, subActive, onVisit, onValidate, onRefuse, onWrite, onAuto, onDelegate, innerRef,
}: {
  c: Cand
  l: Listing
  dimLabels: string[]
  busy: boolean
  subActive: boolean
  onVisit: () => void
  onValidate: () => void
  onRefuse: () => void
  onWrite: () => void
  onAuto: () => void
  onDelegate: () => void
  innerRef: React.RefObject<HTMLElement>
}) {
  const write = <Button variant="ghost" icon="chat" onClick={onWrite}>Écrire</Button>
  const dossierPill = (state: string, ok: string, pending: string, missing: string) =>
    state === 'ok' ? <Pill tone="ok" icon="check">{ok}</Pill>
      : state === 'pending' || state === 'declared' ? <Pill tone="info">{pending}</Pill>
      : <Pill tone="bad" icon="alert">{missing}</Pill>

  let actions: React.ReactNode = null
  if (c.status === 'pending' || c.status === 'waitlisted') {
    actions = (
      <div className="mfoot" style={{ justifyContent: 'flex-start' }}>
        <Button variant="main" icon="calendar" disabled={busy} onClick={onVisit}>Proposer une visite</Button>
        {write}
        <Button variant="ghost" onClick={onRefuse}>Refuser</Button>
      </div>
    )
  } else if (c.status === 'visit_proposed') {
    actions = (
      <>
        <Note icon="calendar" className="mt">
          {c.visit
            ? <><b>Visite prévue {longDateTime(`${c.visit.date}T${c.visit.time}:00`).toLowerCase()}.</b> Après la visite, valide le dossier pour passer à la suite.</>
            : <><b>Visite proposée.</b> {c.firstName} choisit un de tes créneaux. <a className="link" href={`/app/annonces/${l.id}/creneaux`}>Gérer mes créneaux</a></>}
        </Note>
        <div className="mfoot" style={{ justifyContent: 'flex-start' }}>
          <Button variant="main" disabled={busy} onClick={onValidate}>Valider le dossier</Button>
          {write}
          <Button variant="ghost" onClick={onRefuse}>Refuser</Button>
        </div>
      </>
    )
  } else if (c.status === 'accepted') {
    if (l.mode === 'autogestion') {
      actions = (
        <>
          <div className="hr" />
          <div className="phead" style={{ marginBottom: 8 }}><h3>Préparer le bail</h3><Pill tone="brand">Autogestion</Pill></div>
          <p className="soft">Ce logement est géré avec ISALY. Le bail de {c.firstName} se prépare et se signe en ligne depuis Mes baux.</p>
          <div className="mfoot" style={{ justifyContent: 'flex-start' }}>
            {subActive
              ? <Button variant="main" icon="contract" href={`/app/baux/nouveau?tenant=${c.userId}&listing=${l.id}`}>Préparer le bail de {c.firstName}</Button>
              : <Button variant="main" href="/app/paiement">Réactiver l’abonnement</Button>}
            {write}
          </div>
        </>
      )
    } else if (l.mode === 'delegue') {
      actions = <Note icon="building" className="mt"><b>Dossier transmis à l’agence partenaire.</b> L’agence gère désormais le bail et la location de {l.title}.</Note>
    } else {
      const off = !l.agency
      actions = (
        <>
          <div className="hr" />
          <div className="phead" style={{ marginBottom: 6 }}><h3>Choisis comment gérer ce logement</h3></div>
          <p className="soft" style={{ marginBottom: 14 }}>Le dossier de {c.firstName} est {c.dossier.identity === 'ok' && c.dossier.income === 'ok' ? 'complet' : 'validé'}. Ton choix s’applique à tout le logement, et tes locataires verront qui le gère.</p>
          <div className="pathpick">
            <div className={off ? 'pick off' : 'pick'}>
              <Ico name="building" tone="warn" size={20} />
              <h4>Confier à une agence partenaire</h4>
              <p>{off
                ? `Aucune agence partenaire n’est encore active${l.city ? ` à ${l.city}` : ''}. Cette option s’ouvrira dès qu’une agence rejoindra ISALY dans ta ville.`
                : `${l.agency!.name} est active${l.city ? ` à ${l.city}` : ''}. ISALY lui transmet le dossier, puis l’agence gère le bail et la location. Aucun abonnement pour toi. Le logement passe en lecture seule sur ISALY.`}</p>
              <Button variant="glass" disabled={off || busy} onClick={onDelegate}>Transmettre le dossier</Button>
            </div>
            <div className="pick">
              <Ico name="house" tone="brand" size={20} />
              <h4>Gérer avec ISALY</h4>
              <p>Bail en ligne, loyers et quittances, maintenance, préavis : tout se pilote depuis ton tableau de bord, avec ton abonnement autogestion. Aucune commission par locataire.</p>
              {subActive
                ? <Button variant="main" disabled={busy} onClick={onAuto}>Gérer avec ISALY</Button>
                : <Button variant="main" href="/app/paiement">Activer l’abonnement</Button>}
            </div>
          </div>
        </>
      )
    }
  } else if (c.status === 'rejected') {
    actions = <Note className="mt">Candidature refusée. {c.firstName} a été prévenu.</Note>
  }

  return (
    <section className="panel" ref={innerRef} aria-label={`Candidature de ${c.firstName}`} style={{ scrollMarginTop: 84 }}>
      <div className="acts" style={{ gap: 14, flexWrap: 'nowrap', alignItems: 'center' }}>
        <Bubble name={c.firstName} color={personColor(c.userId)} size={64} avatar={c.avatarUrl} />
        <span className="grow">
          <span className="t" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.035em' }}>{c.firstName}</span>
          <span className="s">{[c.job, c.moveIn ? `Arrivée souhaitée le ${dayMonth(c.moveIn)}` : null].filter(Boolean).join('. ')}{c.job || c.moveIn ? '.' : ''}</span>
        </span>
        {!c.first && c.score != null && (
          <span style={{ textAlign: 'right' }}>
            <span className="big gradtext num" style={{ display: 'block' }}>{pc(c.score)}</span>
            <span className="s">avec la coloc</span>
          </span>
        )}
      </div>
      {c.message && <div className="note mt" style={{ background: 'var(--bg-2)' }}><Icon name="chat" size={18} /><span>{c.message}</span></div>}
      {c.first ? (
        <Note className="mt"><b>Premier colocataire du logement.</b> Le matching démarre à partir du deuxième : pour {c.firstName}, le dossier vérifié suffit.</Note>
      ) : c.score != null ? (
        <div className="v-grid g2 mt">
          <div>
            <span className="flabel">Avec chaque colocataire</span>
            <div className="bars" style={{ marginTop: 10 }}>{c.per.filter(x => x.score != null).map(x => <BarRow key={x.id} label={x.firstName} value={x.score ?? 0} />)}</div>
          </div>
          {c.dims && (
            <div>
              <span className="flabel">Sur les 5 dimensions</span>
              <div className="bars" style={{ marginTop: 10 }}>{dimLabels.map((dl, i) => <BarRow key={dl} label={dl} value={c.dims![i] ?? 0} />)}</div>
            </div>
          )}
        </div>
      ) : (
        <Note className="mt">{c.firstName} ou tes colocataires n’ont pas encore fait le test : la compatibilité s’affichera dès que possible.</Note>
      )}
      <div className="hr" />
      <span className="flabel">Dossier</span>
      <div className="chips" style={{ marginTop: 10 }}>
        {dossierPill(c.dossier.identity, 'Identité vérifiée', 'Identité en vérification', 'Identité manquante')}
        {dossierPill(c.dossier.income, 'Revenus vérifiés', 'Revenus en vérification', 'Revenus manquants')}
        {dossierPill(c.dossier.guarantor, 'Garant vérifié', 'Garant en vérification', 'Garant manquant')}
      </div>
      {actions}
    </section>
  )
}
