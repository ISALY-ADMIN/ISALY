'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bubble, Button, EmptyState, Ico, Pill, Segmented, SkelPanel, dayMonth, personColor, useToast } from '@/components/ui-v2'
import { CAT_LABELS, ISSUE_STATUS } from '@/components/ui-v2/screens/Maison'

interface Req {
  id: string
  title: string
  category: string
  description: string
  status: string
  urgency: string
  createdAt: string
  comment: string
  photos: string[]
  resolvedPhoto: string | null
  address: string
  by: { id: string; firstName: string; avatarUrl: string | null }
}
type MF = 'all' | 'open' | 'progress' | 'done'
const matches = (r: Req, f: MF) => f === 'all' || (f === 'open' ? r.status === 'sent' || r.status === 'received' : f === 'progress' ? r.status === 'in_progress' : r.status === 'resolved')

export default function Maintenance() {
  const router = useRouter()
  const params = useSearchParams()
  const toast = useToast()
  const [d, setD] = useState<{ requests: Req[]; autogestionActive: boolean } | null>(null)
  const [error, setError] = useState(false)
  const [mf, setMf] = useState<MF>('all')
  const [sel, setSel] = useState<string | null>(params.get('signalement'))
  const detail = useRef<HTMLElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/v2/maintenance', { cache: 'no-store' })
      if (res.status === 401) return router.push('/auth/login')
      if (!res.ok) throw new Error()
      setD(await res.json())
      setError(false)
    } catch {
      setError(true)
    }
  }, [router])

  useEffect(() => { load() }, [load])

  // Nouveaux signalements en temps réel (callback posé avant subscribe()).
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel(`v2-maint:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'maintenance_requests' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  const list = useMemo(() => (d?.requests ?? []).filter(r => matches(r, mf)), [d, mf])
  const cur = list.find(r => r.id === sel) ?? list[0] ?? null
  const count = (f: MF) => (d?.requests ?? []).filter(r => matches(r, f)).length

  if (error && !d) return <EmptyState icon="alert" tone="bad" title="La maintenance n’a pas pu se charger" actions={<Button variant="main" onClick={load}>Réessayer</Button>} />
  if (!d) return <div className="cands"><SkelPanel lines={5} /><SkelPanel lines={6} /></div>

  return (
    <div className="screen">
      <div className="toolbar">
        <Segmented
          options={[
            { value: 'all', label: <>Tous <span className="n">{count('all')}</span></> },
            { value: 'open', label: <>Ouverts <span className="n">{count('open')}</span></> },
            { value: 'progress', label: <>En cours <span className="n">{count('progress')}</span></> },
            { value: 'done', label: <>Résolus <span className="n">{count('done')}</span></> },
          ]}
          value={mf} onChange={v => { setMf(v); setSel(null) }} label="Filtrer les signalements"
        />
      </div>
      {!d.requests.length ? (
        <EmptyState icon="wrench" tone="ok" title="Aucun signalement" text="Les problèmes signalés par tes locataires apparaîtront ici, avec leur suivi." />
      ) : (
        <div className="cands">
          <section className="panel" style={{ padding: 10 }} aria-label="Liste des signalements">
            {list.length ? list.map(m => {
              const [label, tone] = ISSUE_STATUS[m.status] ?? ['Ouvert', 'bad']
              return (
                <button key={m.id} className="cand" type="button" aria-current={cur?.id === m.id}
                  onClick={() => { setSel(m.id); if (window.innerWidth <= 900) setTimeout(() => detail.current?.scrollIntoView({ behavior: 'smooth' }), 50) }}>
                  <Ico name="wrench" tone={tone} />
                  <span className="grow"><span className="t">{m.title}</span><span className="s">{m.address}, {dayMonth(m.createdAt)}</span></span>
                  <Pill tone={tone}>{label}</Pill>
                </button>
              )
            }) : <p className="s" style={{ padding: 14 }}>Aucun signalement ici.</p>}
          </section>
          {cur && <Detail key={cur.id} m={cur} ro={!d.autogestionActive} innerRef={detail} onSaved={msg => { toast(msg); load() }} onError={msg => toast(msg)} />}
        </div>
      )}
      <p className="s mt">Les logements confiés à une agence partenaire n’apparaissent pas ici : l’agence traite leurs signalements.</p>
    </div>
  )
}

function Detail({ m, ro, innerRef, onSaved, onError }: { m: Req; ro: boolean; innerRef: React.RefObject<HTMLElement>; onSaved: (msg: string) => void; onError: (msg: string) => void }) {
  const [status, setStatus] = useState(m.status)
  const openValue = m.status === 'received' ? 'received' : 'sent'
  const [note, setNote] = useState(m.comment)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [label, tone] = ISSUE_STATUS[m.status] ?? ['Ouvert', 'bad']

  async function save(e: React.FormEvent, photoUrl?: string) {
    e.preventDefault()
    setBusy(true)
    const res = await fetch(`/api/maintenance/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, bailleur_comment: note, ...(photoUrl ? { resolved_photo_url: photoUrl } : {}) }),
    })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return onError(j.error ?? 'Le signalement n’a pas pu être mis à jour')
    onSaved(`${m.by.firstName} est prévenu`)
  }

  async function photo(file: File) {
    const supabase = createClient()
    const path = `maintenance/resolution-${m.id}-${Date.now()}.${file.name.split('.').pop() ?? 'jpg'}`
    const { error } = await supabase.storage.from('documents').upload(path, file)
    if (error) return onError('La photo n’a pas pu être envoyée')
    const url = supabase.storage.from('documents').getPublicUrl(path).data.publicUrl
    await save({ preventDefault() {} } as React.FormEvent, url)
  }

  return (
    <section className="panel" ref={innerRef} aria-label={`Signalement : ${m.title}`} style={{ scrollMarginTop: 84 }}>
      <div className="hrow">
        <span>
          <span className="t" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.03em' }}>{m.title}</span>
          <span className="s">{CAT_LABELS[m.category] ?? m.category}, {m.address}{m.urgency === 'urgent' ? ', urgent' : ''}</span>
        </span>
        <Pill tone={tone}>{label}</Pill>
      </div>
      <div className="acts mt" style={{ gap: 10, flexWrap: 'nowrap' }}>
        <Bubble name={m.by.firstName} color={personColor(m.by.id)} size={34} avatar={m.by.avatarUrl} />
        <span className="s">Signalé par <b style={{ color: 'var(--ink)' }}>{m.by.firstName}</b>, le {dayMonth(m.createdAt)}</span>
      </div>
      {m.description && <p className="mt">{m.description}</p>}
      {m.photos.length > 0 && (
        <div className="acts mt">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {m.photos.map((p, i) => <a key={p} href={p} target="_blank" rel="noreferrer"><img src={p} alt={`Photo ${i + 1} du signalement`} className="thumb" style={{ objectFit: 'cover' }} /></a>)}
        </div>
      )}
      <div className="hr" />
      <form className="form" onSubmit={save}>
        <div className="field"><label htmlFor="mst">Statut</label>
          <select id="mst" className="select" value={status} disabled={ro} onChange={e => setStatus(e.target.value)}>
            <option value={openValue}>Ouvert</option>
            <option value="in_progress">En cours</option>
            <option value="resolved">Résolu</option>
          </select>
        </div>
        <div className="field"><label htmlFor="mnote">Réponse à {m.by.firstName}</label>
          <textarea id="mnote" className="textarea" disabled={ro} value={note} onChange={e => setNote(e.target.value)} placeholder="Par exemple : le plombier passe mardi à 9 h" />
        </div>
        <div className="acts">
          <Button variant="main" type="submit" disabled={ro || busy}>Enregistrer et prévenir {m.by.firstName}</Button>
          <Button variant="glass" icon="image" disabled={ro || busy} onClick={() => fileRef.current?.click()}>Photo de résolution</Button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) photo(f); e.target.value = '' }} />
        </div>
        {ro && <p className="s">Lecture seule : ton abonnement autogestion est inactif. <a className="link" href="/app/paiement">Le réactiver</a></p>}
      </form>
    </section>
  )
}
