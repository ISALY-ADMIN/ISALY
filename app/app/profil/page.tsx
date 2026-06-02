'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import CertificationBadge from '@/components/ui/CertificationBadge'
import ProfileCompletion from '@/components/ui/ProfileCompletion'
import ReviewStars from '@/components/ui/ReviewStars'
import { createClient } from '@/lib/supabase/client'
import { useLease } from '@/contexts/LeaseContext'

// ── Helpers ───────────────────────────────────────────────────
function scheduleToTag(s: string | null): string | null {
  if (s === 'couche-tard') return '🌙 Couche-tard'
  if (s === 'leve-tot') return '🌅 Lève-tôt'
  if (s === 'variable') return '🔄 Variable'
  if (s === 'flexible') return '💤 Flexible'
  return null
}

function vibeToTag(v: string | null): string | null {
  if (v === 'calme') return '🤫 Calme'
  if (v === 'festif') return '🎉 Festif'
  if (v === 'studieux') return '🎯 Studieux'
  if (v === 'detendu') return '😎 Détendu'
  return null
}

const PASSION_LABELS: Record<string, string> = {
  Musique: '🎵 Musique',
  Cinéma: '🎬 Cinéma',
  Sport: '🏃 Sport',
  Cuisine: '🍳 Cuisine',
  Art: '🎨 Art',
  Lecture: '📚 Lecture',
  Voyages: '🌍 Voyages',
  Gaming: '🎮 Gaming',
}

function buildLifestyleTags(schedule: string | null, vibe: string | null, passions: string[] | null): string[] {
  const tags: string[] = []
  const st = scheduleToTag(schedule)
  if (st) tags.push(st)
  const vt = vibeToTag(vibe)
  if (vt) tags.push(vt)
  if (passions) {
    passions.forEach(p => {
      if (PASSION_LABELS[p]) tags.push(PASSION_LABELS[p])
    })
  }
  return tags.slice(0, 5)
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="text-[10.5px] font-extrabold uppercase tracking-[1.5px] mb-2.5" style={{ color: '#9CA3AF' }}>
      {children}
    </div>
  )
}

function OutlineBtn({
  children,
  onClick,
  danger,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
}) {
  const base = danger ? { borderColor: '#EF4444', color: '#EF4444' } : { borderColor: '#E5E7EB', color: '#6B7280' }
  const hover = danger ? { borderColor: '#EF4444', color: '#EF4444', background: '#FEF2F2' } : { borderColor: '#4ECBA0', color: '#4ECBA0' }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-full text-[12.5px] font-semibold border-[1.5px] cursor-pointer transition-all bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      style={base}
      onMouseEnter={e => !disabled && Object.assign(e.currentTarget.style, hover)}
      onMouseLeave={e => !disabled && Object.assign(e.currentTarget.style, { ...base, background: 'transparent' })}
    >
      {children}
    </button>
  )
}

function EditInput({
  value,
  onChange,
  type = 'text',
  suffix,
}: {
  value: string
  onChange: (v: string) => void
  type?: string
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded-[7px] px-2.5 py-1 text-[13px] border outline-none w-[160px]"
        style={{ background: '#F9FAFB', borderColor: '#4ECBA0', color: '#111827' }}
      />
      {suffix && <span className="text-[12px]" style={{ color: '#9CA3AF' }}>{suffix}</span>}
    </div>
  )
}

// ── Phone verification modal ──────────────────────────────────
function PhoneModal({ onClose, onVerified }: { onClose: () => void; onVerified: () => void }) {
  const [step, setStep] = useState<'input' | 'code'>('input')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  function sendCode() {
    setLoading(true)
    setTimeout(() => { setLoading(false); setStep('code') }, 1200)
  }

  function verify() {
    if (code.length < 4) return
    setLoading(true)
    setTimeout(() => { setLoading(false); onVerified() }, 1000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,.82)' }} onClick={onClose}>
      <div className="rounded-[20px] p-7" style={{ background: '#1A1A1A', border: '1px solid #2D2D2D', maxWidth: '380px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-[17px]" style={{ fontFamily: "'DM Serif Display', serif", color: '#F1F5F9' }}>
            {step === 'input' ? 'Vérifier mon téléphone' : 'Entrez le code SMS'}
          </h3>
          <button onClick={onClose} className="border-none bg-transparent cursor-pointer text-lg" style={{ color: '#6B7280' }}>✕</button>
        </div>

        {step === 'input' ? (
          <>
            <p className="text-[12.5px] mb-4" style={{ color: '#6B7280' }}>Un code à 6 chiffres sera envoyé par SMS.</p>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 6 …" className="w-full px-3.5 py-2.5 rounded-[9px] text-[13.5px] border outline-none mb-4" style={{ background: '#252525', borderColor: '#2D2D2D', color: '#F1F5F9' }} onFocus={e => (e.target.style.borderColor = '#4ECBA0')} onBlur={e => (e.target.style.borderColor = '#2D2D2D')} />
            <button onClick={sendCode} disabled={loading} className="w-full py-2.5 rounded-full text-[13px] font-bold text-white border-none cursor-pointer disabled:opacity-60" style={{ background: '#4ECBA0' }}>
              {loading ? 'Envoi…' : 'Envoyer le code SMS'}
            </button>
          </>
        ) : (
          <>
            <p className="text-[12.5px] mb-4" style={{ color: '#6B7280' }}>Code envoyé au {phone}</p>
            <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="• • • • • •" className="w-full px-3.5 py-2.5 rounded-[9px] text-[20px] tracking-[8px] text-center border outline-none mb-4 font-bold" style={{ background: '#252525', borderColor: '#2D2D2D', color: '#F1F5F9' }} onFocus={e => (e.target.style.borderColor = '#4ECBA0')} onBlur={e => (e.target.style.borderColor = '#2D2D2D')} />
            <div className="flex gap-2">
              <button onClick={() => setStep('input')} className="flex-1 py-2.5 rounded-full text-[13px] font-semibold border-none cursor-pointer" style={{ background: '#2D2D2D', color: '#E5E7EB' }}>Retour</button>
              <button onClick={verify} disabled={loading || code.length < 4} className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-white border-none cursor-pointer disabled:opacity-60" style={{ background: '#4ECBA0' }}>
                {loading ? 'Vérification…' : 'Vérifier'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Bail modal ───────────────────────────────────────────────
function BailModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ address: '', city: '', monthly_rent: '', start_date: '', end_date: '', nb_roommates: '1' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!form.address || !form.monthly_rent || !form.start_date) {
      setError('Adresse, loyer et date de début sont obligatoires.')
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: err } = await supabase.from('leases').insert({
        tenant_id: user.id,
        owner_id: user.id,
        address: form.address,
        city: form.city,
        monthly_rent: parseInt(form.monthly_rent),
        start_date: form.start_date,
        end_date: form.end_date || null,
        nb_roommates: parseInt(form.nb_roommates) || 1,
        status: 'active',
      })

      if (err) { setError(err.message); setSaving(false); return }
      onCreated()
    } catch { setError('Erreur inattendue.') }
    setSaving(false)
  }

  const fieldStyle = {
    background: '#F9FAFB',
    borderColor: '#E5E7EB',
    color: '#111827',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div
        className="rounded-[20px] p-6 w-full"
        style={{ background: '#FFFFFF', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,.2)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[18px]" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>Entrer les infos de mon bail</h3>
          <button onClick={onClose} className="border-none bg-transparent cursor-pointer text-lg" style={{ color: '#9CA3AF' }}>✕</button>
        </div>

        {error && <p className="text-[12.5px] mb-4 px-3 py-2 rounded-[8px]" style={{ background: '#FEF2F2', color: '#DC2626' }}>{error}</p>}

        {[
          { key: 'address', label: 'Adresse *', placeholder: '12 Rue de la Roquette' },
          { key: 'city', label: 'Ville', placeholder: 'Paris 11e' },
          { key: 'monthly_rent', label: 'Loyer mensuel (€) *', placeholder: '850', type: 'number' },
          { key: 'start_date', label: 'Date de début *', placeholder: '', type: 'date' },
          { key: 'end_date', label: 'Date de fin (optionnel)', placeholder: '', type: 'date' },
          { key: 'nb_roommates', label: 'Nombre de colocataires', placeholder: '1', type: 'number' },
        ].map(f => (
          <div key={f.key} className="mb-3.5">
            <label className="block text-[11.5px] font-extrabold uppercase tracking-wider mb-1.5" style={{ color: '#6B7280' }}>{f.label}</label>
            <input
              type={f.type ?? 'text'}
              value={form[f.key as keyof typeof form]}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="w-full px-4 py-2.5 rounded-[10px] text-[13.5px] border outline-none"
              style={fieldStyle}
              onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
              onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
            />
          </div>
        ))}

        <button
          onClick={handleCreate}
          disabled={saving}
          className="w-full py-3 rounded-full text-[13.5px] font-bold text-white border-none cursor-pointer mt-2 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)' }}
        >
          {saving ? 'Création…' : '🏠 Activer le mode locataire'}
        </button>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────
export default function ProfilPage() {
  const router = useRouter()
  const { lease, mode, refresh: refreshLease } = useLease()

  // Settings
  const [notifs, setNotifs] = useState(true)
  const [visible, setVisible] = useState(true)
  const [showBailModal, setShowBailModal] = useState(false)

  // Profile data from Supabase
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [lifestyleTags, setLifestyleTags] = useState<string[]>([])
  const [profileLoaded, setProfileLoaded] = useState(false)

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    budgetMax: '',
    searchZone: '',
  })
  const [draft, setDraft] = useState(form)

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Certification — Level 2
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const level2Docs = { identityFront: false, identityBack: false, selfie: false }
  const level2Steps = [
    level2Docs.identityFront && level2Docs.identityBack,
    level2Docs.selfie,
    phoneVerified,
  ]
  const level2Progress = Math.round((level2Steps.filter(Boolean).length / level2Steps.length) * 100)
  const level2Submitted = level2Steps.every(Boolean)

  // Certification — Level 3
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingDoc, setPendingDoc] = useState<string | null>(null)
  const [level3Docs, setLevel3Docs] = useState({ payslip1: false, payslip2: false, payslip3: false, domicile: false, guarantor: false })

  function triggerUpload(key: string) { setPendingDoc(key); fileInputRef.current?.click() }
  function handleFile() { if (pendingDoc) { setLevel3Docs(d => ({ ...d, [pendingDoc]: true })); setPendingDoc(null) } }

  const level3MandatoryDone = [level3Docs.payslip1, level3Docs.payslip2, level3Docs.payslip3, level3Docs.domicile].filter(Boolean).length
  const level3Progress = Math.round((level3MandatoryDone / 4) * 100)

  const certLevel = 1 as const

  // ── Load user data ────────────────────────────────────────
  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)
      setEmail(user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        const loaded = {
          firstName: profile.first_name ?? '',
          lastName: profile.last_name ?? '',
          phone: profile.phone ?? '',
          budgetMax: profile.budget_max?.toString() ?? '',
          searchZone: profile.city ?? '',
        }
        setForm(loaded)
        setDraft(loaded)
        setAvatarUrl(profile.avatar_url ?? null)
        setVisible(profile.is_visible ?? true)
        setLifestyleTags(buildLifestyleTags(profile.schedule, profile.vibe, profile.passions))
      }
      setProfileLoaded(true)
    }
    loadProfile()
  }, [])

  function startEdit() { setDraft(form); setEditing(true) }
  function cancelEdit() { setEditing(false) }

  async function saveEdit() {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({
          first_name: draft.firstName,
          last_name: draft.lastName,
          phone: draft.phone,
          budget_max: parseInt(draft.budgetMax) || null,
          city: draft.searchZone,
          is_visible: visible,
        }).eq('id', user.id)
      }
      setForm(draft)
    } catch {
      setForm(draft)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`

      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (error) throw error

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(publicUrl)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
    } catch {}
    setUploadingAvatar(false)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const displayName = `${form.firstName} ${form.lastName}`.trim() || 'Mon profil'
  const initials = `${(form.firstName[0] ?? '')}${(form.lastName[0] ?? '')}`.toUpperCase()

  return (
    <>
      <Topbar title="Mon profil" />

      {/* Hidden inputs */}
      <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFile} />
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

      <div className="flex-1 overflow-y-auto p-8" style={{ maxWidth: '720px' }}>

        {/* ── Hero ─────────────────────────────────────────── */}
        <div className="rounded-[14px] p-7 border flex items-center gap-5 mb-5" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}>
          {/* Avatar with upload */}
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-[68px] h-[68px] rounded-full object-cover"
              />
            ) : (
              <div
                className="w-[68px] h-[68px] rounded-full flex items-center justify-center text-2xl font-extrabold text-white"
                style={{ background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)' }}
              >
                {profileLoaded ? initials || '👤' : '…'}
              </div>
            )}
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] cursor-pointer"
              style={{ background: '#4ECBA0', color: '#fff' }}
              title="Changer la photo"
            >
              {uploadingAvatar ? '…' : '📷'}
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-[22px] mb-0.5" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
              {profileLoaded ? (displayName || 'Profil incomplet') : '…'}
            </h2>
            <p className="text-[13px] mb-2" style={{ color: '#6B7280' }}>
              {form.searchZone || 'Ville non renseignée'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <CertificationBadge level={certLevel} size="md" />
            </div>
          </div>

          {editing ? (
            <div className="flex flex-col gap-2">
              <button onClick={saveEdit} disabled={saving} className="px-4 py-2 rounded-full text-[13px] font-bold text-white border-none cursor-pointer disabled:opacity-60" style={{ background: '#4ECBA0' }} onMouseEnter={e => !saving && (e.currentTarget.style.background = '#2AA87C')} onMouseLeave={e => !saving && (e.currentTarget.style.background = '#4ECBA0')}>
                {saving ? '…' : '✓ Sauvegarder'}
              </button>
              <OutlineBtn onClick={cancelEdit}>Annuler</OutlineBtn>
            </div>
          ) : (
            <OutlineBtn onClick={startEdit}>✏️ Modifier</OutlineBtn>
          )}
        </div>

        <ProfileCompletion profile={{
          first_name: form.firstName,
          last_name: form.lastName,
          avatar_url: avatarUrl ?? undefined,
          city: form.searchZone,
          budget_max: form.budgetMax ? parseInt(form.budgetMax) : undefined,
          cert_level: certLevel,
        }} />

        {/* ── Ma Certification ─────────────────────────────── */}
        <SectionLabel>Ma certification</SectionLabel>

        {/* Level 1 */}
        <div className="rounded-[14px] p-5 border mb-2.5" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[13.5px] font-bold" style={{ color: '#111827' }}>Niveau 1 — Profil vérifié</span>
            <CertificationBadge level={1} size="md" />
          </div>
          <div className="flex flex-col gap-1.5">
            {[
              { label: 'Email confirmé', done: !!email },
              { label: 'Photo de profil', done: !!avatarUrl },
              { label: 'Profil complété à 80% minimum', done: false },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2 text-[12.5px]">
                <span style={{ color: item.done ? '#4ECBA0' : '#EF4444' }}>{item.done ? '✓' : '✗'}</span>
                <span style={{ color: item.done ? '#6B7280' : '#111827' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Level 2 */}
        <div className="rounded-[14px] p-5 border mb-2.5" style={{ background: '#FFFFFF', borderColor: level2Submitted ? '#3B82F6' : '#E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}>
          <div className="flex justify-between items-center mb-3">
            <div className="text-[13.5px] font-bold" style={{ color: '#111827' }}>Niveau 2 — Identité certifiée</div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={level2Submitted ? { background: '#EFF6FF', color: '#3B82F6', border: '1px solid #BFDBFE' } : { background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
              {level2Submitted ? '⏳ En attente de vérification' : `${level2Progress}% complété`}
            </span>
          </div>
          <div className="h-1.5 rounded-full mb-3 overflow-hidden" style={{ background: '#F3F4F6' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${level2Progress}%`, background: '#3B82F6' }} />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12.5px]">
                <span style={{ color: '#9CA3AF' }}>○</span>
                <span style={{ color: '#111827' }}>Pièce d&apos;identité recto/verso</span>
              </div>
              <button className="text-[11.5px] font-bold px-3 py-1 rounded-full border-none cursor-pointer" style={{ background: '#3B82F6', color: '#fff' }}>Uploader →</button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12.5px]">
                <span style={{ color: '#9CA3AF' }}>○</span>
                <span style={{ color: '#111827' }}>Selfie avec la pièce d&apos;identité</span>
              </div>
              <button className="text-[11.5px] font-bold px-3 py-1 rounded-full border-none cursor-pointer" style={{ background: '#3B82F6', color: '#fff' }}>Uploader →</button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12.5px]">
                <span style={{ color: phoneVerified ? '#4ECBA0' : '#EF4444' }}>{phoneVerified ? '✓' : '✗'}</span>
                <span style={{ color: phoneVerified ? '#6B7280' : '#111827' }}>Vérification téléphone par SMS</span>
              </div>
              {!phoneVerified && (
                <button onClick={() => setShowPhoneModal(true)} className="text-[11.5px] font-bold px-3 py-1 rounded-full border-none cursor-pointer" style={{ background: '#3B82F6', color: '#fff' }}>Vérifier →</button>
              )}
            </div>
          </div>
        </div>

        {/* Level 3 */}
        <div className="rounded-[14px] p-5 border mb-5" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,.06)', opacity: level2Submitted ? 1 : 0.6 }}>
          <div className="flex justify-between items-center mb-3">
            <div className="text-[13.5px] font-bold" style={{ color: '#111827' }}>Niveau 3 — Dossier Gold</div>
            {level2Submitted ? (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>{level3Progress}% complété</span>
            ) : (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#F9FAFB', color: '#9CA3AF', border: '1px solid #E5E7EB' }}>🔒 Niveau 2 requis</span>
            )}
          </div>
          {level2Submitted && (
            <div className="h-1.5 rounded-full mb-3 overflow-hidden" style={{ background: '#F3F4F6' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${level3Progress}%`, background: '#F59E0B' }} />
            </div>
          )}
          <div className="flex flex-col gap-2">
            {[
              { key: 'payslip1', label: 'Fiche de paie #1', done: level3Docs.payslip1 },
              { key: 'payslip2', label: 'Fiche de paie #2', done: level3Docs.payslip2 },
              { key: 'payslip3', label: "Fiche de paie #3 ou avis d'imposition", done: level3Docs.payslip3 },
              { key: 'domicile', label: 'Justificatif de domicile', done: level3Docs.domicile },
              { key: 'guarantor', label: 'Garant (optionnel)', done: level3Docs.guarantor, optional: true },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12.5px]">
                  <span style={{ color: item.done ? '#4ECBA0' : item.optional ? '#D1D5DB' : '#9CA3AF' }}>{item.done ? '✓' : item.optional ? '·' : '○'}</span>
                  <span style={{ color: item.done ? '#6B7280' : '#111827' }}>{item.label}</span>
                </div>
                {!item.done && level2Submitted && (
                  <button onClick={() => triggerUpload(item.key)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full border-[1.5px] cursor-pointer bg-transparent transition-all" style={{ borderColor: '#E5E7EB', color: '#6B7280' }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#F59E0B'; e.currentTarget.style.color = '#D97706' }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280' }}>+ Upload</button>
                )}
                {item.done && <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#ECFDF5', color: '#059669' }}>✓</span>}
              </div>
            ))}
          </div>
          {!level2Submitted && <p className="text-[12px] mt-3" style={{ color: '#9CA3AF' }}>Complétez la certification Identité (Niveau 2) pour déverrouiller ce niveau.</p>}
        </div>

        {/* ── Avis de colocataires ─────────────────────────── */}
        <SectionLabel>Avis de colocataires</SectionLabel>
        <div className="rounded-[14px] p-5 border mb-5" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}>
          <ReviewStars userId={userId} canReview={false} />
        </div>

        {/* ── Informations ─────────────────────────────────── */}
        <SectionLabel>Informations</SectionLabel>
        <div className="rounded-[14px] p-5 border mb-3.5" style={{ background: '#FFFFFF', borderColor: editing ? '#4ECBA0' : '#E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,.06)', transition: 'border-color 0.2s' }}>
          {editing && (
            <div className="text-[11.5px] mb-3 flex items-center gap-1.5" style={{ color: '#4ECBA0' }}>
              ✏️ Mode édition — modifiez vos informations puis sauvegardez
            </div>
          )}
          <div className="flex justify-between items-center py-2 text-[13.5px]" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ color: '#6B7280' }}>Prénom & Nom</span>
            {editing ? (
              <div className="flex gap-1.5">
                <EditInput value={draft.firstName} onChange={v => setDraft(d => ({ ...d, firstName: v }))} />
                <EditInput value={draft.lastName} onChange={v => setDraft(d => ({ ...d, lastName: v }))} />
              </div>
            ) : (
              <span className="font-semibold" style={{ color: '#111827' }}>{form.firstName} {form.lastName}</span>
            )}
          </div>
          <div className="flex justify-between items-center py-2 text-[13.5px]" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ color: '#6B7280' }}>Email</span>
            <span style={{ color: '#374151' }}>{email || '—'}</span>
          </div>
          <div className="flex justify-between items-center py-2 text-[13.5px]" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ color: '#6B7280' }}>Téléphone</span>
            {editing ? (
              <EditInput value={draft.phone} onChange={v => setDraft(d => ({ ...d, phone: v }))} />
            ) : (
              <span style={{ color: '#374151' }}>{form.phone || '—'}</span>
            )}
          </div>
          <div className="flex justify-between items-center py-2 text-[13.5px]" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ color: '#6B7280' }}>Budget max</span>
            {editing ? (
              <EditInput value={draft.budgetMax} onChange={v => setDraft(d => ({ ...d, budgetMax: v }))} type="number" suffix="€/mois" />
            ) : (
              <span className="font-bold" style={{ color: '#4ECBA0' }}>{form.budgetMax ? `${form.budgetMax} €/mois` : '—'}</span>
            )}
          </div>
          <div className="flex justify-between items-center py-2 text-[13.5px]">
            <span style={{ color: '#6B7280' }}>Zone de recherche</span>
            {editing ? (
              <EditInput value={draft.searchZone} onChange={v => setDraft(d => ({ ...d, searchZone: v }))} />
            ) : (
              <span style={{ color: '#374151' }}>{form.searchZone || '—'}</span>
            )}
          </div>
        </div>

        {/* ── Style de vie ─────────────────────────────────── */}
        <SectionLabel>Style de vie</SectionLabel>
        <div className="rounded-[14px] p-5 border mb-3.5" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}>
          <p className="text-[13px] mb-3" style={{ color: '#6B7280' }}>Ces informations alimentent notre algorithme de matching.</p>
          {lifestyleTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-3.5">
              {lifestyleTags.map(tag => (
                <span key={tag} className="text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: '#ECFDF5', color: '#059669' }}>{tag}</span>
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] mb-3.5" style={{ color: '#9CA3AF' }}>Aucune préférence renseignée — complétez votre profil.</p>
          )}
          <Link href="/onboarding">
            <OutlineBtn>Modifier mes préférences</OutlineBtn>
          </Link>
        </div>

        {/* ── Ma situation ─────────────────────────────────── */}
        <SectionLabel>Ma situation</SectionLabel>
        <div className="rounded-[14px] p-5 border mb-3.5" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}>
          <p className="text-[13px] mb-4" style={{ color: '#6B7280' }}>
            Dis-nous où tu en es pour adapter l&apos;interface à ta situation.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => { if (mode === 'gestion') { /* already in recherche when no active lease */ } }}
              className="flex-1 py-3 rounded-[12px] border-[2px] cursor-pointer transition-all text-[13px] font-semibold"
              style={
                mode === 'recherche'
                  ? { background: '#ECFDF5', borderColor: '#4ECBA0', color: '#2AA87C' }
                  : { background: '#F9FAFB', borderColor: '#E5E7EB', color: '#6B7280' }
              }
            >
              🔍 Je cherche une coloc
              {mode === 'recherche' && <div className="text-[10px] mt-0.5" style={{ color: '#4ECBA0' }}>Mode actuel</div>}
            </button>
            <button
              onClick={() => { if (mode === 'recherche') setShowBailModal(true) }}
              className="flex-1 py-3 rounded-[12px] border-[2px] cursor-pointer transition-all text-[13px] font-semibold"
              style={
                mode === 'gestion'
                  ? { background: '#ECFDF5', borderColor: '#4ECBA0', color: '#2AA87C' }
                  : { background: '#F9FAFB', borderColor: '#E5E7EB', color: '#6B7280' }
              }
            >
              🏠 Je suis dans un bail
              {mode === 'gestion' && <div className="text-[10px] mt-0.5" style={{ color: '#4ECBA0' }}>Mode actuel</div>}
            </button>
          </div>
          {mode === 'gestion' && lease && (
            <div className="mt-3 px-3 py-2.5 rounded-[10px] text-[12.5px]" style={{ background: '#F0FDF4', color: '#2AA87C' }}>
              📍 {lease.address}{lease.city ? `, ${lease.city}` : ''} · {lease.monthly_rent} €/mois
            </div>
          )}
        </div>

        {/* ── Paramètres ───────────────────────────────────── */}
        <SectionLabel>Paramètres</SectionLabel>
        <div className="rounded-[14px] p-5 border" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}>
          <div className="flex justify-between items-center py-2 text-[13.5px]" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ color: '#374151' }}>Notifications</span>
            <input type="checkbox" checked={notifs} onChange={e => setNotifs(e.target.checked)} className="w-[17px] h-[17px] cursor-pointer" style={{ accentColor: '#4ECBA0' }} />
          </div>
          <div className="flex justify-between items-center py-2 text-[13.5px]" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ color: '#374151' }}>Profil visible</span>
            <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} className="w-[17px] h-[17px] cursor-pointer" style={{ accentColor: '#4ECBA0' }} />
          </div>
          <div className="flex justify-between items-center py-2 text-[13.5px]">
            <button onClick={handleSignOut} className="font-medium border-none bg-transparent cursor-pointer text-[13.5px] p-0" style={{ color: '#EF4444' }}>
              Déconnexion
            </button>
            <span style={{ color: '#D1D5DB' }}>›</span>
          </div>
        </div>

      </div>

      {showPhoneModal && (
        <PhoneModal
          onClose={() => setShowPhoneModal(false)}
          onVerified={() => { setPhoneVerified(true); setShowPhoneModal(false) }}
        />
      )}

      {showBailModal && (
        <BailModal
          onClose={() => setShowBailModal(false)}
          onCreated={() => { setShowBailModal(false); refreshLease(); router.push('/app/dashboard') }}
        />
      )}
    </>
  )
}
