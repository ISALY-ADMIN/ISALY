'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { VAULT_CATEGORIES, depositToVault, type VaultCategory, type VaultDoc } from '@/lib/vault'
import { Button } from './Button'
import { Modal } from './Modal'
import { Icon, Panel } from './primitives'
import { EmptyState } from './visuals'
import { dayMonth } from './format'
import { useToast } from './Toast'
import type { IconName } from './icons'

/* Même verrouillage que l'ancien coffre-fort (app/app/documents) : 3 essais, 5 minutes. */
const LOCKOUT_KEY = 'isaly-vault-lockout'
const MAX_TRIES = 3
const LOCK_MS = 5 * 60 * 1000

function getLockout(): { fails: number; until: number } {
  try { return JSON.parse(localStorage.getItem(LOCKOUT_KEY) ?? '{"fails":0,"until":0}') } catch { return { fails: 0, until: 0 } }
}

const CAT_ICON: Record<string, IconName> = { bail: 'contract', quittances: 'euro', etat_des_lieux: 'doc', identite: 'shield', revenus: 'euro', autres: 'doc' }
const CAT_LABEL: Record<string, string> = { bail: 'Bail', quittances: 'Quittances', etat_des_lieux: 'État des lieux', identite: 'Pièce d’identité', revenus: 'Justificatifs de revenus', autres: 'Autres' }

/** Coffre-fort à code (pavé de la maquette), documents du bucket privé « vault ». */
export default function Vault({ className }: { className?: string }) {
  const toast = useToast()
  const [state, setState] = useState<'loading' | 'create' | 'confirm' | 'locked' | 'open'>('loading')
  const [pin, setPin] = useState('')
  const [first, setFirst] = useState('')
  const [err, setErr] = useState('')
  const [shake, setShake] = useState(false)
  const [busy, setBusy] = useState(false)
  const [docs, setDocs] = useState<VaultDoc[] | null>(null)
  const [pending, setPending] = useState<File | null>(null)
  const [pName, setPName] = useState('')
  const [pCat, setPCat] = useState<VaultCategory>('autres')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/vault/pin')
      .then(r => r.json())
      .then((j: { configured?: boolean }) => setState(j.configured ? 'locked' : 'create'))
      .catch(() => setState('locked'))
  }, [])

  const loadDocs = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false })
    setDocs((data ?? []) as VaultDoc[])
  }, [])

  useEffect(() => {
    if (state === 'open') loadDocs()
  }, [state, loadDocs])

  const fail = (msg: string) => {
    setErr(msg)
    setShake(true)
    setTimeout(() => setShake(false), 450)
    setPin('')
  }

  async function complete(code: string) {
    if (state === 'create') {
      setFirst(code)
      setPin('')
      setState('confirm')
      return
    }
    if (state === 'confirm') {
      if (code !== first) {
        setState('create')
        return fail('Les deux codes ne correspondent pas. Recommence.')
      }
      setBusy(true)
      const res = await fetch('/api/vault/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', pin: code }) })
      setBusy(false)
      if (!res.ok) return fail('Le code n’a pas pu être enregistré.')
      setPin('')
      setState('open')
      toast('Coffre-fort ouvert')
      return
    }
    const lock = getLockout()
    if (lock.until > Date.now()) return fail(`Trop d’essais. Réessaie dans ${Math.ceil((lock.until - Date.now()) / 60000)} minutes.`)
    setBusy(true)
    const res = await fetch('/api/vault/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify', pin: code }) })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (j.ok) {
      try { localStorage.removeItem(LOCKOUT_KEY) } catch { /* rien */ }
      setPin('')
      setErr('')
      setState('open')
      toast('Coffre-fort ouvert')
      return
    }
    const fails = lock.fails + 1
    const until = fails >= MAX_TRIES ? Date.now() + LOCK_MS : 0
    try { localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ fails: fails >= MAX_TRIES ? 0 : fails, until })) } catch { /* rien */ }
    fail(until ? 'Trop d’essais : coffre-fort bloqué 5 minutes.' : `Code incorrect, réessaie (${fails} sur ${MAX_TRIES}).`)
  }

  function press(k: string) {
    if (busy) return
    setErr('')
    if (k === 'del') return setPin(p => p.slice(0, -1))
    if (pin.length >= 4) return
    const next = pin + k
    setPin(next)
    if (next.length === 4) complete(next)
  }

  async function download(d: VaultDoc) {
    const { data } = await createClient().storage.from('vault').createSignedUrl(d.file_path, 600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function upload() {
    if (!pending) return
    setBusy(true)
    const { error } = await depositToVault(pending, pName || pending.name, pCat, { mimeType: pending.type })
    setBusy(false)
    if (error) return toast('Le document n’a pas pu être ajouté')
    setPending(null)
    toast('Document ajouté au coffre-fort')
    loadDocs()
  }

  if (state !== 'open') {
    const title = state === 'create' ? 'Crée le code de ton coffre-fort' : state === 'confirm' ? 'Confirme ton code' : 'Ton coffre-fort'
    const lead = state === 'create' ? 'Choisis un code à 4 chiffres, il te sera demandé à chaque ouverture.' : state === 'confirm' ? 'Entre à nouveau les 4 chiffres.' : 'Entre ton code à 4 chiffres.'
    return (
      <section className={`panel mt ${className ?? ''}`} style={{ maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
        <div className="pinpad">
          <span className="ico brand" style={{ width: 56, height: 56, borderRadius: 20 }}><Icon name="lock" size={26} /></span>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.03em' }}>{title}</h2>
          <p className="soft" style={{ textAlign: 'center' }}>{lead}</p>
          <div className={shake ? 'pdots err' : 'pdots'} aria-label={`${pin.length} chiffres saisis sur 4`} role="status">
            {[0, 1, 2, 3].map(i => <i key={i} className={i < pin.length ? 'on' : ''} />)}
          </div>
          {err && <p className="s" style={{ color: 'var(--bad-ink)' }} role="alert">{err}</p>}
          <div className="keys">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(k => <button key={k} type="button" onClick={() => press(k)} disabled={state === 'loading'}>{k}</button>)}
            <span />
            <button type="button" onClick={() => press('0')} disabled={state === 'loading'}>0</button>
            <button type="button" aria-label="Effacer le dernier chiffre" onClick={() => press('del')}><Icon name="x" size={20} /></button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <Panel
      className={`mt ${className ?? ''}`}
      title="Ton coffre-fort"
      action={
        <div className="acts">
          <Button variant="glass" size="sm" icon="plus" onClick={() => fileRef.current?.click()}>Ajouter un document</Button>
          <Button variant="ghost" size="sm" icon="lock" onClick={() => { setState('locked'); setPin('') }}>Verrouiller</Button>
        </div>
      }
    >
      <input
        ref={fileRef}
        type="file"
        hidden
        accept="image/*,application/pdf"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) {
            setPending(f)
            setPName(f.name.replace(/\.[^.]+$/, ''))
            setPCat('autres')
          }
          e.target.value = ''
        }}
      />
      {docs === null ? (
        <p className="s">Chargement…</p>
      ) : docs.length === 0 ? (
        <EmptyState icon="lock" title="Ton coffre-fort est vide" text="Ajoute ton bail, tes quittances ou tes justificatifs : ils restent privés et accessibles avec ton code." />
      ) : (
        <div className="vault">
          {docs.map(d => (
            <div key={d.id} className="doc">
              <span className="ico"><Icon name={CAT_ICON[d.category] ?? 'doc'} size={20} /></span>
              <span className="grow">
                <span className="t">{d.name}</span>
                <span className="s">{CAT_LABEL[d.category] ?? 'Document'}, ajouté le {dayMonth(d.created_at)}</span>
              </span>
              <button className="iconbtn" type="button" aria-label={`Télécharger ${d.name}`} style={{ width: 38, height: 38 }} onClick={() => download(d)}>
                <Icon name="download" size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title="Ajouter un document"
        footer={<><Button variant="ghost" onClick={() => setPending(null)}>Annuler</Button><Button variant="main" disabled={busy} onClick={upload}>Ajouter au coffre-fort</Button></>}
      >
        <div className="form mt">
          <div className="field"><label htmlFor="vname">Nom du document</label><input id="vname" className="input" value={pName} onChange={e => setPName(e.target.value)} /></div>
          <div className="field">
            <label htmlFor="vcat">Catégorie</label>
            <select id="vcat" className="select" value={pCat} onChange={e => setPCat(e.target.value as VaultCategory)}>
              {VAULT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{CAT_LABEL[c.id] ?? c.label}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </Panel>
  )
}
