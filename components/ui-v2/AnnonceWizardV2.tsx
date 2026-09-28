'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/analytics'
import { Modal } from './Modal'
import { Button } from './Button'
import { Icon, Note, Segmented, Toggle } from './primitives'
import { eur, NNBSP } from './format'

/**
 * Assistant de publication (dashboard v2) : même brouillon (localStorage
 * isaly_annonce_draft_v1), mêmes photos (bucket « listings ») et même
 * insertion que components/listings/AnnonceWizard.tsx, en 5 étapes :
 * Logement, Chambre, Photos, Loyer et charges, Colocataires.
 */
type PropertyType = 'studio' | 't1' | 't2' | 't3' | 't4_plus' | 'maison'
interface Draft {
  step: number
  property_type: PropertyType | null
  title: string
  city: string
  surface: string
  rooms_available: string
  occupants_current: string
  capacity_total: string
  rent: string
  charges: string
  charges_incluses: boolean
  depot_garantie: string
  disponible_le: string
  amenities: string[]
  rules: string[]
  house_rules: string
  publish_now: boolean
}

const DRAFT_KEY = 'isaly_annonce_draft_v1'
const STEPS = ['Logement', 'Chambre', 'Photos', 'Loyer et charges', 'Colocataires']
const TYPES: { v: PropertyType; l: string }[] = [
  { v: 'studio', l: 'Studio' }, { v: 't1', l: 'T1' }, { v: 't2', l: 'T2' }, { v: 't3', l: 'T3' }, { v: 't4_plus', l: 'T4 et plus' }, { v: 'maison', l: 'Maison' },
]
const AMENITIES = ['Cuisine équipée', 'Lave-linge', 'Sèche-linge', 'Lave-vaisselle', 'Parking', 'Ascenseur', 'Balcon/Terrasse', 'Cave', 'Fibre internet']
const RULES = ['Animaux acceptés', 'Non-fumeur', 'Visiteurs bienvenus', 'Instruments de musique OK']

const empty: Draft = {
  step: 1, property_type: null, title: '', city: '', surface: '', rooms_available: '1', occupants_current: '0', capacity_total: '1',
  rent: '', charges: '', charges_incluses: false, depot_garantie: '', disponible_le: '', amenities: ['Meublé'], rules: [], house_rules: '', publish_now: true,
}

async function uploadPhotos(files: File[]): Promise<string[]> {
  const supabase = createClient()
  const urls: string[] = []
  for (const file of files) {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `listings/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('listings').upload(path, file, { cacheControl: '3600', upsert: false })
    if (!error) urls.push(supabase.storage.from('listings').getPublicUrl(path).data.publicUrl)
  }
  return urls
}

export default function AnnonceWizardV2({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: (id: string, mode: 'published' | 'draft') => void }) {
  const [d, setD] = useState<Draft>(empty)
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const hydrated = useRef(false)

  useEffect(() => {
    if (!open || hydrated.current) return
    hydrated.current = true
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) setD(x => ({ ...x, ...(JSON.parse(raw) as Partial<Draft>) }))
    } catch { /* brouillon illisible */ }
  }, [open])

  useEffect(() => {
    if (!open) return
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)) } catch { /* stockage indisponible */ }
  }, [d, open])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(x => ({ ...x, [k]: v }))
  const toggleIn = (k: 'amenities' | 'rules', v: string) => setD(x => ({ ...x, [k]: x[k].includes(v) ? x[k].filter(y => y !== v) : [...x[k], v] }))
  const meuble = d.amenities.includes('Meublé')

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    setPhotos(p => [...p, ...arr].slice(0, 6))
    setPreviews(p => [...p, ...arr.map(f => URL.createObjectURL(f))].slice(0, 6))
  }

  function canNext(): string | null {
    if (d.step === 1 && (!d.property_type || !d.title.trim() || !d.city.trim() || !(Number(d.surface) > 0))) return 'Renseigne l’adresse ou le titre, la ville, le type et la surface pour continuer.'
    if (d.step === 3 && photos.length < 1) return 'Ajoute au moins une photo pour continuer.'
    if (d.step === 4 && !(Number(d.rent) > 0)) return 'Indique le loyer mensuel pour continuer.'
    if (d.step === 5 && Number(d.occupants_current) > Number(d.capacity_total)) return 'Le nombre de colocataires en place ne peut pas dépasser la capacité.'
    return null
  }

  function next() {
    const e = canNext()
    if (e) return setErr(e)
    setErr(null)
    set('step', Math.min(STEPS.length, d.step + 1))
  }

  async function publish(asDraft: boolean) {
    const e = canNext()
    if (e) return setErr(e)
    if (!photos.length) { set('step', 3); return setErr('Ajoute au moins une photo pour continuer.') }
    setBusy(true)
    setErr(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setErr('Ta session a expiré, reconnecte-toi.'); return }
      const urls = await uploadPhotos(photos)
      if (!urls.length) { setErr('Les photos n’ont pas pu être envoyées.'); return }
      const row = {
        owner_id: user.id,
        title: d.title.trim() || `Colocation à ${d.city.trim()}`,
        description: d.house_rules.trim() || null,
        city: d.city.trim(),
        property_type: d.property_type,
        rent: Number(d.rent) || 0,
        charges: Number(d.charges) || 0,
        charges_incluses: d.charges_incluses,
        depot_garantie: d.depot_garantie ? Number(d.depot_garantie) : null,
        disponible_le: d.disponible_le || null,
        surface: Number(d.surface) || 0,
        rooms_available: Number(d.rooms_available) || 1,
        occupants_current: Number(d.occupants_current) || 0,
        capacity_total: Number(d.capacity_total) || 1,
        meuble,
        animaux_ok: d.rules.includes('Animaux acceptés'),
        non_fumeur: d.rules.includes('Non-fumeur'),
        equipements: d.amenities.length ? d.amenities : null,
        photos: urls,
        boost_type: 'standard',
        boost_level: 'standard',
        boost_tier: 'standard',
        is_active: !asDraft && d.publish_now,
      }
      const { data: inserted, error } = await supabase.from('listings').insert(row).select('id').single()
      if (error || !inserted) { setErr('L’annonce n’a pas pu être créée.'); return }
      try { localStorage.removeItem(DRAFT_KEY) } catch { /* rien */ }
      if (row.is_active) track.listingPublished(d.city)
      onSuccess(inserted.id as string, row.is_active ? 'published' : 'draft')
      previews.forEach(p => URL.revokeObjectURL(p))
      setD(empty)
      setPhotos([])
      setPreviews([])
      hydrated.current = false
    } finally {
      setBusy(false)
    }
  }

  const st = d.step
  const total = (Number(d.rent) || 0) + (d.charges_incluses ? 0 : Number(d.charges) || 0)

  return (
    <Modal
      open={open}
      onClose={() => { if (!busy) onClose() }}
      wide
      title="Publier une annonce"
      lead={`Étape ${st} sur ${STEPS.length} : ${STEPS[st - 1]}`}
      footer={
        <>
          {st > 1
            ? <Button variant="ghost" onClick={() => { setErr(null); set('step', st - 1) }}>Retour</Button>
            : <Button variant="ghost" onClick={onClose}>Enregistrer le brouillon</Button>}
          {st < STEPS.length
            ? <Button variant="main" onClick={next}>Continuer</Button>
            : <Button variant="main" disabled={busy} onClick={() => publish(false)}>{d.publish_now ? 'Publier l’annonce' : 'Enregistrer en brouillon'}</Button>}
        </>
      }
    >
      <div className="wsteps" aria-hidden="true">{STEPS.map((_, i) => <i key={i} className={i < st ? 'on' : ''} />)}</div>

      {st === 1 && (
        <div className="form">
          <div className="field"><label htmlFor="w1">Adresse ou titre du logement</label><input id="w1" className="input" value={d.title} onChange={e => set('title', e.target.value)} placeholder="Par exemple : 15 rue Paul Bert" /></div>
          <div className="f2">
            <div className="field"><label htmlFor="wcity">Ville</label><input id="wcity" className="input" value={d.city} onChange={e => set('city', e.target.value)} /></div>
            <div className="field"><label htmlFor="w2">Surface totale en m²</label><input id="w2" className="input" inputMode="numeric" value={d.surface} onChange={e => set('surface', e.target.value.replace(/[^\d]/g, ''))} /></div>
          </div>
          <div className="field"><label htmlFor="w3">Type de logement</label>
            <select id="w3" className="select" value={d.property_type ?? ''} onChange={e => set('property_type', (e.target.value || null) as PropertyType | null)}>
              <option value="">Choisir</option>
              {TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
          <div className="field"><span className="flabel">Type de location</span>
            <Segmented options={[{ value: 'meuble', label: 'Meublé' }, { value: 'vide', label: 'Non meublé' }]} value={meuble ? 'meuble' : 'vide'}
              onChange={v => setD(x => ({ ...x, amenities: v === 'meuble' ? Array.from(new Set([...x.amenities, 'Meublé'])) : x.amenities.filter(a => a !== 'Meublé') }))} label="Type de location" />
          </div>
        </div>
      )}

      {st === 2 && (
        <div className="form">
          <div className="f2">
            <div className="field"><label htmlFor="w4">Chambres disponibles</label><input id="w4" className="input" inputMode="numeric" value={d.rooms_available} onChange={e => set('rooms_available', e.target.value.replace(/[^\d]/g, ''))} /></div>
            <div className="field"><label htmlFor="w5">Disponible le</label><input id="w5" className="input" type="date" value={d.disponible_le} onChange={e => set('disponible_le', e.target.value)} /></div>
          </div>
          <div className="field"><label htmlFor="w6">Description</label><textarea id="w6" className="textarea" value={d.house_rules} onChange={e => set('house_rules', e.target.value)} placeholder="La chambre, la vie dans la coloc, les règles de la maison" /></div>
          <div className="field"><span className="flabel">Équipements</span>
            <div className="filters">{AMENITIES.map(a => <button key={a} type="button" className="fchip" aria-pressed={d.amenities.includes(a)} onClick={() => toggleIn('amenities', a)}>{a}</button>)}</div>
          </div>
          <div className="field"><span className="flabel">Règles</span>
            <div className="filters">{RULES.map(r => <button key={r} type="button" className="fchip" aria-pressed={d.rules.includes(r)} onClick={() => toggleIn('rules', r)}>{r}</button>)}</div>
          </div>
        </div>
      )}

      {st === 3 && (
        <>
          <div
            className="dropzone"
            style={{ padding: 36 }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files) }}
          >
            <Icon name="image" size={28} />
            <span>Glisse tes photos ici, ou <button className="link" type="button" onClick={() => fileRef.current?.click()}>choisis-les</button></span>
            <span className="s">6 photos maximum. La première sert de couverture.</span>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }} />
          </div>
          {previews.length > 0 && (
            <div className="acts mt">
              {previews.map((p, i) => (
                <span key={p} className="art thumb has-photo" style={{ position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="art-photo" src={p} alt={`Photo ${i + 1}`} />
                  <button type="button" className="fav" style={{ width: 30, height: 30, top: 4, right: 4 }} aria-label={`Retirer la photo ${i + 1}`}
                    onClick={() => { URL.revokeObjectURL(p); setPhotos(x => x.filter((_, j) => j !== i)); setPreviews(x => x.filter((_, j) => j !== i)) }}>
                    <Icon name="x" size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {st === 4 && (
        <div className="form">
          <div className="f2">
            <div className="field"><label htmlFor="w7">Loyer par mois</label><input id="w7" className="input" inputMode="numeric" value={d.rent} onChange={e => set('rent', e.target.value.replace(/[^\d]/g, ''))} /></div>
            <div className="field"><label htmlFor="w8">Charges par mois</label><input id="w8" className="input" inputMode="numeric" disabled={d.charges_incluses} value={d.charges} onChange={e => set('charges', e.target.value.replace(/[^\d]/g, ''))} /></div>
          </div>
          <div className="setrow" style={{ borderTop: 0, padding: 0 }}>
            <span className="grow"><span className="t">Charges comprises dans le loyer</span></span>
            <Toggle checked={d.charges_incluses} onChange={v => set('charges_incluses', v)} label="Charges comprises dans le loyer" />
          </div>
          <div className="field"><label htmlFor="w9">Dépôt de garantie</label><input id="w9" className="input" inputMode="numeric" value={d.depot_garantie} onChange={e => set('depot_garantie', e.target.value.replace(/[^\d]/g, ''))} /></div>
          {total > 0 && <Note>Les candidats voient le total : <b>{eur(total)} par mois, charges comprises</b>.</Note>}
        </div>
      )}

      {st === 5 && (
        <div className="form">
          <p className="soft">Indique qui habite déjà le logement : la compatibilité des candidats avec chaque colocataire s’affichera sur l’annonce dès qu’ils auront fait le test.</p>
          <div className="f2">
            <div className="field"><label htmlFor="w10">Colocataires déjà en place</label><input id="w10" className="input" inputMode="numeric" value={d.occupants_current} onChange={e => set('occupants_current', e.target.value.replace(/[^\d]/g, ''))} /></div>
            <div className="field"><label htmlFor="w11">Capacité totale</label><input id="w11" className="input" inputMode="numeric" value={d.capacity_total} onChange={e => set('capacity_total', e.target.value.replace(/[^\d]/g, ''))} /></div>
          </div>
          <Note><b>Logement vide{NNBSP}?</b> Pas de score pour le premier colocataire : son dossier vérifié suffit. Le matching démarre au deuxième.</Note>
          <div className="setrow" style={{ borderTop: 0, padding: 0 }}>
            <span className="grow"><span className="t">Publier tout de suite</span><span className="s">Sinon, l’annonce reste en brouillon.</span></span>
            <Toggle checked={d.publish_now} onChange={v => set('publish_now', v)} label="Publier tout de suite" />
          </div>
        </div>
      )}
      {err && <p className="s mt" role="alert" style={{ color: 'var(--bad-ink)' }}>{err}</p>}
    </Modal>
  )
}
