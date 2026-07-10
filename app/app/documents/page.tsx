'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FileText, File as FileIcon, Image as ImageIcon, Lock, Unlock, Shield, Search, Trash2, Download, X, UploadCloud } from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import Button from '@/components/ui/Button'
import Emoji from '@/components/ui/Emoji'
import { createClient } from '@/lib/supabase/client'
import { VAULT_CATEGORIES, depositToVault, type VaultCategory, type VaultDoc } from '@/lib/vault'
import { generateQuittanceModele, generateEdlModele, generateAttestationAssuranceModele } from '@/lib/documents/quittancePdf'
import { generateBailPdf as generateBailLoi89Pdf } from '@/lib/documents/generateBailPdf'
import { emptyBailNonMeubleData } from '@/components/documents/BailNonMeubleForm'

const LOCKOUT_KEY = 'isaly-vault-lockout'
const MAX_TRIES = 3
const LOCK_MS = 5 * 60 * 1000

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
}

function formatSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function docIcon(mime: string | null) {
  if (mime?.startsWith('image/')) return <ImageIcon size={20} />
  if (mime === 'application/pdf') return <FileText size={20} />
  return <FileIcon size={20} />
}

function getLockout(): { fails: number; until: number } {
  try { return JSON.parse(localStorage.getItem(LOCKOUT_KEY) ?? '{"fails":0,"until":0}') } catch { return { fails: 0, until: 0 } }
}

// ── Modale PIN (création / saisie) ──
function PinModal({ mode, onSubmit, onSkip, error, busy }: {
  mode: 'create' | 'enter'
  onSubmit: (pin: string, confirm?: string) => void
  onSkip?: () => void
  error: string
  busy: boolean
}) {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const pinInput = 'w-full px-4 py-3 rounded-[10px] text-[20px] text-center tracking-[0.5em] outline-none font-bold'
  const pinStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[380px] rounded-[20px] p-7 text-center"
        style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', fontFamily: "'Outfit', sans-serif" }}>
        <div className="flex justify-center mb-4">
          <span className="flex items-center justify-center rounded-full" style={{ width: 56, height: 56, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981' }}>
            <Lock size={24} />
          </span>
        </div>
        <h2 className="text-[17px] font-bold mb-1" style={{ color: '#fff' }}>
          {mode === 'create' ? 'Créer votre code PIN' : 'Coffre-fort verrouillé'}
        </h2>
        <p className="text-[12.5px] mb-5" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
          {mode === 'create'
            ? 'Un code à 4 chiffres protégera l’accès à vos documents.'
            : 'Entrez votre code PIN à 4 chiffres pour accéder à vos documents.'}
        </p>
        <input className={pinInput} style={pinStyle} type="password" inputMode="numeric" maxLength={4} placeholder="••••"
          value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} autoFocus />
        {mode === 'create' && (
          <input className={`${pinInput} mt-3`} style={pinStyle} type="password" inputMode="numeric" maxLength={4} placeholder="Confirmer"
            value={confirm} onChange={e => setConfirm(e.target.value.replace(/\D/g, ''))} />
        )}
        {error && <p className="text-[12px] mt-3 mb-0" style={{ color: '#EF4444' }}>{error}</p>}
        <div className="flex flex-col gap-2 mt-5">
          <Button loading={busy} disabled={pin.length !== 4 || (mode === 'create' && confirm.length !== 4)}
            onClick={() => onSubmit(pin, confirm)}>
            {mode === 'create' ? 'Activer le PIN' : 'Déverrouiller'}
          </Button>
          {mode === 'create' && onSkip && <Button variant="ghost" onClick={onSkip}>Plus tard</Button>}
        </div>
        <button
          type="button"
          onClick={() => router.push('/app/dashboard-home')}
          className="mt-4 mx-auto block bg-transparent border-none cursor-pointer text-[13px]"
          style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Outfit', sans-serif" }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
        >
          ← Retour au tableau de bord
        </button>
      </motion.div>
    </div>
  )
}

// ═══════════ Page ═══════════

export default function DocumentsVaultPage() {
  const [pinState, setPinState] = useState<'loading' | 'create' | 'locked' | 'open'>('loading')
  const [pinError, setPinError] = useState('')
  const [pinBusy, setPinBusy] = useState(false)
  const [pinConfigured, setPinConfigured] = useState(false)

  const [docs, setDocs] = useState<VaultDoc[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [filter, setFilter] = useState<'all' | VaultCategory>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'date' | 'name'>('date')
  const [dragOver, setDragOver] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingName, setPendingName] = useState('')
  const [pendingCat, setPendingCat] = useState<VaultCategory>('autres')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<{ doc: VaultDoc; url: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── PIN ──
  useEffect(() => {
    fetch('/api/vault/pin')
      .then(r => r.json())
      .then((j: { configured?: boolean }) => {
        setPinConfigured(!!j.configured)
        setPinState(j.configured ? 'locked' : 'create')
      })
      .catch(() => setPinState('open'))
  }, [])

  async function handlePin(pin: string, confirm?: string) {
    setPinError('')
    if (pinState === 'create') {
      if (pin !== confirm) { setPinError('Les deux codes ne correspondent pas.'); return }
      setPinBusy(true)
      const res = await fetch('/api/vault/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set', pin }) })
      setPinBusy(false)
      if (!res.ok) { setPinError('Erreur lors de la création du PIN.'); return }
      setPinConfigured(true)
      setPinState('open')
      return
    }
    // Saisie : lockout 3 essais → 5 min (localStorage, côté client uniquement)
    const lock = getLockout()
    if (lock.until > Date.now()) {
      setPinError(`Trop d'essais. Réessayez dans ${Math.ceil((lock.until - Date.now()) / 60000)} min.`)
      return
    }
    setPinBusy(true)
    const res = await fetch('/api/vault/pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify', pin }) })
    const j = await res.json().catch(() => ({}))
    setPinBusy(false)
    if (j.ok) {
      try { localStorage.removeItem(LOCKOUT_KEY) } catch {}
      setPinState('open')
    } else {
      const fails = lock.fails + 1
      const until = fails >= MAX_TRIES ? Date.now() + LOCK_MS : 0
      try { localStorage.setItem(LOCKOUT_KEY, JSON.stringify({ fails: fails >= MAX_TRIES ? 0 : fails, until })) } catch {}
      setPinError(until ? 'Trop d’essais — coffre-fort bloqué 5 minutes.' : `Code incorrect (${fails}/${MAX_TRIES}).`)
    }
  }

  // ── Documents ──
  const loadDocs = useCallback(async () => {
    setLoadingDocs(true)
    const supabase = createClient()
    const { data } = await supabase.from('documents').select('*').order('created_at', { ascending: false })
    setDocs((data ?? []) as VaultDoc[])
    setLoadingDocs(false)
  }, [])

  useEffect(() => { if (pinState === 'open') loadDocs() }, [pinState, loadDocs])

  function pickFile(f: File) {
    setPendingFile(f)
    setPendingName(f.name.replace(/\.[^.]+$/, ''))
    setPendingCat('autres')
  }

  async function confirmUpload() {
    if (!pendingFile) return
    setUploading(true)
    const { error } = await depositToVault(pendingFile, pendingName || pendingFile.name, pendingCat, { mimeType: pendingFile.type })
    setUploading(false)
    if (!error) { setPendingFile(null); loadDocs() }
  }

  async function openPreview(doc: VaultDoc) {
    const supabase = createClient()
    const { data } = await supabase.storage.from('vault').createSignedUrl(doc.file_path, 600)
    if (data?.signedUrl) setPreview({ doc, url: data.signedUrl })
  }

  async function deleteDoc(doc: VaultDoc) {
    const supabase = createClient()
    await supabase.storage.from('vault').remove([doc.file_path])
    await supabase.from('documents').delete().eq('id', doc.id)
    setPreview(null)
    loadDocs()
  }

  const filtered = docs
    .filter(doc => filter === 'all' || doc.category === filter)
    .filter(doc => !search || doc.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : b.created_at.localeCompare(a.created_at))

  const catOf = (id: string) => VAULT_CATEGORIES.find(c => c.id === id)

  const modeles = [
    { label: 'Bail loi 89 non meublé', sub: 'Contrat vierge complet', icon: '📄', gen: () => generateBailLoi89Pdf(emptyBailNonMeubleData(), { bailleur: { name: '', dataUrl: null, signedAt: null }, locataire1: { name: '', dataUrl: null, signedAt: null } }).save('modele-bail-loi89.pdf') },
    { label: 'Quittance de loyer', sub: 'Modèle pré-formaté', icon: '🧾', gen: () => generateQuittanceModele().save('modele-quittance.pdf') },
    { label: "État des lieux d'entrée", sub: 'Pièce par pièce', icon: '🔑', gen: () => generateEdlModele().save('modele-etat-des-lieux.pdf') },
    { label: 'Attestation d’assurance', sub: 'À compléter par l’assureur', icon: '🛡️', gen: () => generateAttestationAssuranceModele().save('modele-attestation-assurance.pdf') },
  ]

  return (
    <>
      <Topbar title="Mes documents" />

      {pinState === 'create' && (
        <PinModal mode="create" onSubmit={handlePin} onSkip={() => setPinState('open')} error={pinError} busy={pinBusy} />
      )}
      {pinState === 'locked' && (
        <PinModal mode="enter" onSubmit={handlePin} error={pinError} busy={pinBusy} />
      )}

      <div className="flex-1 overflow-y-auto" style={{ filter: pinState === 'locked' || pinState === 'create' ? 'blur(8px)' : 'none' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '32px 24px 64px', fontFamily: "'Outfit', sans-serif" }}>

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <div>
              <h1 className="text-[28px] font-bold m-0" style={{ color: '#fff' }}>Coffre-fort de documents</h1>
              <p className="text-[13.5px] mt-1 mb-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Baux, quittances, états des lieux et pièces personnelles — au même endroit.
              </p>
            </div>
            <span className="flex items-center gap-2 text-[12px] font-extrabold px-4 py-2 rounded-full"
              style={pinConfigured
                ? { background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }
                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.12)' }}>
              {pinConfigured ? <><Lock size={13} /> Coffre-fort verrouillé par PIN</> : <><Unlock size={13} /> Coffre-fort déverrouillé</>}
            </span>
          </motion.div>

          {/* Bandeau sécurité */}
          <div className="flex items-center gap-2 text-[12px] mb-6 px-4 py-2.5 rounded-[10px]"
            style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', color: 'rgba(255,255,255,0.5)' }}>
            <Shield size={13} style={{ color: '#10B981', flexShrink: 0 }} />
            Vos documents sont stockés chiffrés et accessibles uniquement par vous.
          </div>

          {/* Barre filtres */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {[{ id: 'all' as const, label: 'Tous', icon: '🗂️' }, ...VAULT_CATEGORIES].map(c => (
                <button key={c.id} type="button" onClick={() => setFilter(c.id as 'all' | VaultCategory)}
                  className="px-3.5 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-all"
                  style={{
                    background: filter === c.id ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                    border: filter === c.id ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    color: filter === c.id ? '#10B981' : 'rgba(255,255,255,0.55)',
                    fontFamily: "'Outfit', sans-serif",
                  }}>{c.label}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <div className="relative">
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
                  className="pl-9 pr-4 py-2 rounded-[10px] text-[12.5px] outline-none w-[180px]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontFamily: "'Outfit', sans-serif" }} />
              </div>
              <select value={sort} onChange={e => setSort(e.target.value as 'date' | 'name')}
                className="px-3 py-2 rounded-[10px] text-[12.5px] outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', appearance: 'none', fontFamily: "'Outfit', sans-serif" }}>
                <option value="date" style={{ background: '#1a1a1a' }}>Plus récents</option>
                <option value="name" style={{ background: '#1a1a1a' }}>Nom A→Z</option>
              </select>
            </div>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) pickFile(f) }}
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-[20px] py-8 mb-6 cursor-pointer transition-all"
            style={{
              border: dragOver ? '2px dashed #10B981' : '2px dashed rgba(255,255,255,0.12)',
              background: dragOver ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
            }}>
            <UploadCloud size={26} style={{ color: dragOver ? '#10B981' : 'rgba(255,255,255,0.35)' }} />
            <div className="text-[13.5px] font-semibold" style={{ color: dragOver ? '#10B981' : 'rgba(255,255,255,0.65)' }}>
              Glissez un document ici, ou cliquez pour parcourir
            </div>
            <div className="text-[11.5px]" style={{ color: 'rgba(255,255,255,0.3)' }}>PDF, images — 10 Mo max</div>
            <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = '' }} />
          </div>

          {/* Grille documents */}
          {loadingDocs ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10">
              {[0, 1, 2].map(i => <div key={i} className="rounded-[20px] h-[110px]" style={{ background: 'rgba(255,255,255,0.04)', animation: 'shimmer 1.4s ease-in-out infinite' }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 mb-10 rounded-[20px]" style={{ ...cardStyle }}>
              <div className="text-[36px] mb-2"><Emoji native="🗄️" /></div>
              <div className="text-[14px] font-bold mb-1" style={{ color: '#fff' }}>
                {docs.length === 0 ? 'Votre coffre-fort est vide' : 'Aucun document ne correspond'}
              </div>
              <div className="text-[12.5px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {docs.length === 0 ? 'Déposez votre premier document ci-dessus, ou générez-le depuis votre bail.' : 'Modifiez vos filtres ou votre recherche.'}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10">
              {filtered.map(doc => (
                <button key={doc.id} type="button" onClick={() => openPreview(doc)}
                  className="text-left p-5 rounded-[20px] cursor-pointer transition-all hover:-translate-y-0.5"
                  style={{ ...cardStyle, fontFamily: "'Outfit', sans-serif" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center justify-center rounded-[10px]"
                      style={{ width: 40, height: 40, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981' }}>
                      {docIcon(doc.mime_type)}
                    </span>
                    <span className="text-[10.5px] font-extrabold px-2.5 py-1 rounded-full"
                      style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}>
                      {catOf(doc.category)?.label ?? doc.category}
                    </span>
                  </div>
                  <div className="text-[13.5px] font-bold truncate" style={{ color: '#fff' }}>{doc.name}</div>
                  <div className="text-[11.5px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {formatDate(doc.created_at)} · {formatSize(doc.file_size)}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Modèles */}
          <div className="text-[12px] font-extrabold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Modèles de documents
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {modeles.map(m => (
              <div key={m.label} className="p-5 rounded-[20px] flex flex-col gap-2" style={cardStyle}>
                <div className="text-[22px]"><Emoji native={m.icon} size="22px" /></div>
                <div className="text-[13px] font-bold" style={{ color: '#fff' }}>{m.label}</div>
                <div className="text-[11.5px] mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{m.sub}</div>
                <Button size="sm" variant="secondary" onClick={m.gen}>Télécharger le modèle</Button>
              </div>
            ))}
          </div>

          <Link href="/app/baux/nouveau" className="no-underline inline-flex items-center gap-2 text-[13px] font-bold" style={{ color: '#10B981' }}>
            <Emoji native="📄" size="14px" /> Établir un bail loi 89 complet →
          </Link>
        </div>
      </div>

      {/* Modale catégorisation upload */}
      {pendingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[420px] rounded-[20px] p-6"
            style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', fontFamily: "'Outfit', sans-serif" }}>
            <div className="text-[15px] font-bold mb-4" style={{ color: '#fff' }}>Ajouter au coffre-fort</div>
            <label className="block text-[11.5px] font-extrabold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Nom du document</label>
            <input value={pendingName} onChange={e => setPendingName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-[10px] text-[13.5px] outline-none mb-4"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
            <label className="block text-[11.5px] font-extrabold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Catégorie</label>
            <div className="flex flex-wrap gap-2 mb-6">
              {VAULT_CATEGORIES.map(c => (
                <button key={c.id} type="button" onClick={() => setPendingCat(c.id)}
                  className="px-3.5 py-1.5 rounded-full text-[12px] font-bold cursor-pointer"
                  style={{
                    background: pendingCat === c.id ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                    border: pendingCat === c.id ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    color: pendingCat === c.id ? '#10B981' : 'rgba(255,255,255,0.55)',
                    fontFamily: "'Outfit', sans-serif",
                  }}>{c.icon} {c.label}</button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={confirmUpload} loading={uploading}>Déposer</Button>
              <Button variant="ghost" onClick={() => setPendingFile(null)}>Annuler</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modale aperçu */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[720px] max-h-[85vh] rounded-[20px] p-5 flex flex-col"
            style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', fontFamily: "'Outfit', sans-serif" }}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <div className="text-[14.5px] font-bold truncate" style={{ color: '#fff' }}>{preview.doc.name}</div>
                <div className="text-[11.5px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {catOf(preview.doc.category)?.label} · {formatDate(preview.doc.created_at)} · {formatSize(preview.doc.file_size)}
                </div>
              </div>
              <button type="button" onClick={() => setPreview(null)} className="cursor-pointer border-none bg-transparent p-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 min-h-[320px] rounded-[12px] overflow-hidden mb-4" style={{ background: '#fff' }}>
              {preview.doc.mime_type?.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt={preview.doc.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <iframe src={preview.url} title={preview.doc.name} style={{ width: '100%', height: '55vh', border: 'none' }} />
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={() => window.open(preview.url, '_blank')}><Download size={14} /> Télécharger</Button>
              <Button size="sm" variant="danger" onClick={() => deleteDoc(preview.doc)}><Trash2 size={14} /> Supprimer</Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
