'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Topbar from '@/components/layout/Topbar'
import CertificationBadge, { CertLevel, CertStatus } from '@/components/ui/CertificationBadge'
import ReviewStars from '@/components/ui/ReviewStars'
import { createClient } from '@/lib/supabase/client'
import { useLease } from '@/contexts/LeaseContext'
import { useToast } from '@/hooks/use-toast'

// ── Design tokens ─────────────────────────────────────────────
const MINT = '#10B981'
const MINT_D = '#059669'
const CARD = '#FFFFFF'
const BORDER = '#E5E7EB'
const SHADOW = '0 2px 16px rgba(0,0,0,.06)'
const INK = '#111827'
const MUTED = '#6B7280'
const SERIF = "'DM Serif Display', serif"

// ── Reference data ────────────────────────────────────────────
const SCHEDULE_OPTS = [
  { v: 'leve-tot', label: '🌅 Lève-tôt' },
  { v: 'couche-tard', label: '🌙 Couche-tard' },
  { v: 'variable', label: '🔄 Variable' },
  { v: 'flexible', label: '💤 Flexible' },
]
const VIBE_OPTS = [
  { v: 'calme', label: '🤫 Calme' },
  { v: 'festif', label: '🎉 Festif' },
  { v: 'studieux', label: '🎯 Studieux' },
  { v: 'detendu', label: '😎 Détendu' },
]
const PASSIONS = ['Musique', 'Cinéma', 'Sport', 'Cuisine', 'Art', 'Lecture', 'Voyages', 'Gaming']
const PASSION_EMOJI: Record<string, string> = {
  Musique: '🎵', Cinéma: '🎬', Sport: '🏃', Cuisine: '🍳',
  Art: '🎨', Lecture: '📚', Voyages: '🌍', Gaming: '🎮',
}

// ── Document model ────────────────────────────────────────────
const BUCKET = 'certifications'
type DocType = 'identity_front' | 'identity_back' | 'payslip' | 'domicile' | 'guarantor'

const ID_DOCS: { type: DocType; label: string; required: boolean }[] = [
  { type: 'identity_front', label: "Pièce d'identité — recto", required: true },
  { type: 'identity_back', label: "Pièce d'identité — verso", required: true },
]
const INCOME_DOCS: { type: DocType; label: string; required: boolean }[] = [
  { type: 'payslip', label: 'Justificatif de revenus (bulletins / avis d\'imposition)', required: true },
  { type: 'domicile', label: 'Justificatif de domicile', required: true },
  { type: 'guarantor', label: 'Garant (optionnel)', required: false },
]

type DocInfo = { path: string; status: CertStatus; url: string | null; isImage: boolean; name: string }
type Docs = Partial<Record<DocType, DocInfo>>

// ── Small UI primitives ───────────────────────────────────────
function Card({ children, accent, delay = 0 }: { children: React.ReactNode; accent?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className="rounded-[18px] p-5 border mb-4"
      style={{ background: CARD, borderColor: accent ?? BORDER, boxShadow: SHADOW }}
    >
      {children}
    </motion.div>
  )
}

function SectionTitle({ icon, children, action }: { icon: string; children: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="flex items-center gap-2 text-[15px] font-bold" style={{ color: INK }}>
        <span>{icon}</span>{children}
      </h3>
      {action}
    </div>
  )
}

function ProgressRing({ pct, size = 78, stroke = 7 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (pct / 100) * c
  const color = pct < 40 ? '#EF4444' : pct < 75 ? '#F59E0B' : MINT
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: off }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[19px] font-extrabold leading-none" style={{ color }}>{pct}%</span>
      </div>
    </div>
  )
}

function PrimaryBtn({ children, onClick, disabled, loading, small }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; small?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`rounded-full font-bold text-white border-none cursor-pointer transition-all disabled:opacity-60 disabled:cursor-not-allowed ${small ? 'px-3.5 py-1.5 text-[12px]' : 'px-5 py-2.5 text-[13.5px]'}`}
      style={{ background: `linear-gradient(135deg, ${MINT}, ${MINT_D})`, boxShadow: '0 4px 14px rgba(16,185,129,.25)' }}
    >
      {loading ? '⏳ …' : children}
    </button>
  )
}

function GhostBtn({ children, onClick, danger, small }: {
  children: React.ReactNode; onClick?: () => void; danger?: boolean; small?: boolean
}) {
  const c = danger ? '#EF4444' : MUTED
  return (
    <button
      onClick={onClick}
      className={`rounded-full font-semibold border-[1.5px] bg-transparent cursor-pointer transition-all ${small ? 'px-3 py-1.5 text-[12px]' : 'px-4 py-2 text-[12.5px]'}`}
      style={{ borderColor: danger ? '#FECACA' : BORDER, color: c }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = danger ? '#EF4444' : MINT; e.currentTarget.style.color = danger ? '#EF4444' : MINT }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = danger ? '#FECACA' : BORDER; e.currentTarget.style.color = c }}
    >
      {children}
    </button>
  )
}

function TextField({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: MUTED }}>{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-[10px] text-[13.5px] border outline-none transition-colors"
        style={{ background: '#F9FAFB', borderColor: BORDER, color: INK }}
        onFocus={e => (e.target.style.borderColor = MINT)}
        onBlur={e => (e.target.style.borderColor = BORDER)}
      />
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold border-[1.5px] cursor-pointer transition-all"
      style={active
        ? { background: '#ECFDF5', borderColor: MINT, color: MINT_D }
        : { background: '#F9FAFB', borderColor: BORDER, color: MUTED }}
    >
      {children}
    </button>
  )
}

// ── Image compression (no dependency) ─────────────────────────
async function compressImage(file: File, maxSize = 512, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
    return blob ?? file
  } catch { return file }
}

// ════════════════════════════════════════════════════════════
// Bail modal (préservé)
// ════════════════════════════════════════════════════════════
function BailModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ address: '', city: '', monthly_rent: '', start_date: '', end_date: '', nb_roommates: '1' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!form.address || !form.monthly_rent || !form.start_date) {
      setError('Adresse, loyer et date de début sont obligatoires.'); return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error: err } = await supabase.from('leases').insert({
        tenant_id: user.id, owner_id: user.id, address: form.address, city: form.city,
        monthly_rent: parseInt(form.monthly_rent), start_date: form.start_date,
        end_date: form.end_date || null, nb_roommates: parseInt(form.nb_roommates) || 1, status: 'active',
      })
      if (err) { setError(err.message); setSaving(false); return }
      onCreated()
    } catch { setError('Erreur inattendue.') }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="rounded-[20px] p-6 w-full" style={{ background: CARD, maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,.2)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[18px]" style={{ fontFamily: SERIF, color: INK }}>Entrer les infos de mon bail</h3>
          <button onClick={onClose} className="border-none bg-transparent cursor-pointer text-lg" style={{ color: '#9CA3AF' }}>✕</button>
        </div>
        {error && <p className="text-[12.5px] mb-4 px-3 py-2 rounded-[8px]" style={{ background: '#FEF2F2', color: '#DC2626' }}>{error}</p>}
        <div className="flex flex-col gap-3.5">
          <TextField label="Adresse *" value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} placeholder="12 Rue de la Roquette" />
          <TextField label="Ville" value={form.city} onChange={v => setForm(p => ({ ...p, city: v }))} placeholder="Paris 11e" />
          <TextField label="Loyer mensuel (€) *" type="number" value={form.monthly_rent} onChange={v => setForm(p => ({ ...p, monthly_rent: v }))} placeholder="850" />
          <TextField label="Date de début *" type="date" value={form.start_date} onChange={v => setForm(p => ({ ...p, start_date: v }))} />
          <TextField label="Date de fin (optionnel)" type="date" value={form.end_date} onChange={v => setForm(p => ({ ...p, end_date: v }))} />
          <TextField label="Nombre de colocataires" type="number" value={form.nb_roommates} onChange={v => setForm(p => ({ ...p, nb_roommates: v }))} placeholder="1" />
        </div>
        <div className="mt-5"><PrimaryBtn onClick={handleCreate} loading={saving}>🏠 Activer le mode locataire</PrimaryBtn></div>
      </motion.div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Document row — upload / preview / delete
// ════════════════════════════════════════════════════════════
function DocRow({ label, required, doc, uploading, onUpload, onDelete }: {
  label: string; required: boolean; doc?: DocInfo; uploading: boolean
  onUpload: (f: File) => void; onDelete: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const has = !!doc
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid #F3F4F6' }}>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }} />
      {/* Thumbnail / icon */}
      <div className="w-11 h-11 rounded-[9px] flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ background: has ? '#ECFDF5' : '#F3F4F6', border: `1px solid ${has ? '#A7F3D0' : BORDER}` }}>
        {has && doc!.isImage && doc!.url
          ? <img src={doc!.url} alt="" className="w-full h-full object-cover" />
          : <span className="text-[18px]">{has ? '📄' : required ? '📎' : '➕'}</span>}
      </div>
      {/* Label + status */}
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-semibold truncate" style={{ color: INK }}>
          {label}{!required && <span className="font-normal" style={{ color: '#9CA3AF' }}> · optionnel</span>}
        </div>
        {has ? (
          <div className="flex items-center gap-1.5 mt-0.5">
            {doc!.status === 'verified'
              ? <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#ECFDF5', color: MINT_D }}>✓ Validé</span>
              : doc!.status === 'rejected'
              ? <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEF2F2', color: '#DC2626' }}>✕ Refusé — à remplacer</span>
              : <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FFFBEB', color: '#D97706' }}>⏳ En attente de validation</span>}
            <span className="text-[10.5px] truncate" style={{ color: '#9CA3AF' }}>{doc!.name}</span>
          </div>
        ) : (
          <div className="text-[10.5px] mt-0.5" style={{ color: '#9CA3AF' }}>Aucun fichier</div>
        )}
      </div>
      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {has && doc!.url && (
          <a href={doc!.url} target="_blank" rel="noreferrer" className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full border-[1.5px]" style={{ borderColor: BORDER, color: MUTED }}>Voir</a>
        )}
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="text-[11px] font-bold px-3 py-1.5 rounded-full border-none cursor-pointer text-white disabled:opacity-60"
          style={{ background: has ? '#F59E0B' : `linear-gradient(135deg, ${MINT}, ${MINT_D})` }}>
          {uploading ? '⏳' : has ? 'Remplacer' : 'Uploader'}
        </button>
        {has && (
          <button onClick={onDelete} className="text-[13px] px-1.5 py-1 rounded-full border-none bg-transparent cursor-pointer" style={{ color: '#EF4444' }} title="Supprimer">🗑</button>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
// Main page
// ════════════════════════════════════════════════════════════
export default function ProfilPage() {
  const router = useRouter()
  const { lease, mode, refresh: refreshLease } = useLease()
  const { toast } = useToast()

  const [loaded, setLoaded] = useState(false)
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')

  // Profile fields
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [budgetMax, setBudgetMax] = useState(700)
  const [schedule, setSchedule] = useState<string | null>(null)
  const [vibe, setVibe] = useState<string | null>(null)
  const [passions, setPassions] = useState<string[]>([])
  const [smoker, setSmoker] = useState<boolean | null>(null)
  const [petsOk, setPetsOk] = useState<boolean | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [notifs, setNotifs] = useState(true)
  const [quizDone, setQuizDone] = useState(false)
  const [cityOptions, setCityOptions] = useState<string[]>([])

  // Section drafts / editing
  const [editInfo, setEditInfo] = useState(false)
  const [editPrefs, setEditPrefs] = useState(false)
  const [savingInfo, setSavingInfo] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [dInfo, setDInfo] = useState({ firstName: '', lastName: '', bio: '', phone: '' })
  const [dPrefs, setDPrefs] = useState({ city: '', budgetMax: 700, schedule: null as string | null, vibe: null as string | null, passions: [] as string[], smoker: null as boolean | null, petsOk: null as boolean | null })

  // Avatar
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Documents / certification
  const [docs, setDocs] = useState<Docs>({})
  const [docUploading, setDocUploading] = useState<DocType | null>(null)
  const [certLevel, setCertLevel] = useState<CertLevel>(0)

  const [showBailModal, setShowBailModal] = useState(false)

  // ── Completion computation ──────────────────────────────────
  const completion = [
    { key: 'photo', label: 'Photo de profil', done: !!avatarUrl },
    { key: 'name', label: 'Prénom & nom', done: !!(firstName && lastName) },
    { key: 'bio', label: 'Bio (20+ car.)', done: bio.trim().length > 20 },
    { key: 'city', label: 'Ville & budget', done: !!city && budgetMax > 0 },
    { key: 'quiz', label: 'Test de compatibilité', done: quizDone },
    { key: 'cni', label: "Pièce d'identité", done: !!(docs.identity_front && docs.identity_back) },
    { key: 'income', label: 'Justificatif de revenus', done: !!(docs.payslip && docs.domicile) },
  ]
  const doneCount = completion.filter(c => c.done).length
  const completionPct = Math.round((doneCount / completion.length) * 100)

  // Level criteria
  const l1Done = !!avatarUrl && !!firstName && !!lastName && bio.trim().length > 20 && !!city && budgetMax > 0 && !!email
  const idDone = !!(docs.identity_front && docs.identity_back)
  const incomeDone = !!(docs.payslip && docs.domicile)
  const computedLevel: CertLevel = (l1Done && idDone && incomeDone) ? 3 : (l1Done && idDone) ? 2 : l1Done ? 1 : 0

  const levelStatus = (lvl: number): CertStatus => {
    const list = lvl === 2 ? ID_DOCS : lvl === 3 ? INCOME_DOCS : []
    const req = list.filter(d => d.required).map(d => docs[d.type]).filter(Boolean) as DocInfo[]
    if (req.length === 0) return 'verified'
    if (req.some(d => d.status === 'rejected')) return 'rejected'
    if (req.some(d => d.status === 'pending')) return 'pending'
    return 'verified'
  }

  // ── Load everything ─────────────────────────────────────────
  const loadDocs = useCallback(async (uid: string): Promise<Docs> => {
    const supabase = createClient()
    const { data } = await supabase.from('user_documents').select('*').eq('user_id', uid)
    const map: Docs = {}
    for (const row of data ?? []) {
      const path = row.storage_path ?? ''
      let url: string | null = null
      if (path) {
        const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
        url = signed?.signedUrl ?? null
      }
      const name = path.split('/').pop() ?? 'document'
      map[row.type as DocType] = {
        path, status: (row.status as CertStatus) ?? 'pending', url,
        isImage: /\.(png|jpe?g|webp|gif|avif)$/i.test(path), name,
      }
    }
    return map
  }, [])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoaded(true); return }
      setUserId(user.id)
      setEmail(user.email ?? '')

      const [{ data: profile }, docMap, { data: listingCities }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        loadDocs(user.id),
        supabase.from('listings').select('city').not('city', 'is', null).limit(200),
      ])

      if (profile) {
        setAvatarUrl(profile.avatar_url ?? null)
        setFirstName(profile.first_name ?? '')
        setLastName(profile.last_name ?? '')
        setBio(profile.bio ?? '')
        setPhone(profile.phone ?? '')
        setCity(profile.city ?? '')
        setBudgetMax(profile.budget_max ?? 700)
        setSchedule(profile.schedule ?? null)
        setVibe(profile.vibe ?? null)
        setPassions(profile.passions ?? [])
        setSmoker(profile.smoker ?? null)
        setPetsOk(profile.pets_ok ?? null)
        setIsVisible(profile.is_visible ?? true)
        setQuizDone(!!(profile.matching_data && typeof profile.matching_data.completed_at === 'string'))
      }
      setDocs(docMap)
      if (listingCities) {
        setCityOptions(Array.from(new Set(listingCities.map((l: { city: string }) => l.city).filter(Boolean))).slice(0, 40))
      }
      setLoaded(true)
    }
    load()
  }, [loadDocs])

  // ── Persist cert_level when the computed value changes ───────
  useEffect(() => {
    if (!loaded || !userId) return
    if (computedLevel === certLevel) return
    setCertLevel(computedLevel)
    createClient().from('profiles').update({ cert_level: computedLevel }).eq('id', userId)
  }, [loaded, userId, computedLevel, certLevel])

  // ── Save: Infos personnelles ────────────────────────────────
  function openEditInfo() { setDInfo({ firstName, lastName, bio, phone }); setEditInfo(true) }
  async function saveInfo() {
    setSavingInfo(true)
    try {
      const { error } = await createClient().from('profiles').update({
        first_name: dInfo.firstName.trim(), last_name: dInfo.lastName.trim(),
        bio: dInfo.bio.trim(), phone: dInfo.phone.trim(),
      }).eq('id', userId)
      if (error) throw error
      setFirstName(dInfo.firstName.trim()); setLastName(dInfo.lastName.trim())
      setBio(dInfo.bio.trim()); setPhone(dInfo.phone.trim())
      setEditInfo(false)
      toast({ title: '✓ Modifications enregistrées', description: 'Vos informations personnelles sont à jour.', duration: 3000 })
    } catch (e) {
      toast({ title: 'Échec de la sauvegarde', description: (e as Error).message || 'Réessayez.', variant: 'destructive' })
    }
    setSavingInfo(false)
  }

  // ── Save: Préférences coloc ─────────────────────────────────
  function openEditPrefs() { setDPrefs({ city, budgetMax, schedule, vibe, passions, smoker, petsOk }); setEditPrefs(true) }
  async function savePrefs() {
    setSavingPrefs(true)
    try {
      const { error } = await createClient().from('profiles').update({
        city: dPrefs.city.trim(), budget_max: dPrefs.budgetMax,
        schedule: dPrefs.schedule, vibe: dPrefs.vibe, passions: dPrefs.passions,
        smoker: dPrefs.smoker, pets_ok: dPrefs.petsOk,
      }).eq('id', userId)
      if (error) throw error
      setCity(dPrefs.city.trim()); setBudgetMax(dPrefs.budgetMax)
      setSchedule(dPrefs.schedule); setVibe(dPrefs.vibe); setPassions(dPrefs.passions)
      setSmoker(dPrefs.smoker); setPetsOk(dPrefs.petsOk)
      setEditPrefs(false)
      toast({ title: '✓ Modifications enregistrées', description: 'Vos préférences coloc sont à jour.', duration: 3000 })
    } catch (e) {
      toast({ title: 'Échec de la sauvegarde', description: (e as Error).message || 'Réessayez.', variant: 'destructive' })
    }
    setSavingPrefs(false)
  }

  // ── Avatar upload ───────────────────────────────────────────
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setUploadingAvatar(true)
    try {
      const supabase = createClient()
      const compressed = await compressImage(file)
      const path = `${userId}/avatar-${Date.now()}.jpg`
      const { error } = await supabase.storage.from('avatars').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const bust = `${publicUrl}?v=${Date.now()}`
      setAvatarUrl(bust)
      const { error: uerr } = await supabase.from('profiles').update({ avatar_url: bust }).eq('id', userId)
      if (uerr) throw uerr
      toast({ title: '✓ Photo mise à jour', duration: 2500 })
    } catch (err) {
      toast({ title: 'Échec de l\'upload', description: (err as Error).message || 'Réessayez.', variant: 'destructive' })
    }
    setUploadingAvatar(false)
  }

  // ── Document upload / delete ─────────────────────────────────
  async function uploadDoc(type: DocType, file: File) {
    setDocUploading(type)
    try {
      const supabase = createClient()
      const isImage = file.type.startsWith('image/')
      const body: Blob = isImage ? await compressImage(file, 1600, 0.82) : file
      const ext = isImage ? 'jpg' : (file.name.split('.').pop() || 'pdf')
      const path = `${userId}/${type}-${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, body, {
        contentType: isImage ? 'image/jpeg' : file.type || 'application/octet-stream',
      })
      if (upErr) throw upErr

      // Remove previous storage object (replacement)
      const prev = docs[type]
      if (prev?.path && prev.path !== path) {
        await supabase.storage.from(BUCKET).remove([prev.path])
      }

      const { error: dbErr } = await supabase.from('user_documents').upsert({
        user_id: userId, type, file_url: path, storage_path: path, status: 'pending', updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,type' })
      if (dbErr) throw dbErr

      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
      setDocs(d => ({ ...d, [type]: { path, status: 'pending', url: signed?.signedUrl ?? null, isImage: /\.(png|jpe?g|webp|gif|avif)$/i.test(path), name: path.split('/').pop() ?? 'document' } }))
      toast({ title: '✓ Document envoyé', description: 'En attente de validation.', duration: 3000 })
    } catch (err) {
      toast({ title: 'Échec de l\'upload', description: (err as Error).message || 'Réessayez.', variant: 'destructive' })
    }
    setDocUploading(null)
  }

  async function deleteDoc(type: DocType) {
    const doc = docs[type]
    if (!doc) return
    try {
      const supabase = createClient()
      if (doc.path) await supabase.storage.from(BUCKET).remove([doc.path])
      await supabase.from('user_documents').delete().eq('user_id', userId).eq('type', type)
      setDocs(d => { const n = { ...d }; delete n[type]; return n })
      toast({ title: 'Document supprimé', duration: 2500 })
    } catch (err) {
      toast({ title: 'Échec de la suppression', description: (err as Error).message, variant: 'destructive' })
    }
  }

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/')
  }

  const displayName = `${firstName} ${lastName}`.trim() || 'Profil incomplet'
  const initials = `${(firstName[0] ?? '')}${(lastName[0] ?? '')}`.toUpperCase()
  const nextStep = completion.find(c => !c.done)
  const dynamicPhrase = completionPct === 100
    ? '🎉 Dossier complet — vous êtes prêt·e à convaincre !'
    : `Plus que ${completion.length - doneCount} étape${completion.length - doneCount > 1 ? 's' : ''} pour un dossier vérifié`

  // ── Skeleton ────────────────────────────────────────────────
  if (!loaded) {
    return (
      <>
        <Topbar title="Mon profil" />
        <div className="flex-1 overflow-y-auto p-8" style={{ maxWidth: '720px' }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="rounded-[18px] mb-4 animate-pulse" style={{ background: '#F3F4F6', height: i === 0 ? 120 : 160 }} />
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar title="Mon profil" />
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

      <div className="flex-1 overflow-y-auto p-6 md:p-8" style={{ maxWidth: '720px' }}>

        {/* ── HEADER ─────────────────────────────────────────── */}
        <Card>
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" referrerPolicy="no-referrer" className="w-[76px] h-[76px] rounded-full object-cover" style={{ border: `2px solid ${MINT}` }} />
              ) : (
                <div className="w-[76px] h-[76px] rounded-full flex items-center justify-center text-2xl font-extrabold text-white" style={{ background: `linear-gradient(135deg, ${MINT}, ${MINT_D})` }}>
                  {initials || '👤'}
                </div>
              )}
              <button onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar}
                className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[12px] cursor-pointer disabled:opacity-60"
                style={{ background: MINT, color: '#fff' }} title="Changer la photo">
                {uploadingAvatar ? '…' : '📷'}
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-[22px] leading-tight mb-0.5 truncate" style={{ fontFamily: SERIF, color: INK }}>{displayName}</h2>
              <p className="text-[13px] mb-2" style={{ color: MUTED }}>{city || 'Ville non renseignée'}</p>
              {certLevel > 0
                ? <CertificationBadge level={certLevel} status={levelStatus(certLevel)} size="md" />
                : <span className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full" style={{ background: '#F3F4F6', color: MUTED }}>Non vérifié</span>}
            </div>

            <ProgressRing pct={completionPct} />
          </div>

          {nextStep && (
            <div className="mt-4 flex items-center gap-2 px-3.5 py-2.5 rounded-[12px]" style={{ background: '#ECFDF5' }}>
              <span className="text-[13px]">✨</span>
              <span className="text-[12.5px] font-semibold" style={{ color: MINT_D }}>{dynamicPhrase}</span>
            </div>
          )}
        </Card>

        {/* ── CHECKLIST DE COMPLÉTION ────────────────────────── */}
        <Card delay={0.04}>
          <SectionTitle icon="✅">Complétion du dossier</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {completion.map(c => (
              <div key={c.key} className="flex items-center gap-2 text-[12.5px] py-1">
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={c.done ? { background: MINT, color: '#fff' } : { background: '#F3F4F6', color: '#9CA3AF', border: `1px solid ${BORDER}` }}>
                  {c.done ? '✓' : ''}
                </span>
                <span style={{ color: c.done ? MUTED : INK, fontWeight: c.done ? 400 : 600 }}>{c.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* ── INFOS PERSONNELLES ─────────────────────────────── */}
        <Card accent={editInfo ? MINT : undefined} delay={0.08}>
          <SectionTitle icon="👤" action={!editInfo ? <GhostBtn small onClick={openEditInfo}>✏️ Modifier</GhostBtn> : undefined}>
            Infos personnelles
          </SectionTitle>
          <AnimatePresence mode="wait">
            {editInfo ? (
              <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Prénom" value={dInfo.firstName} onChange={v => setDInfo(p => ({ ...p, firstName: v }))} />
                  <TextField label="Nom" value={dInfo.lastName} onChange={v => setDInfo(p => ({ ...p, lastName: v }))} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: MUTED }}>Bio</label>
                  <textarea value={dInfo.bio} onChange={e => setDInfo(p => ({ ...p, bio: e.target.value.slice(0, 300) }))} rows={3}
                    placeholder="Présentez-vous en quelques mots…"
                    className="w-full px-3.5 py-2.5 rounded-[10px] text-[13.5px] border outline-none resize-none"
                    style={{ background: '#F9FAFB', borderColor: BORDER, color: INK }}
                    onFocus={e => (e.target.style.borderColor = MINT)} onBlur={e => (e.target.style.borderColor = BORDER)} />
                  <div className="text-right text-[11px] mt-1" style={{ color: dInfo.bio.length > 20 ? MINT_D : '#9CA3AF' }}>{dInfo.bio.length}/300</div>
                </div>
                <TextField label="Téléphone" value={dInfo.phone} onChange={v => setDInfo(p => ({ ...p, phone: v }))} placeholder="+33 6 …" />
                <div className="flex gap-2 mt-1">
                  <PrimaryBtn onClick={saveInfo} loading={savingInfo}>✓ Enregistrer</PrimaryBtn>
                  <GhostBtn onClick={() => setEditInfo(false)}>Annuler</GhostBtn>
                </div>
              </motion.div>
            ) : (
              <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {[
                  { l: 'Prénom & nom', v: displayName },
                  { l: 'Email', v: email || '—' },
                  { l: 'Téléphone', v: phone || '—' },
                ].map((r, i) => (
                  <div key={r.l} className="flex justify-between items-center py-2 text-[13.5px]" style={i < 2 ? { borderBottom: '1px solid #F3F4F6' } : {}}>
                    <span style={{ color: MUTED }}>{r.l}</span>
                    <span className="font-semibold text-right" style={{ color: INK }}>{r.v}</span>
                  </div>
                ))}
                <div className="pt-2.5 mt-1" style={{ borderTop: '1px solid #F3F4F6' }}>
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Bio</span>
                  <p className="text-[13px] mt-1" style={{ color: bio ? '#374151' : '#9CA3AF' }}>{bio || 'Aucune bio — ajoutez quelques mots pour vous présenter.'}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* ── PRÉFÉRENCES COLOC ──────────────────────────────── */}
        <Card accent={editPrefs ? MINT : undefined} delay={0.12}>
          <SectionTitle icon="🏡" action={!editPrefs ? <GhostBtn small onClick={openEditPrefs}>✏️ Modifier</GhostBtn> : undefined}>
            Préférences coloc
          </SectionTitle>
          <AnimatePresence mode="wait">
            {editPrefs ? (
              <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: MUTED }}>Ville recherchée</label>
                  <input list="city-list" value={dPrefs.city} onChange={e => setDPrefs(p => ({ ...p, city: e.target.value }))}
                    placeholder="Ex. Paris 11e" className="w-full px-3.5 py-2.5 rounded-[10px] text-[13.5px] border outline-none"
                    style={{ background: '#F9FAFB', borderColor: BORDER, color: INK }}
                    onFocus={e => (e.target.style.borderColor = MINT)} onBlur={e => (e.target.style.borderColor = BORDER)} />
                  <datalist id="city-list">{cityOptions.map(c => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: MUTED }}>Budget max</label>
                    <span className="text-[14px] font-extrabold" style={{ color: MINT_D }}>{dPrefs.budgetMax} €/mois</span>
                  </div>
                  <input type="range" min={300} max={2000} step={50} value={dPrefs.budgetMax}
                    onChange={e => setDPrefs(p => ({ ...p, budgetMax: parseInt(e.target.value) }))}
                    className="w-full cursor-pointer" style={{ accentColor: MINT }} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Rythme</label>
                  <div className="flex flex-wrap gap-2">
                    {SCHEDULE_OPTS.map(o => <Chip key={o.v} active={dPrefs.schedule === o.v} onClick={() => setDPrefs(p => ({ ...p, schedule: p.schedule === o.v ? null : o.v }))}>{o.label}</Chip>)}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Ambiance</label>
                  <div className="flex flex-wrap gap-2">
                    {VIBE_OPTS.map(o => <Chip key={o.v} active={dPrefs.vibe === o.v} onClick={() => setDPrefs(p => ({ ...p, vibe: p.vibe === o.v ? null : o.v }))}>{o.label}</Chip>)}
                  </div>
                </div>
                <div className="flex gap-6">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Fumeur</label>
                    <div className="flex gap-2">
                      <Chip active={dPrefs.smoker === false} onClick={() => setDPrefs(p => ({ ...p, smoker: false }))}>🚭 Non</Chip>
                      <Chip active={dPrefs.smoker === true} onClick={() => setDPrefs(p => ({ ...p, smoker: true }))}>🚬 Oui</Chip>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Animaux</label>
                    <div className="flex gap-2">
                      <Chip active={dPrefs.petsOk === true} onClick={() => setDPrefs(p => ({ ...p, petsOk: true }))}>🐾 OK</Chip>
                      <Chip active={dPrefs.petsOk === false} onClick={() => setDPrefs(p => ({ ...p, petsOk: false }))}>🚫 Non</Chip>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: MUTED }}>Passions</label>
                  <div className="flex flex-wrap gap-2">
                    {PASSIONS.map(p => (
                      <Chip key={p} active={dPrefs.passions.includes(p)}
                        onClick={() => setDPrefs(pr => ({ ...pr, passions: pr.passions.includes(p) ? pr.passions.filter(x => x !== p) : [...pr.passions, p] }))}>
                        {PASSION_EMOJI[p]} {p}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 mt-1">
                  <PrimaryBtn onClick={savePrefs} loading={savingPrefs}>✓ Enregistrer</PrimaryBtn>
                  <GhostBtn onClick={() => setEditPrefs(false)}>Annuler</GhostBtn>
                </div>
              </motion.div>
            ) : (
              <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex justify-between items-center py-2 text-[13.5px]" style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ color: MUTED }}>Ville</span><span className="font-semibold" style={{ color: INK }}>{city || '—'}</span>
                </div>
                <div className="flex justify-between items-center py-2 text-[13.5px]" style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ color: MUTED }}>Budget max</span><span className="font-bold" style={{ color: MINT_D }}>{budgetMax ? `${budgetMax} €/mois` : '—'}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-3">
                  {[
                    SCHEDULE_OPTS.find(o => o.v === schedule)?.label,
                    VIBE_OPTS.find(o => o.v === vibe)?.label,
                    smoker === false ? '🚭 Non-fumeur' : smoker === true ? '🚬 Fumeur' : null,
                    petsOk === true ? '🐾 Animaux OK' : petsOk === false ? '🚫 Sans animaux' : null,
                    ...passions.map(p => `${PASSION_EMOJI[p]} ${p}`),
                  ].filter(Boolean).map((t, i) => (
                    <span key={i} className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: '#ECFDF5', color: MINT_D }}>{t}</span>
                  ))}
                  {!schedule && !vibe && passions.length === 0 && smoker === null && petsOk === null && (
                    <span className="text-[12.5px]" style={{ color: '#9CA3AF' }}>Aucune préférence renseignée.</span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* ── DOSSIER & VÉRIFICATION ─────────────────────────── */}
        <Card delay={0.16}>
          <SectionTitle icon="🛡️">Dossier & vérification</SectionTitle>
          <p className="text-[12.5px] mb-4" style={{ color: MUTED }}>
            Vos documents sont <span className="font-semibold" style={{ color: INK }}>privés</span> et ne sont jamais rendus publics.
          </p>

          {/* Niveau 1 */}
          <div className="rounded-[14px] p-4 mb-2.5" style={{ background: l1Done ? '#F0FDF4' : '#F9FAFB', border: `1px solid ${l1Done ? '#A7F3D0' : BORDER}` }}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[13px] font-bold" style={{ color: INK }}>Niveau 1 — Profil vérifié</span>
              {l1Done ? <CertificationBadge level={1} size="sm" /> : <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FFFBEB', color: '#D97706' }}>À compléter</span>}
            </div>
            <p className="text-[11.5px]" style={{ color: MUTED }}>
              {l1Done ? '✓ Email confirmé, photo, bio et infos de base complétés.' : 'Complétez photo, bio (20+ car.), nom, ville et budget pour valider ce niveau.'}
            </p>
          </div>

          {/* Niveau 2 */}
          <div className="rounded-[14px] p-4 mb-2.5" style={{ background: CARD, border: `1px solid ${idDone ? '#93C5FD' : BORDER}` }}>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[13px] font-bold" style={{ color: INK }}>Niveau 2 — Identité certifiée</span>
              {idDone ? <CertificationBadge level={2} status={levelStatus(2)} size="sm" /> : <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#F3F4F6', color: MUTED }}>Pièce d'identité requise</span>}
            </div>
            {ID_DOCS.map(d => (
              <DocRow key={d.type} label={d.label} required={d.required} doc={docs[d.type]} uploading={docUploading === d.type}
                onUpload={f => uploadDoc(d.type, f)} onDelete={() => deleteDoc(d.type)} />
            ))}
            {!idDone && <p className="text-[11.5px] mt-2.5" style={{ color: '#9CA3AF' }}>➜ Ajoutez le recto ET le verso de votre pièce d'identité pour atteindre le niveau 2.</p>}
          </div>

          {/* Niveau 3 */}
          <div className="rounded-[14px] p-4" style={{ background: CARD, border: `1px solid ${incomeDone ? '#FDE68A' : BORDER}`, opacity: idDone ? 1 : 0.65 }}>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[13px] font-bold" style={{ color: INK }}>Niveau 3 — Dossier complet</span>
              {!idDone
                ? <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#F3F4F6', color: '#9CA3AF' }}>🔒 Niveau 2 requis</span>
                : incomeDone ? <CertificationBadge level={3} status={levelStatus(3)} size="sm" /> : <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#FFFBEB', color: '#D97706' }}>Justificatifs requis</span>}
            </div>
            {idDone ? (
              <>
                {INCOME_DOCS.map(d => (
                  <DocRow key={d.type} label={d.label} required={d.required} doc={docs[d.type]} uploading={docUploading === d.type}
                    onUpload={f => uploadDoc(d.type, f)} onDelete={() => deleteDoc(d.type)} />
                ))}
                {!incomeDone && <p className="text-[11.5px] mt-2.5" style={{ color: '#9CA3AF' }}>➜ Ajoutez un justificatif de revenus et un justificatif de domicile.</p>}
              </>
            ) : (
              <p className="text-[12px]" style={{ color: '#9CA3AF' }}>Validez d'abord votre identité (Niveau 2) pour débloquer le dossier complet.</p>
            )}
          </div>
        </Card>

        {/* ── TEST DE COMPATIBILITÉ ──────────────────────────── */}
        <Card delay={0.2}>
          <SectionTitle icon="🧪">Test de compatibilité</SectionTitle>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12.5px]" style={{ color: MUTED }}>
              {quizDone ? '✓ Test complété — il alimente votre score de matching.' : 'Passez le test pour améliorer la qualité de vos matchs.'}
            </p>
            <Link href="/app/quiz" className="flex-shrink-0">
              <PrimaryBtn small>{quizDone ? '🔄 Refaire' : '🧪 Passer le test'}</PrimaryBtn>
            </Link>
          </div>
        </Card>

        {/* ── AVIS REÇUS ─────────────────────────────────────── */}
        <Card delay={0.24}>
          <SectionTitle icon="⭐">Avis reçus</SectionTitle>
          <ReviewStars userId={userId} canReview={false} />
        </Card>

        {/* ── MA SITUATION ───────────────────────────────────── */}
        <Card delay={0.28}>
          <SectionTitle icon="📍">Ma situation</SectionTitle>
          <div className="flex gap-3">
            <button className="flex-1 py-3 rounded-[12px] border-[2px] cursor-pointer transition-all text-[13px] font-semibold"
              style={mode === 'locataire' ? { background: '#ECFDF5', borderColor: MINT, color: MINT_D } : { background: '#F9FAFB', borderColor: BORDER, color: MUTED }}>
              🔍 Je cherche une coloc
              {mode === 'locataire' && <div className="text-[10px] mt-0.5" style={{ color: MINT }}>Mode actuel</div>}
            </button>
            <button onClick={() => { if (mode === 'locataire') setShowBailModal(true) }}
              className="flex-1 py-3 rounded-[12px] border-[2px] cursor-pointer transition-all text-[13px] font-semibold"
              style={mode === 'loueur' ? { background: '#ECFDF5', borderColor: MINT, color: MINT_D } : { background: '#F9FAFB', borderColor: BORDER, color: MUTED }}>
              🏠 Je suis dans un bail
              {mode === 'loueur' && <div className="text-[10px] mt-0.5" style={{ color: MINT }}>Mode actuel</div>}
            </button>
          </div>
          {mode === 'loueur' && lease && (
            <div className="mt-3 px-3 py-2.5 rounded-[10px] text-[12.5px]" style={{ background: '#F0FDF4', color: MINT_D }}>
              📍 {lease.address}{lease.city ? `, ${lease.city}` : ''} · {lease.monthly_rent} €/mois
            </div>
          )}
        </Card>

        {/* ── PARAMÈTRES ─────────────────────────────────────── */}
        <Card delay={0.32}>
          <SectionTitle icon="⚙️">Paramètres</SectionTitle>
          <div className="flex justify-between items-center py-2 text-[13.5px]" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ color: '#374151' }}>Notifications</span>
            <input type="checkbox" checked={notifs} onChange={e => setNotifs(e.target.checked)} className="w-[17px] h-[17px] cursor-pointer" style={{ accentColor: MINT }} />
          </div>
          <div className="flex justify-between items-center py-2 text-[13.5px]" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <div>
              <span style={{ color: '#374151' }}>Profil visible</span>
              <span className="block text-[11px]" style={{ color: '#9CA3AF' }}>Apparaître dans les recherches</span>
            </div>
            <input type="checkbox" checked={isVisible}
              onChange={async e => {
                const v = e.target.checked; setIsVisible(v)
                const { error } = await createClient().from('profiles').update({ is_visible: v }).eq('id', userId)
                if (error) { setIsVisible(!v); toast({ title: 'Échec', description: error.message, variant: 'destructive' }) }
                else toast({ title: v ? 'Profil visible' : 'Profil masqué', duration: 2000 })
              }}
              className="w-[17px] h-[17px] cursor-pointer" style={{ accentColor: MINT }} />
          </div>
          <div className="flex justify-between items-center py-2 text-[13.5px]">
            <button onClick={handleSignOut} className="font-semibold border-none bg-transparent cursor-pointer text-[13.5px] p-0" style={{ color: '#EF4444' }}>Déconnexion</button>
            <span style={{ color: '#D1D5DB' }}>›</span>
          </div>
        </Card>
      </div>

      {showBailModal && (
        <BailModal onClose={() => setShowBailModal(false)} onCreated={() => { setShowBailModal(false); refreshLease(); router.push('/app/dashboard') }} />
      )}
    </>
  )
}
