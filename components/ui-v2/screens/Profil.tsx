'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/analytics'
import {
  Bubble, Button, COL, EmptyState, Ico, Meter, Modal, Panel, Pill, Radar, Ring, SkelPanel, Toggle,
  dayMonth, eur, pc, useToast, NNBSP,
} from '@/components/ui-v2'
import { useShell } from '@/components/ui-v2/shell/AppShell'

interface Data {
  id: string
  email: string
  firstName: string
  lastName: string
  bio: string
  phone: string
  city: string
  budgetMax: number | null
  avatarUrl: string | null
  certLevel: number
  testDone: boolean
  dims: number[] | null
  dimLabels: string[]
  completion: number
  docs: { type: string; status: string }[]
  score: { score: number; avgResponseHours: number | null; responseRate: number | null } | null
  urgent: { active: boolean; availableFrom: string; expiresAt: string | null }
  listingsCount: number
  listingCities: string[]
}

/* Même modèle de documents que l'ancienne page (bucket « certifications »). */
const BUCKET = 'certifications'
type DocKey = 'identity' | 'income' | 'guarantor' | 'domicile'
const DOC_ROWS: { key: DocKey; label: string; types: string[]; upload: string }[] = [
  { key: 'identity', label: 'Pièce d’identité', types: ['identity', 'identity_front', 'identity_back'], upload: 'identity_front' },
  { key: 'income', label: 'Justificatif de revenus ou de bourse', types: ['payslip'], upload: 'payslip' },
  { key: 'guarantor', label: 'Garant', types: ['guarantor', 'garant'], upload: 'guarantor' },
  { key: 'domicile', label: 'Justificatif de domicile', types: ['domicile'], upload: 'domicile' },
]

async function compressImage(file: File, maxSize = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise(res => canvas.toBlob(b => res(b ?? file), 'image/jpeg', quality))
}

function docState(docs: Data['docs'], row: (typeof DOC_ROWS)[number]): 'ok' | 'pending' | 'bad' | 'missing' {
  const found = docs.filter(d => row.types.includes(d.type))
  if (row.key === 'identity') {
    if (found.some(d => d.type === 'identity' && d.status === 'verified')) return 'ok'
    const front = found.find(d => d.type === 'identity_front')
    const back = found.find(d => d.type === 'identity_back')
    if (front?.status === 'verified' && back?.status === 'verified') return 'ok'
  } else if (found.some(d => d.status === 'verified')) return 'ok'
  if (found.some(d => d.status === 'rejected')) return 'bad'
  if (found.length) return 'pending'
  return 'missing'
}

export default function Profil() {
  const router = useRouter()
  const params = useSearchParams()
  const toast = useToast()
  const { mode, refresh } = useShell()
  const [d, setD] = useState<Data | null>(null)
  const [error, setError] = useState(false)
  const [editInfo, setEditInfo] = useState(false)
  const [editPrefs, setEditPrefs] = useState(false)
  const [idModal, setIdModal] = useState(false)
  const dossierRef = useRef<HTMLElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/v2/profil', { cache: 'no-store' })
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

  useEffect(() => {
    if (d && params.get('section') === 'dossier') dossierRef.current?.scrollIntoView({ block: 'start' })
  }, [d, params])

  // Niveau de certification recalculé comme dans l'ancienne page, puis persisté.
  useEffect(() => {
    if (!d) return
    const has = (t: string) => d.docs.some(x => x.type === t)
    const l1 = !!d.avatarUrl && !!d.firstName && !!d.lastName && d.bio.trim().length > 20 && !!d.city && (d.budgetMax ?? 0) > 0 && !!d.email
    const id = (has('identity_front') && has('identity_back')) || d.docs.some(x => x.type === 'identity' && x.status === 'verified')
    const income = has('payslip') && has('domicile')
    const level = l1 && id && (income || has('garant')) ? 3 : l1 && id ? 2 : l1 ? 1 : 0
    if (level !== d.certLevel) {
      createClient().from('profiles').update({ cert_level: level }).eq('id', d.id).then(() => undefined)
      setD(x => (x ? { ...x, certLevel: level } : x))
    }
  }, [d])

  async function uploadDoc(type: string, file: File) {
    if (!d) return
    const supabase = createClient()
    const isImage = file.type.startsWith('image/')
    const body: Blob = isImage ? await compressImage(file) : file
    const ext = isImage ? 'jpg' : file.name.split('.').pop() || 'pdf'
    const path = `${d.id}/${type}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: isImage ? 'image/jpeg' : file.type || 'application/octet-stream' })
    if (upErr) return toast('Le document n’a pas pu être envoyé')
    const { error: dbErr } = await supabase.from('user_documents').upsert(
      { user_id: d.id, type, file_url: path, storage_path: path, status: 'pending', updated_at: new Date().toISOString() },
      { onConflict: 'user_id,type' },
    )
    if (dbErr) return toast('Le document n’a pas pu être enregistré')
    if (type === 'guarantor') track.garantAdded()
    toast('Document envoyé, en attente de vérification')
    load()
  }

  async function uploadAvatar(file: File) {
    if (!d) return
    const supabase = createClient()
    const compressed = await compressImage(file, 512, 0.85)
    const path = `${d.id}/avatar-${Date.now()}.jpg`
    const { error: e1 } = await supabase.storage.from('avatars').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' })
    if (e1) return toast('La photo n’a pas pu être envoyée')
    const url = `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', d.id)
    toast('Photo mise à jour')
    load()
    refresh()
  }

  if (error && !d) return <EmptyState icon="alert" tone="bad" title="Ton profil n’a pas pu se charger" text="Vérifie ta connexion puis réessaie." actions={<Button variant="main" onClick={load}>Réessayer</Button>} />
  if (!d) return <div className="stackv"><SkelPanel lines={2} /><div className="v-grid g3"><SkelPanel lines={5} /><SkelPanel lines={5} /><SkelPanel lines={5} /></div></div>

  const verified = d.certLevel >= 2 || docState(d.docs, DOC_ROWS[0]) === 'ok'
  const quickReply = d.score?.avgResponseHours != null && d.score.avgResponseHours < 24
  const avatar = (
    <button className="avatar-btn" type="button" aria-label="Changer ma photo" onClick={() => avatarRef.current?.click()}>
      <Bubble name={d.firstName || d.email} color={COL.violet} size={88} avatar={d.avatarUrl} />
    </button>
  )
  const avatarInput = <input ref={avatarRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = '' }} />
  const infoModal = <InfoModal open={editInfo} onClose={() => setEditInfo(false)} d={d} onSaved={() => { load(); refresh() }} />

  /* ── Bailleur ─────────────────────────────────────────────────── */
  if (mode === 'loueur') {
    const where = d.listingCities.length === 1 ? ` à ${d.listingCities[0]}` : ''
    return (
      <div className="screen">
        {avatarInput}
        <section className="panel prof">
          {avatar}
          <div>
            <h2>{[d.firstName, d.lastName].filter(Boolean).join(' ') || 'Mon profil'}</h2>
            <p className="soft" style={{ marginTop: 6 }}>Bailleur particulier{d.listingsCount ? `, ${d.listingsCount} ${d.listingsCount > 1 ? 'logements' : 'logement'}${where}` : ''}.</p>
            <div className="chips" style={{ marginTop: 12 }}>
              {verified ? <Pill tone="ok" icon="shield">Identité vérifiée</Pill> : <Pill tone="warn" icon="shield">Identité à vérifier</Pill>}
              {quickReply && <Pill tone="brand" icon="clock">Répond en moins de 24 h</Pill>}
            </div>
          </div>
          <div className="acts"><Button variant="glass" icon="edit" onClick={() => setEditInfo(true)}>Modifier</Button></div>
        </section>
        <div className="v-grid g2 mt">
          <Panel title="Mes coordonnées">
            <div className="rows">
              <div className="row"><Ico name="mail" /><span className="grow"><span className="t">{d.email}</span><span className="s">Adresse de connexion</span></span></div>
              <div className="row"><Ico name="phone" /><span className="grow"><span className="t">{d.phone || 'Aucun numéro'}</span><span className="s">Visible par tes locataires une fois le bail signé</span></span></div>
            </div>
          </Panel>
          <Panel title="Ce que voient les candidats">
            <div className="acts" style={{ gap: 12, flexWrap: 'nowrap' }}>
              <Bubble name={d.firstName || '?'} color={COL.violet} size={52} avatar={d.avatarUrl} />
              <span><span className="t">{d.firstName || 'Toi'}, bailleur</span><span className="s">{[verified ? 'Identité vérifiée' : null, quickReply ? 'répond en moins de 24 h' : null].filter(Boolean).join(', ') || 'Profil en cours de vérification'}</span></span>
            </div>
            <p className="soft mt">Ton nom complet et ton téléphone restent privés jusqu’à la signature du bail.</p>
            {!verified && <Button variant="glass" size="sm" className="mt" icon="shield" onClick={() => setIdModal(true)}>Vérifier mon identité</Button>}
          </Panel>
        </div>
        {infoModal}
        <IdentityModal open={idModal} onClose={() => setIdModal(false)} onUpload={uploadDoc} />
      </div>
    )
  }

  /* ── Locataire ────────────────────────────────────────────────── */
  const states = DOC_ROWS.map(r => ({ r, s: docState(d.docs, r) }))
  const doneDocs = states.filter(x => x.s === 'ok').length
  const dossierPct = Math.round((doneDocs / DOC_ROWS.length) * 100)
  const score = d.score?.score ?? null

  return (
    <div className="screen">
      {avatarInput}
      <section className="panel prof">
        {avatar}
        <div>
          <h2>{d.firstName || 'Mon profil'}</h2>
          <p className="soft" style={{ marginTop: 6 }}>{d.bio || 'Présente-toi en quelques mots : ton rythme, ce que tu aimes partager en coloc.'}</p>
          <div className="chips" style={{ marginTop: 12 }}>
            {verified ? <Pill tone="ok" icon="shield">Identité vérifiée</Pill> : <Pill tone="warn" icon="shield">Identité à vérifier</Pill>}
            <Pill tone={dossierPct === 100 ? 'ok' : 'warn'}>Dossier complet à {pc(dossierPct)}</Pill>
            {score != null && <Pill tone="brand" icon="spark">ISALY Score {score}</Pill>}
          </div>
        </div>
        <div className="acts"><Button variant="glass" icon="edit" onClick={() => setEditInfo(true)}>Modifier</Button></div>
      </section>

      <div className="v-grid g3 mt">
        <Panel title="Ton profil de coloc">
          {d.dims ? <Radar values={d.dims} labels={d.dimLabels} /> : <p className="soft">Fais le test pour voir ton profil sur les 5 dimensions et ta compatibilité avec chaque coloc.</p>}
          <p className="s" style={{ textAlign: 'center' }}>15 questions, environ 3 minutes.</p>
          <Button variant="glass" block className="mt" href="/app/quiz">{d.testDone ? 'Refaire le test' : 'Faire le test'}</Button>
        </Panel>
        <section className="panel" ref={dossierRef} id="dossier" style={{ scrollMarginTop: 90 }}>
          <div className="phead"><h2>Ton dossier</h2><Pill tone={doneDocs === DOC_ROWS.length ? 'ok' : 'warn'}>{doneDocs} sur {DOC_ROWS.length}</Pill></div>
          <Meter value={dossierPct} style={{ marginBottom: 8 }} />
          <div className="rows">
            {states.map(({ r, s }) => (
              <div key={r.key} className="row">
                <span className="grow"><span className="t">{r.label}</span></span>
                {s === 'ok' && <Pill tone="ok" icon="check">{r.key === 'identity' ? 'Vérifiée' : 'Vérifié'}</Pill>}
                {s === 'pending' && <Pill tone="info">En vérification</Pill>}
                {(s === 'missing' || s === 'bad') && (
                  r.key === 'identity'
                    ? <Button variant="main" size="sm" onClick={() => setIdModal(true)}>{s === 'bad' ? 'Renvoyer' : 'Ajouter'}</Button>
                    : <UploadButton label={s === 'bad' ? 'Renvoyer' : 'Ajouter'} onFile={f => uploadDoc(r.upload, f)} />
                )}
              </div>
            ))}
          </div>
        </section>
        <Panel title="ISALY Score">
          <div style={{ display: 'grid', justifyItems: 'center', gap: 12 }}>
            <Ring value={score ?? 0} max={100} size={132}><b className="num">{score ?? '-'}</b><small>sur 100</small></Ring>
          </div>
          <div className="rows mt">
            <div className="row"><Ico name="doc" /><span className="grow"><span className="t">Complète ton dossier</span></span></div>
            <div className="row"><Ico name="chat" /><span className="grow"><span className="t">Réponds vite à tes messages</span></span></div>
            <div className="row"><Ico name="calendar" /><span className="grow"><span className="t">Confirme tes visites</span></span></div>
          </div>
        </Panel>
      </div>

      <Panel className="mt" title="Ce que tu cherches" action={<button className="link" type="button" onClick={() => setEditPrefs(true)}>Modifier</button>}>
        <div className="kv">
          <div><span>Ville</span><b>{d.city || 'Non précisée'}</b></div>
          <div><span>Budget maximum</span><b>{d.budgetMax ? `${eur(d.budgetMax)} par mois` : 'Non précisé'}</b></div>
          <div><span>Arrivée</span><b>{d.urgent.availableFrom ? `À partir du ${dayMonth(d.urgent.availableFrom)}` : 'Dès que possible'}</b></div>
          <div><span>Recherche urgente</span><b>{d.urgent.active ? `Active${d.urgent.expiresAt ? ` jusqu’au ${dayMonth(d.urgent.expiresAt)}` : ''}` : 'Désactivée'}</b></div>
        </div>
      </Panel>

      {infoModal}
      <PrefsModal open={editPrefs} onClose={() => setEditPrefs(false)} d={d} onSaved={load} />
      <IdentityModal open={idModal} onClose={() => setIdModal(false)} onUpload={uploadDoc} />
    </div>
  )
}

function UploadButton({ label, onFile }: { label: string; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <Button variant="main" size="sm" onClick={() => ref.current?.click()}>{label}</Button>
      <input ref={ref} type="file" accept="image/*,application/pdf" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
    </>
  )
}

function InfoModal({ open, onClose, d, onSaved }: { open: boolean; onClose: () => void; d: Data; onSaved: () => void }) {
  const toast = useToast()
  const [f, setF] = useState({ firstName: d.firstName, lastName: d.lastName, bio: d.bio, phone: d.phone })
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setF({ firstName: d.firstName, lastName: d.lastName, bio: d.bio, phone: d.phone }) }, [open, d])
  async function save() {
    setBusy(true)
    const { error } = await createClient().from('profiles').update({
      first_name: f.firstName.trim(), last_name: f.lastName.trim(), bio: f.bio.trim(), phone: f.phone.trim(),
    }).eq('id', d.id)
    setBusy(false)
    if (error) return toast('Les modifications n’ont pas pu être enregistrées')
    toast('Modifications enregistrées')
    onClose()
    onSaved()
  }
  return (
    <Modal open={open} onClose={onClose} title="Modifier mon profil"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="main" disabled={busy} onClick={save}>Enregistrer</Button></>}>
      <div className="form mt">
        <div className="f2">
          <div className="field"><label htmlFor="pfn">Prénom</label><input id="pfn" className="input" value={f.firstName} onChange={e => setF({ ...f, firstName: e.target.value })} /></div>
          <div className="field"><label htmlFor="pln">Nom</label><input id="pln" className="input" value={f.lastName} onChange={e => setF({ ...f, lastName: e.target.value })} /></div>
        </div>
        <div className="field"><label htmlFor="pbio">Présentation</label><textarea id="pbio" className="textarea" value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} /></div>
        <div className="field"><label htmlFor="pph">Téléphone</label><input id="pph" className="input" inputMode="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
      </div>
    </Modal>
  )
}

function PrefsModal({ open, onClose, d, onSaved }: { open: boolean; onClose: () => void; d: Data; onSaved: () => void }) {
  const toast = useToast()
  const [city, setCity] = useState(d.city)
  const [budget, setBudget] = useState(d.budgetMax ? String(d.budgetMax) : '')
  const [urgent, setUrgent] = useState(d.urgent.active)
  const [from, setFrom] = useState(d.urgent.availableFrom)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!open) return
    setCity(d.city); setBudget(d.budgetMax ? String(d.budgetMax) : ''); setUrgent(d.urgent.active); setFrom(d.urgent.availableFrom)
  }, [open, d])

  async function save() {
    if (urgent && (!from || !city.trim())) return toast('Indique ta ville et ta date d’arrivée pour la recherche urgente')
    setBusy(true)
    const b = parseInt(budget.replace(/\D/g, ''), 10)
    const { error } = await createClient().from('profiles').update({ city: city.trim(), budget_max: Number.isFinite(b) ? b : null }).eq('id', d.id)
    let ok = !error
    if (ok && (urgent !== d.urgent.active || (urgent && from !== d.urgent.availableFrom))) {
      // Recherche urgente existante (/api/profiles/urgent).
      const res = await fetch('/api/profiles/urgent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(urgent ? { active: true, available_from: from, city: city.trim() } : { active: false }),
      })
      ok = res.ok
      if (ok && urgent) track.urgentSearchActivated(city.trim())
    }
    setBusy(false)
    if (!ok) return toast('Les critères n’ont pas pu être enregistrés')
    toast('Critères de recherche enregistrés')
    onClose()
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="Ce que tu cherches"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button variant="main" disabled={busy} onClick={save}>Enregistrer</Button></>}>
      <div className="form mt">
        <div className="f2">
          <div className="field"><label htmlFor="cville">Ville</label><input id="cville" className="input" value={city} onChange={e => setCity(e.target.value)} /></div>
          <div className="field"><label htmlFor="cbudget">Budget maximum</label><input id="cbudget" className="input" inputMode="numeric" value={budget} onChange={e => setBudget(e.target.value)} /></div>
        </div>
        <div className="setrow" style={{ borderTop: 0, padding: 0 }}>
          <span className="grow"><span className="t">Recherche urgente</span><span className="s">Tu remontes en priorité chez les colocs pendant 7 jours.</span></span>
          <Toggle checked={urgent} onChange={setUrgent} label="Recherche urgente" />
        </div>
        {urgent && <div className="field"><label htmlFor="cfrom">Arrivée à partir du</label><input id="cfrom" className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>}
      </div>
    </Modal>
  )
}

function IdentityModal({ open, onClose, onUpload }: { open: boolean; onClose: () => void; onUpload: (type: string, f: File) => Promise<void> }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  async function stripe() {
    setBusy(true)
    try {
      // Vérification Stripe Identity existante (/api/verify/identity).
      const res = await fetch('/api/verify/identity', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.url) {
        track.identityVerificationStarted()
        window.location.href = data.url
        return
      }
      toast(data.fallback ? 'Vérification automatique indisponible : envoie ta pièce ci-dessous' : data.error ?? 'La vérification n’a pas pu démarrer')
    } catch {
      toast('La vérification n’a pas pu démarrer')
    }
    setBusy(false)
  }
  return (
    <Modal open={open} onClose={onClose} title={<>Vérifier ton identité{NNBSP}?</>} lead="La vérification automatique prend moins de deux minutes. Tu peux aussi envoyer le recto et le verso de ta pièce, vérifiés sous 24 h.">
      <div className="stackv mt" style={{ gap: 10 }}>
        <Button variant="main" icon="shield" disabled={busy} onClick={stripe}>Vérifier automatiquement</Button>
        <div className="acts">
          <UploadButtonGlass label="Envoyer le recto" onFile={f => onUpload('identity_front', f)} />
          <UploadButtonGlass label="Envoyer le verso" onFile={f => onUpload('identity_back', f)} />
        </div>
      </div>
    </Modal>
  )
}

function UploadButtonGlass({ label, onFile }: { label: string; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <Button variant="glass" size="sm" icon="image" onClick={() => ref.current?.click()}>{label}</Button>
      <input ref={ref} type="file" accept="image/*,application/pdf" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
    </>
  )
}
