'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toggleListingFavorite } from '@/lib/favorites'
import { track } from '@/lib/analytics'
import {
  Art, BarRow, Button, Chip, EmptyState, Icon, Modal, Pill, Segmented, SkelPanel,
  eur, m2, pc, NNBSP, useToast, type SegOption,
} from '@/components/ui-v2'
import { ListingCard, colocPeople, placeOf } from '@/components/ui-v2/ListingCard'
import { ListingDetailModal, availabilityLabel, type DetailListing } from '@/components/ui-v2/ListingDetailModal'
import { useShell } from '@/components/ui-v2/shell/AppShell'

const TrouverMap = dynamic(() => import('@/components/ui-v2/TrouverMap'), { ssr: false })

type Vue = 'swipe' | 'liste' | 'carte' | 'favoris'
const VUES: Vue[] = ['swipe', 'liste', 'carte', 'favoris']

interface TListing extends DetailListing {
  description: string
  coords: [number, number] | null
  boosted: boolean
  occupancy: { current: number; total: number }
}
interface Data {
  listings: TListing[]
  swiped: string[]
  requested: string[]
  favorites: string[]
  quota: { used: number; limit: number; plus: boolean }
  criteria: { city: string | null; budgetMax: number | null }
  dimLabels: string[]
}

type FilterKey = 'city' | 'budget' | 'meuble'

export default function Trouver() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const toast = useToast()
  const { refresh: refreshShell } = useShell()
  const vueParam = params.get('vue') as Vue | null
  const vue: Vue = vueParam && VUES.includes(vueParam) ? vueParam : 'swipe'

  const [d, setD] = useState<Data | null>(null)
  const [error, setError] = useState(false)
  const [filters, setFilters] = useState<Set<FilterKey>>(new Set<FilterKey>(['city', 'budget']))
  const [favs, setFavs] = useState<Set<string>>(new Set())
  const [swiped, setSwiped] = useState<Set<string>>(new Set())
  const [asked, setAsked] = useState<Set<string>>(new Set())
  const [used, setUsed] = useState(0)
  const [detail, setDetail] = useState<string | null>(null)
  const [mapSel, setMapSel] = useState<string | null>(null)
  const [alertOpen, setAlertOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/v2/trouver', { cache: 'no-store' })
      if (res.status === 401) return router.push('/auth/login')
      if (!res.ok) throw new Error(String(res.status))
      const j = (await res.json()) as Data
      setD(j)
      setFavs(new Set(j.favorites))
      setSwiped(new Set(j.swiped))
      setAsked(new Set(j.requested))
      setUsed(j.quota.used)
      setError(false)
    } catch {
      setError(true)
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  const setVue = (v: Vue) => {
    const q = new URLSearchParams(params.toString())
    if (v === 'swipe') q.delete('vue')
    else q.set('vue', v)
    router.replace(`${pathname}${q.toString() ? `?${q}` : ''}`, { scroll: false })
  }

  const filtered = useMemo(() => {
    if (!d) return []
    return d.listings.filter(l => {
      if (filters.has('city') && d.criteria.city) {
        const c = d.criteria.city.toLowerCase()
        if (!l.city.toLowerCase().includes(c) && !(l.neighborhood ?? '').toLowerCase().includes(c)) return false
      }
      if (filters.has('budget') && d.criteria.budgetMax && l.rent + (l.charges ?? 0) > d.criteria.budgetMax) return false
      if (filters.has('meuble') && l.meuble === false) return false
      return true
    })
  }, [d, filters])

  const deck = useMemo(() => filtered.filter(l => !swiped.has(l.id)), [filtered, swiped])
  const plus = !!d?.quota.plus
  const limit = d?.quota.limit ?? 10
  const left = Math.max(0, limit - used)

  const byId = useMemo(() => new Map((d?.listings ?? []).map(l => [l.id, l])), [d])
  const current = detail ? byId.get(detail) ?? null : null

  async function toggleFav(id: string) {
    const next = await toggleListingFavorite(id)
    if (next === null) return
    setFavs(s => {
      const n = new Set(s)
      if (next) n.add(id)
      else n.delete(id)
      return n
    })
    toast(next ? 'Ajoutée à tes favoris' : 'Retirée de tes favoris')
  }

  /** Demande (candidature existante) ; depuis la pile, le swipe est enregistré d'abord. */
  async function sendRequest(l: TListing, fromSwipe: boolean): Promise<boolean> {
    if (fromSwipe) {
      const res = await fetch('/api/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ swipedId: l.ownerId ?? l.id, direction: 'right', listing_id: l.id }),
      })
      if (res.status === 429) {
        setUsed(limit)
        toast('Tu as utilisé tes 10 swipes du jour')
        return false
      }
    }
    const res = await fetch('/api/candidatures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: l.id }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      toast(j.error ?? 'La demande n’a pas pu être envoyée')
      return false
    }
    setAsked(s => new Set(s).add(l.id))
    toast(`Demande envoyée à la coloc ${placeOf(l)}`)
    refreshShell()
    return true
  }

  async function doSwipe(dir: 'yes' | 'no'): Promise<void> {
    const l = deck[0]
    if (!l || busy) return
    if (!plus && left <= 0) return
    setBusy(true)
    if (dir === 'yes') track.swipeRight('listing')
    else track.swipeLeft('listing')
    try {
      if (dir === 'yes') {
        const ok = await sendRequest(l, true)
        if (!ok) return
      } else {
        const res = await fetch('/api/swipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ swipedId: l.ownerId ?? l.id, direction: 'left', listing_id: l.id }),
        })
        if (res.status === 429) {
          setUsed(limit)
          toast('Tu as utilisé tes 10 swipes du jour')
          return
        }
      }
      setSwiped(s => new Set(s).add(l.id))
      if (!plus) setUsed(u => u + 1)
    } finally {
      setBusy(false)
    }
  }

  if (error && !d) {
    return (
      <EmptyState icon="alert" tone="bad" title="Les annonces n’ont pas pu se charger" text="Vérifie ta connexion puis réessaie."
        actions={<Button variant="main" onClick={load}>Réessayer</Button>} />
    )
  }

  const chips: { k: FilterKey; label: string }[] = []
  if (d?.criteria.city) chips.push({ k: 'city', label: d.criteria.city })
  if (d?.criteria.budgetMax) chips.push({ k: 'budget', label: `Jusqu’à ${eur(d.criteria.budgetMax)}` })
  chips.push({ k: 'meuble', label: 'Meublé' })

  const vueOpts: SegOption<Vue>[] = [
    { value: 'swipe', label: 'Swipe', icon: 'cards' },
    { value: 'liste', label: 'Liste', icon: 'list' },
    { value: 'carte', label: 'Carte', icon: 'map' },
    { value: 'favoris', label: 'Favoris', icon: 'heart' },
  ]

  let body: React.ReactNode
  if (!d) {
    body = <div className="v-grid g2"><SkelPanel lines={6} height={420} /><SkelPanel lines={5} /></div>
  } else if (vue === 'swipe') {
    body = (
      <SwipeView
        deck={deck}
        plus={plus}
        left={left}
        limit={limit}
        busy={busy}
        dimLabels={d.dimLabels}
        favs={favs}
        onSwipe={doSwipe}
        onFav={toggleFav}
        onDetail={setDetail}
        onAlert={() => setAlertOpen(true)}
        onRestart={() => setSwiped(new Set())}
        onList={() => setVue('liste')}
        modalOpen={!!detail || alertOpen}
      />
    )
  } else if (vue === 'liste') {
    body = filtered.length ? (
      <div className="gridcards">
        {filtered.map(l => <ListingCard key={l.id} l={l} fav={favs.has(l.id)} onOpen={setDetail} onFav={(id, on) => setFavs(s => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n })} />)}
      </div>
    ) : (
      <EmptyState icon="compass" title="Aucune annonce avec ces filtres" text="Retire un filtre ou crée une alerte : tu es prévenu dès qu’une nouvelle coloc te correspond."
        actions={<Button variant="main" onClick={() => setAlertOpen(true)}>Créer une alerte</Button>} />
    )
  } else if (vue === 'carte') {
    const sel = (mapSel && byId.get(mapSel)) || filtered[0] || null
    body = (
      <div className="mapwrap">
        <TrouverMap pins={filtered.map(l => ({ id: l.id, rent: l.rent + (l.charges ?? 0), coords: l.coords }))} selected={sel?.id ?? null} onSelect={setMapSel} />
        {sel && (
          <div className="mapcard" style={{ zIndex: 500 }}>
            <Art id={sel.id} photo={sel.photo} className="thumb" />
            <div className="grow">
              <span className="t">{placeOf(sel)}</span>
              <span className="s">{eur(sel.rent + (sel.charges ?? 0))} par mois{sel.score != null ? `, ${pc(sel.score)} avec la coloc` : ''}</span>
            </div>
            <Button variant="main" size="sm" onClick={() => setDetail(sel.id)}>Voir</Button>
          </div>
        )}
      </div>
    )
  } else {
    const list = d.listings.filter(l => favs.has(l.id))
    body = list.length ? (
      <div className="gridcards">
        {list.map(l => <ListingCard key={l.id} l={l} fav onOpen={setDetail} onFav={(id, on) => setFavs(s => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n })} />)}
      </div>
    ) : (
      <EmptyState icon="heart" title="Pas encore de favoris" text="Touche le cœur d’une annonce pour la retrouver ici."
        actions={<Button variant="main" onClick={() => setVue('swipe')}>Voir les annonces</Button>} />
    )
  }

  return (
    <div className="screen">
      <div className="toolbar">
        <Segmented options={vueOpts} value={vue} onChange={setVue} label="Affichage des annonces" />
        <div className="filters">
          {chips.map(c => (
            <button key={c.k} type="button" className="fchip" aria-pressed={filters.has(c.k)}
              onClick={() => setFilters(s => { const n = new Set(s); if (n.has(c.k)) n.delete(c.k); else n.add(c.k); return n })}>
              {c.label}
            </button>
          ))}
          <Button variant="glass" size="sm" icon="bell" onClick={() => setAlertOpen(true)}>Créer une alerte</Button>
        </div>
      </div>
      {body}

      <ListingDetailModal
        l={current}
        open={!!current}
        onClose={() => setDetail(null)}
        dimLabels={d?.dimLabels ?? []}
        asked={!!current && asked.has(current.id)}
        fav={!!current && favs.has(current.id)}
        onFav={() => current && toggleFav(current.id)}
        busy={busy}
        onAsk={async () => {
          if (!current) return
          setBusy(true)
          const ok = await sendRequest(current, false)
          setBusy(false)
          if (ok) setDetail(null)
        }}
      />
      <AlertModal open={alertOpen} onClose={() => setAlertOpen(false)} city={d?.criteria.city ?? ''} budget={d?.criteria.budgetMax ?? null} />
    </div>
  )
}

/* ── Vue Swipe ────────────────────────────────────────────────────── */
function SwipeView({
  deck, plus, left, limit, busy, dimLabels, favs, onSwipe, onFav, onDetail, onAlert, onRestart, onList, modalOpen,
}: {
  deck: TListing[]
  plus: boolean
  left: number
  limit: number
  busy: boolean
  dimLabels: string[]
  favs: Set<string>
  onSwipe: (d: 'yes' | 'no') => Promise<void>
  onFav: (id: string) => void
  onDetail: (id: string) => void
  onAlert: () => void
  onRestart: () => void
  onList: () => void
  modalOpen: boolean
}) {
  const card = useRef<HTMLElement>(null)
  const yes = useRef<HTMLSpanElement>(null)
  const no = useRef<HTMLSpanElement>(null)
  const drag = useRef<{ id: number | null; x0: number; dx: number }>({ id: null, x0: 0, dx: 0 })
  const l = deck[0]
  const next = deck[1]
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const fly = useCallback(async (dir: 'yes' | 'no') => {
    const el = card.current
    if (el && !reduce) {
      el.style.transition = 'transform .32s cubic-bezier(.2,.8,.2,1), opacity .32s'
      el.style.transform = `translateX(${dir === 'yes' ? 140 : -140}%) rotate(${dir === 'yes' ? 18 : -18}deg)`
      el.style.opacity = '0'
      await new Promise(r => setTimeout(r, 300))
    }
    await onSwipe(dir)
    if (el) {
      el.style.transition = 'none'
      el.style.transform = ''
      el.style.opacity = ''
      if (yes.current) yes.current.style.opacity = '0'
      if (no.current) no.current.style.opacity = '0'
    }
  }, [onSwipe, reduce])

  // Flèches du clavier : droite = demande, gauche = passer.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase() ?? ''
      if (['input', 'textarea', 'select'].includes(tag) || modalOpen) return
      if (e.key === 'ArrowRight') { e.preventDefault(); fly('yes') }
      if (e.key === 'ArrowLeft') { e.preventDefault(); fly('no') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fly, modalOpen])

  if (!plus && left <= 0) {
    return (
      <EmptyState icon="spark" title="Tu as utilisé tes 10 swipes du jour"
        text="Ils reviennent demain. Avec Swiper Plus, tu n’as plus de limite quotidienne et tes demandes passent en priorité."
        style={{ maxWidth: 600, margin: '0 auto' }}
        actions={<><Button variant="main" href="/app/paiement">Passer à Swiper Plus</Button><Button variant="glass" onClick={onList}>Voir la liste</Button></>} />
    )
  }
  if (!l) {
    return (
      <EmptyState icon="check" tone="ok" title="Tu as vu toutes les annonces compatibles"
        text="Crée une alerte : tu es prévenu dès qu’une nouvelle coloc te correspond."
        style={{ maxWidth: 600, margin: '0 auto' }}
        actions={<><Button variant="main" onClick={onAlert}>Créer une alerte</Button><Button variant="glass" onClick={onRestart}>Revoir les annonces</Button></>} />
    )
  }

  const onDown = (e: React.PointerEvent) => {
    if (e.button > 0 || (e.target as HTMLElement).closest('button')) return
    drag.current = { id: e.pointerId, x0: e.clientX, dx: 0 }
    card.current?.setPointerCapture(e.pointerId)
    if (card.current) card.current.style.transition = 'none'
  }
  const onMove = (e: React.PointerEvent) => {
    if (drag.current.id !== e.pointerId || !card.current) return
    const dx = e.clientX - drag.current.x0
    drag.current.dx = dx
    card.current.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`
    if (yes.current) yes.current.style.opacity = String(Math.max(0, Math.min(1, dx / 110)))
    if (no.current) no.current.style.opacity = String(Math.max(0, Math.min(1, -dx / 110)))
  }
  const onUp = (e: React.PointerEvent) => {
    if (drag.current.id !== e.pointerId) return
    drag.current.id = null
    const dx = drag.current.dx
    if (Math.abs(dx) > 110) {
      fly(dx > 0 ? 'yes' : 'no')
      return
    }
    if (card.current) {
      card.current.style.transition = 'transform .35s cubic-bezier(.16,1,.3,1)'
      card.current.style.transform = ''
    }
    if (yes.current) yes.current.style.opacity = '0'
    if (no.current) no.current.style.opacity = '0'
  }

  return (
    <div className="swipe-grid">
      <div className="deckzone">
        <div className="deck">
          {next && (
            <article className="scard behind" aria-hidden="true">
              <CardInner l={next} behind />
            </article>
          )}
          <article
            key={l.id}
            ref={card}
            className="scard"
            tabIndex={0}
            aria-label={`${placeOf(l)}${l.score != null ? `, ${l.score} pour cent avec la coloc` : ''}. Flèche droite pour envoyer une demande, flèche gauche pour passer.`}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            <CardInner l={l} fav={favs.has(l.id)} onFav={() => onFav(l.id)} />
            <span ref={yes} className="stamp yes" aria-hidden="true">Demande</span>
            <span ref={no} className="stamp no" aria-hidden="true">Passer</span>
          </article>
        </div>
        <div className="deck-acts">
          <button className="round no" type="button" aria-label="Passer" disabled={busy} onClick={() => fly('no')}><Icon name="x" size={26} /></button>
          <button className="round info" type="button" aria-label="Voir le détail de l’annonce" onClick={() => onDetail(l.id)}><Icon name="info" size={22} /></button>
          <button className="round yes" type="button" aria-label="Envoyer une demande" disabled={busy} onClick={() => fly('yes')}><Icon name="check" size={30} /></button>
        </div>
        {plus ? (
          <Pill tone="brand" icon="spark">Swiper Plus : sans limite</Pill>
        ) : (
          <span className="left-count">
            <span className="left-dots" aria-hidden="true">
              {Array.from({ length: limit }, (_, i) => <i key={i} className={i < left ? 'on' : ''} />)}
            </span>
            {left} swipe{left > 1 ? 's' : ''} restant{left > 1 ? 's' : ''} aujourd’hui
          </span>
        )}
      </div>
      <WhyPanel l={l} dimLabels={dimLabels} />
    </div>
  )
}

function CardInner({ l, behind, fav, onFav }: { l: TListing; behind?: boolean; fav?: boolean; onFav?: () => void }) {
  return (
    <>
      <Art id={l.id} photo={l.photo}>
        {l.score != null && <span className="disc"><b>{pc(l.score)}</b><small>avec la coloc</small></span>}
        {!behind && (
          <button className="fav" type="button" aria-pressed={!!fav} aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} onClick={e => { e.stopPropagation(); onFav?.() }}>
            <Icon name="heart" size={20} />
          </button>
        )}
      </Art>
      <div className="scard-body">
        <h3>{placeOf(l)}</h3>
        <p>
          {l.surface ? `Chambre de ${m2(l.surface)}` : l.title}
          {l.occupancy.total > 1 ? ` dans une coloc de ${l.occupancy.total}` : ''}
          {l.meuble == null ? '' : l.meuble ? ', meublée' : ', non meublée'}
        </p>
        <div className="meta">
          <b>{eur(l.rent + (l.charges ?? 0))}</b>
          <span>charges comprises</span>
          <span>{availabilityLabel(l.availableFrom)}</span>
        </div>
        {l.colocs.length > 0 && (
          <div className="chips" style={{ marginTop: 8 }}>
            {colocPeople(l.colocs).map((p, i) => <Chip key={i} person={p} />)}
          </div>
        )}
      </div>
    </>
  )
}

function WhyPanel({ l, dimLabels }: { l: TListing; dimLabels: string[] }) {
  return (
    <aside className="panel why">
      {l.score != null && l.dimensions ? (
        <>
          <div className="phead"><h2>Pourquoi {pc(l.score)}{NNBSP}?</h2></div>
          <p className="soft">Ton profil comparé à celui des colocataires, sur les 5 dimensions du test.</p>
          <div className="bars dims">{dimLabels.map((d, i) => <BarRow key={d} label={d} value={l.dimensions![i] ?? 0} />)}</div>
          <span className="flabel">Avec chacun</span>
          <div className="chips" style={{ marginTop: 8 }}>{colocPeople(l.colocs).map((p, i) => <Chip key={i} person={p} />)}</div>
        </>
      ) : (
        <>
          <div className="phead"><h2>{l.colocs.length ? 'Compatibilité à venir' : 'Premier colocataire'}</h2></div>
          <p className="soft">
            {l.colocs.length
              ? 'Tes futurs colocataires n’ont pas encore tous fait le test : le score s’affichera dès que possible.'
              : 'Personne n’habite encore ce logement : pour le premier occupant, ton dossier vérifié suffit.'}
          </p>
        </>
      )}
      <div className="hr" />
      <div className="rows">
        <div className="row"><span className="ico"><Icon name="calendar" size={18} /></span><span className="grow"><span className="t">{availabilityLabel(l.availableFrom)}</span><span className="s">Disponibilité</span></span></div>
        <div className="row"><span className="ico"><Icon name="euro" size={18} /></span><span className="grow"><span className="t">{eur(l.rent + (l.charges ?? 0))} par mois</span><span className="s">Charges comprises</span></span></div>
      </div>
    </aside>
  )
}

/* ── Créer une alerte (alertes de recherche existantes) ──────────── */
function AlertModal({ open, onClose, city, budget }: { open: boolean; onClose: () => void; city: string; budget: number | null }) {
  const toast = useToast()
  const [ville, setVille] = useState(city)
  const [max, setMax] = useState(budget ? String(budget) : '')
  const [freq, setFreq] = useState<'now' | 'day'>('now')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (open) {
      setVille(city)
      setMax(budget ? String(budget) : '')
    }
  }, [open, city, budget])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const b = parseInt(max.replace(/\D/g, ''), 10)
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // « Dès qu'une annonce sort » : notification immédiate ; « une fois par
      // jour » : le résumé quotidien par e-mail (cron search-alerts).
      body: JSON.stringify({ city: ville, budget_max: Number.isFinite(b) ? b : null, notify_push: freq === 'now', notify_email: true }),
    }).catch(() => null)
    setSaving(false)
    if (!res || !res.ok) {
      toast('L’alerte n’a pas pu être créée')
      return
    }
    onClose()
    toast(`Alerte créée : ${ville || 'toutes les villes'}${Number.isFinite(b) ? `, jusqu’à ${eur(b)}` : ''}`)
  }

  return (
    <Modal open={open} onClose={onClose} title="Créer une alerte" lead="Tu es prévenu dès qu’une coloc correspond à ces critères.">
      <form className="form mt" onSubmit={submit}>
        <div className="f2">
          <div className="field"><label htmlFor="aville">Ville</label><input id="aville" className="input" value={ville} onChange={e => setVille(e.target.value)} /></div>
          <div className="field"><label htmlFor="abudget">Budget maximum</label><input id="abudget" className="input" inputMode="numeric" value={max} onChange={e => setMax(e.target.value)} placeholder="650" /></div>
        </div>
        <div className="field">
          <span className="flabel">Fréquence</span>
          <Segmented options={[{ value: 'now', label: 'Dès qu’une annonce sort' }, { value: 'day', label: 'Une fois par jour' }]} value={freq} onChange={setFreq} label="Fréquence de l’alerte" />
        </div>
        <div className="mfoot">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="main" type="submit" disabled={saving}>Créer l’alerte</Button>
        </div>
      </form>
    </Modal>
  )
}
