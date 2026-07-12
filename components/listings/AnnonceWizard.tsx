'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ArrowLeft, ArrowRight, Check, Upload, Trash2,
  Home as HomeIcon, Building2, Bed, Sparkles, Camera, Star,
  Plus, Minus, MapPin, CheckCircle2, Loader2,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/analytics'

// ─── Types ───────────────────────────────────────────────────
type PropertyType = 'studio' | 't1' | 't2' | 't3' | 't4_plus' | 'maison'

interface AnnonceDraft {
  step: number
  property_type: PropertyType | null
  title: string
  city: string
  surface: string
  rooms_available: string
  occupants_current: string
  capacity_total: string
  rent: string
  charges_incluses: boolean
  depot_garantie: string
  disponible_le: string
  amenities: string[]
  rules: string[]
  house_rules: string
  publish_now: boolean
}

const OUTFIT = "'Outfit', sans-serif"
const DRAFT_KEY = 'isaly_annonce_draft_v1'
const TOTAL_STEPS = 5

const PROPERTY_TYPES: { id: PropertyType; label: string; icon: React.ReactNode }[] = [
  { id: 'studio',   label: 'Studio',  icon: <Bed size={22} strokeWidth={1.8} /> },
  { id: 't1',       label: 'T1',      icon: <HomeIcon size={22} strokeWidth={1.8} /> },
  { id: 't2',       label: 'T2',      icon: <HomeIcon size={22} strokeWidth={1.8} /> },
  { id: 't3',       label: 'T3',      icon: <HomeIcon size={22} strokeWidth={1.8} /> },
  { id: 't4_plus',  label: 'T4+',     icon: <HomeIcon size={22} strokeWidth={1.8} /> },
  { id: 'maison',   label: 'Maison',  icon: <Building2 size={22} strokeWidth={1.8} /> },
]

const AMENITIES = [
  'Meublé', 'Cuisine équipée', 'Lave-linge', 'Sèche-linge', 'Lave-vaisselle',
  'Parking', 'Ascenseur', 'Balcon/Terrasse', 'Cave', 'Fibre internet',
]

const RULES = [
  'Animaux acceptés', 'Non-fumeur', 'Visiteurs bienvenus', 'Instruments de musique OK',
]

const emptyDraft: AnnonceDraft = {
  step: 1,
  property_type: null,
  title: '',
  city: '',
  surface: '',
  rooms_available: '1',
  occupants_current: '0',
  capacity_total: '1',
  rent: '',
  charges_incluses: false,
  depot_garantie: '',
  disponible_le: '',
  amenities: [],
  rules: [],
  house_rules: '',
  publish_now: true,
}

// ─── Uploads Supabase Storage ────────────────────────────────
async function uploadPhotos(files: File[]): Promise<string[]> {
  const supabase = createClient()
  const urls: string[] = []
  for (const file of files) {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `listings/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage
      .from('listings')
      .upload(path, file, { cacheControl: '3600', upsert: false })
    if (!error) {
      const { data } = supabase.storage.from('listings').getPublicUrl(path)
      urls.push(data.publicUrl)
    }
  }
  return urls
}

// ─── Petites briques UI ─────────────────────────────────────
function Stepper({ value, onChange, min = 0, max = 10, disabled }: {
  value: string; onChange: (next: string) => void; min?: number; max?: number; disabled?: boolean
}) {
  const n = Math.max(min, Math.min(max, Number(value) || 0))
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px', padding: '4px', width: 'fit-content',
    }}>
      <button
        type="button"
        onClick={() => onChange(String(Math.max(min, n - 1)))}
        disabled={disabled || n <= min}
        aria-label="Diminuer"
        style={{
          width: 30, height: 30, borderRadius: '8px', border: 'none',
          background: 'transparent', color: 'rgba(255,255,255,0.75)',
          cursor: disabled || n <= min ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Minus size={14} strokeWidth={2.2} />
      </button>
      <input
        type="number" min={min} max={max} value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: 46, textAlign: 'center', background: 'transparent',
          border: 'none', color: '#fff', fontFamily: OUTFIT, fontSize: '15px',
          fontWeight: 700, outline: 'none',
        }}
      />
      <button
        type="button"
        onClick={() => onChange(String(Math.min(max, n + 1)))}
        disabled={disabled || n >= max}
        aria-label="Augmenter"
        style={{
          width: 30, height: 30, borderRadius: '8px', border: 'none',
          background: 'transparent', color: 'rgba(255,255,255,0.75)',
          cursor: disabled || n >= max ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Plus size={14} strokeWidth={2.2} />
      </button>
    </div>
  )
}

function Toggle({ active, onToggle, label }: {
  active: boolean; onToggle: () => void; label: string
}) {
  return (
    <button
      type="button" role="switch" aria-checked={active} aria-label={label}
      onClick={onToggle}
      style={{
        width: 42, height: 24, borderRadius: 12, flexShrink: 0,
        background: active ? '#10B981' : 'rgba(255,255,255,0.12)',
        border: `1px solid ${active ? 'rgba(16,185,129,0.6)' : 'rgba(255,255,255,0.14)'}`,
        padding: 2, cursor: 'pointer',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}
    >
      <span aria-hidden style={{
        display: 'block', width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transform: `translateX(${active ? 18 : 0}px)`,
        transition: 'transform 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
      }} />
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', color: '#fff', fontFamily: OUTFIT,
  fontSize: '14px', outline: 'none', transition: 'border-color 0.15s ease',
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{
        fontFamily: OUTFIT, fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.4px',
        color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase',
      }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.4)' }}>{hint}</span>}
    </div>
  )
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        padding: '8px 14px', borderRadius: '20px', cursor: 'pointer',
        fontFamily: OUTFIT, fontSize: '12.5px', fontWeight: 600,
        background: active ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
        color: active ? '#10B981' : 'rgba(255,255,255,0.7)',
        border: `1px solid ${active ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)'}`,
        transition: 'all 0.15s ease',
        display: 'inline-flex', alignItems: 'center', gap: '6px',
      }}
    >
      {active && <Check size={13} strokeWidth={2.4} />}
      {label}
    </button>
  )
}

// ─── Composant principal ────────────────────────────────────
export default function AnnonceWizard({ open, onClose, onSuccess }: {
  open: boolean
  onClose: () => void
  onSuccess: (listingId: string, mode: 'published' | 'draft') => void
}) {
  const [draft, setDraft] = useState<AnnonceDraft>(emptyDraft)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cityOptions, setCityOptions] = useState<string[]>([])
  const [showCityList, setShowCityList] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // ─── Hydratation du brouillon au premier open ─────────────
  const hydrated = useRef(false)
  useEffect(() => {
    if (!open || hydrated.current) return
    hydrated.current = true
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AnnonceDraft>
        setDraft(d => ({ ...d, ...parsed }))
      }
    } catch {}
  }, [open])

  // Sauvegarde brouillon à chaque changement (hors uploads photo)
  useEffect(() => {
    if (!open) return
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {}
  }, [draft, open])

  // Chargement des villes existantes pour l'autocomplete
  useEffect(() => {
    if (!open) return
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase.from('listings').select('city').not('city', 'is', null).limit(500)
      const uniq = Array.from(new Set(((data ?? []) as { city: string | null }[])
        .map(r => (r.city ?? '').trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, 'fr'))
      setCityOptions(uniq)
    })().catch(() => {})
  }, [open])

  const filteredCities = useMemo(() => {
    const q = draft.city.trim().toLowerCase()
    if (!q) return cityOptions.slice(0, 6)
    return cityOptions.filter(c => c.toLowerCase().includes(q)).slice(0, 6)
  }, [cityOptions, draft.city])

  // Cleanup previews
  useEffect(() => {
    return () => { photoPreviews.forEach(p => { if (p.startsWith('blob:')) URL.revokeObjectURL(p) }) }
  }, [photoPreviews])

  // ─── Photos ────────────────────────────────────────────────
  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    setPhotos(prev => [...prev, ...arr].slice(0, 6))
    setPhotoPreviews(prev => [...prev, ...arr.map(f => URL.createObjectURL(f))].slice(0, 6))
  }
  function removePhoto(index: number) {
    const preview = photoPreviews[index]
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
    setPhotos(p => p.filter((_, i) => i !== index))
    setPhotoPreviews(p => p.filter((_, i) => i !== index))
  }
  function movePhoto(from: number, to: number) {
    if (to < 0 || to >= photos.length) return
    setPhotos(p => { const c = [...p]; const [x] = c.splice(from, 1); c.splice(to, 0, x); return c })
    setPhotoPreviews(p => { const c = [...p]; const [x] = c.splice(from, 1); c.splice(to, 0, x); return c })
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (dropRef.current) dropRef.current.style.borderColor = 'rgba(16,185,129,0.5)'
  }
  function handleDragLeave() {
    if (dropRef.current) dropRef.current.style.borderColor = 'rgba(255,255,255,0.15)'
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (dropRef.current) dropRef.current.style.borderColor = 'rgba(255,255,255,0.15)'
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }

  // ─── Navigation ────────────────────────────────────────────
  const setStep = useCallback((n: number) => {
    setDraft(d => ({ ...d, step: Math.max(1, Math.min(TOTAL_STEPS, n)) }))
    setError(null)
  }, [])

  const canGoNext = (): boolean => {
    switch (draft.step) {
      case 1: return !!draft.property_type && draft.title.trim().length > 0 && draft.city.trim().length > 0
      case 2: {
        const rent = Number(draft.rent)
        const cur = Number(draft.occupants_current)
        const tot = Number(draft.capacity_total)
        return rent > 0 && tot > 0 && cur <= tot
      }
      case 3: return true
      case 4: return photos.length >= 1
      default: return true
    }
  }

  function handleNext() {
    if (!canGoNext()) {
      const msgs: Record<number, string> = {
        1: 'Renseignez le type, le titre et la ville pour continuer.',
        2: "Le loyer et la capacité doivent être valides (actuels ≤ places au total).",
        4: 'Ajoutez au moins une photo pour continuer.',
      }
      setError(msgs[draft.step] ?? 'Complétez les champs obligatoires.')
      return
    }
    setStep(draft.step + 1)
  }

  // ─── Toggles chips ─────────────────────────────────────────
  function toggleAmenity(a: string) {
    setDraft(d => ({
      ...d,
      amenities: d.amenities.includes(a) ? d.amenities.filter(x => x !== a) : [...d.amenities, a],
    }))
  }
  function toggleRule(r: string) {
    setDraft(d => ({
      ...d,
      rules: d.rules.includes(r) ? d.rules.filter(x => x !== r) : [...d.rules, r],
    }))
  }

  // ─── Publication ───────────────────────────────────────────
  async function publish() {
    if (photos.length === 0) { setError('Au moins une photo est obligatoire.'); setStep(4); return }
    setPublishing(true); setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Session expirée — reconnectez-vous.'); setPublishing(false); return }

      const photoUrls = await uploadPhotos(photos)
      if (photoUrls.length === 0) {
        setError("Impossible d'uploader les photos. Vérifiez le bucket 'listings'.")
        setPublishing(false); return
      }

      const meuble = draft.amenities.includes('Meublé')
      const animaux_ok = draft.rules.includes('Animaux acceptés')
      const non_fumeur = draft.rules.includes('Non-fumeur')

      const insertRow = {
        owner_id:          user.id,
        title:             draft.title.trim() || `Colocation à ${draft.city.trim()}`,
        description:       draft.house_rules.trim() || null,
        city:              draft.city.trim(),
        property_type:     draft.property_type,
        rent:              Number(draft.rent) || 0,
        charges:           0,
        charges_incluses:  draft.charges_incluses,
        depot_garantie:    draft.depot_garantie ? Number(draft.depot_garantie) : null,
        disponible_le:     draft.disponible_le || null,
        surface:           Number(draft.surface) || 0,
        rooms_available:   Number(draft.rooms_available) || 1,
        occupants_current: Number(draft.occupants_current) || 0,
        capacity_total:    Number(draft.capacity_total) || 1,
        meuble, animaux_ok, non_fumeur,
        equipements:       draft.amenities.length ? draft.amenities : null,
        photos:            photoUrls,
        boost_type:        'standard',
        boost_level:       'standard',
        boost_tier:        'standard',
        is_active:         draft.publish_now,
      }

      const { data: inserted, error } = await supabase
        .from('listings').insert(insertRow).select('id').single()

      if (error || !inserted) {
        setError('Erreur : ' + (error?.message ?? "impossible de créer l'annonce"))
        setPublishing(false); return
      }

      try { localStorage.removeItem(DRAFT_KEY) } catch {}
      if (draft.publish_now) track.listingPublished(draft.city)
      onSuccess(inserted.id, draft.publish_now ? 'published' : 'draft')
      resetAll()
    } catch (e: unknown) {
      setError('Erreur inattendue : ' + (e instanceof Error ? e.message : 'inconnue'))
    } finally {
      setPublishing(false)
    }
  }

  function resetAll() {
    setDraft(emptyDraft)
    photoPreviews.forEach(p => { if (p.startsWith('blob:')) URL.revokeObjectURL(p) })
    setPhotos([])
    setPhotoPreviews([])
    setError(null)
    hydrated.current = false
  }

  function handleClose() {
    if (publishing) return
    onClose()
  }

  // ─── Rendu ─────────────────────────────────────────────────
  const stepTitle: Record<number, { title: string; subtitle: string; icon: React.ReactNode }> = {
    1: { title: 'Type & titre',        subtitle: 'Quelques infos pour identifier votre annonce', icon: <HomeIcon size={16} strokeWidth={2} /> },
    2: { title: 'Caractéristiques',    subtitle: 'Loyer, surface et capacité de la colocation',   icon: <Bed size={16} strokeWidth={2} /> },
    3: { title: 'Équipements & règles', subtitle: 'Ce qui rend votre coloc unique',              icon: <Sparkles size={16} strokeWidth={2} /> },
    4: { title: 'Photos',              subtitle: 'Ajoutez de belles photos (max 6)',              icon: <Camera size={16} strokeWidth={2} /> },
    5: { title: 'Publication',         subtitle: 'Vérifiez et publiez votre annonce',             icon: <Star size={16} strokeWidth={2} /> },
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '720px', maxHeight: 'calc(100vh - 48px)',
              background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '24px', boxShadow: '0 32px 96px rgba(0,0,0,0.6)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              fontFamily: OUTFIT,
            }}
          >
            {/* ── Header ── */}
            <div style={{
              padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', flexDirection: 'column', gap: '14px', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
                  background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.3)',
                  color: '#10B981',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{stepTitle[draft.step].icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#10B981', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    Étape {draft.step} / {TOTAL_STEPS}
                  </div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: '2px 0 2px' }}>
                    {stepTitle[draft.step].title}
                  </h2>
                  <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)' }}>
                    {stepTitle[draft.step].subtitle}
                  </div>
                </div>
                <button
                  type="button" onClick={handleClose} aria-label="Fermer"
                  disabled={publishing}
                  style={{
                    width: 32, height: 32, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.65)',
                    cursor: publishing ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={15} strokeWidth={2} />
                </button>
              </div>

              {/* Progress bar */}
              <div style={{ display: 'flex', gap: '5px' }}>
                {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: '2px',
                    background: i + 1 <= draft.step
                      ? 'linear-gradient(90deg, #10B981, #059669)'
                      : 'rgba(255,255,255,0.08)',
                    transition: 'background 0.3s ease',
                  }} />
                ))}
              </div>
            </div>

            {/* ── Body ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={draft.step}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.2 }}
                >
                  {draft.step === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                      <Field label="Type de bien">
                        <div style={{
                          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: '8px',
                        }}>
                          {PROPERTY_TYPES.map(pt => {
                            const active = draft.property_type === pt.id
                            return (
                              <button
                                key={pt.id} type="button"
                                onClick={() => setDraft(d => ({ ...d, property_type: pt.id }))}
                                style={{
                                  padding: '14px 8px', borderRadius: '14px',
                                  background: active ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                                  border: `1px solid ${active ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                  color: active ? '#10B981' : 'rgba(255,255,255,0.75)',
                                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                                  alignItems: 'center', gap: '6px',
                                  fontFamily: OUTFIT, fontSize: '12.5px', fontWeight: 700,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {pt.icon}
                                {pt.label}
                              </button>
                            )
                          })}
                        </div>
                      </Field>

                      <Field label="Titre de l'annonce" hint={`${draft.title.length}/80`}>
                        <input
                          type="text" maxLength={80} value={draft.title}
                          onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                          placeholder="Ex: Beau T2 lumineux avec balcon"
                          style={inputStyle}
                          onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.4)')}
                          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                        />
                      </Field>

                      <Field label="Ville">
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text" value={draft.city}
                            onChange={e => setDraft(d => ({ ...d, city: e.target.value }))}
                            onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.4)'; setShowCityList(true) }}
                            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; setTimeout(() => setShowCityList(false), 150) }}
                            placeholder="Ex: Lyon"
                            style={{ ...inputStyle, paddingLeft: '38px' }}
                          />
                          <MapPin size={15} strokeWidth={1.8} style={{
                            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                            color: 'rgba(255,255,255,0.5)',
                          }} />
                          {showCityList && filteredCities.length > 0 && (
                            <div style={{
                              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 5,
                              background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                              overflow: 'hidden', maxHeight: '200px', overflowY: 'auto',
                              boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                            }}>
                              {filteredCities.map(c => (
                                <button
                                  key={c} type="button"
                                  onMouseDown={e => e.preventDefault()}
                                  onClick={() => { setDraft(d => ({ ...d, city: c })); setShowCityList(false) }}
                                  style={{
                                    display: 'block', width: '100%', textAlign: 'left',
                                    padding: '10px 14px', background: 'transparent', border: 'none',
                                    color: 'rgba(255,255,255,0.85)', fontSize: '13.5px',
                                    fontFamily: OUTFIT, cursor: 'pointer',
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.08)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >{c}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </Field>
                    </div>
                  )}

                  {draft.step === 2 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Field label="Surface (m²)">
                          <input
                            type="number" min={0} value={draft.surface}
                            onChange={e => setDraft(d => ({ ...d, surface: e.target.value }))}
                            placeholder="42" style={inputStyle}
                            onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.4)')}
                            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                          />
                        </Field>
                        <Field label="Chambres">
                          <Stepper
                            value={draft.rooms_available} min={1} max={10}
                            onChange={v => setDraft(d => ({ ...d, rooms_available: v }))}
                          />
                        </Field>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Field label="Déjà sur place">
                          <Stepper
                            value={draft.occupants_current} min={0} max={10}
                            onChange={v => setDraft(d => ({ ...d, occupants_current: v }))}
                          />
                        </Field>
                        <Field label="Places au total" hint={
                          Number(draft.occupants_current) > Number(draft.capacity_total)
                            ? 'Actuels doit être ≤ total' : undefined
                        }>
                          <Stepper
                            value={draft.capacity_total} min={1} max={10}
                            onChange={v => setDraft(d => ({ ...d, capacity_total: v }))}
                          />
                        </Field>
                      </div>

                      <Field label="Loyer mensuel (€)">
                        <input
                          type="number" min={0} value={draft.rent}
                          onChange={e => setDraft(d => ({ ...d, rent: e.target.value }))}
                          placeholder="650" style={inputStyle}
                          onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.4)')}
                          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                        />
                      </Field>

                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px', borderRadius: '12px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                      }}>
                        <div>
                          <div style={{ fontFamily: OUTFIT, fontSize: '13.5px', fontWeight: 700, color: '#fff' }}>
                            Charges incluses
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)' }}>
                            Le loyer indiqué comprend eau, électricité, internet…
                          </div>
                        </div>
                        <Toggle
                          active={draft.charges_incluses}
                          onToggle={() => setDraft(d => ({ ...d, charges_incluses: !d.charges_incluses }))}
                          label="Charges incluses"
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <Field label="Dépôt de garantie (€)" hint="Optionnel">
                          <input
                            type="number" min={0} value={draft.depot_garantie}
                            onChange={e => setDraft(d => ({ ...d, depot_garantie: e.target.value }))}
                            placeholder="650" style={inputStyle}
                            onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.4)')}
                            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                          />
                        </Field>
                        <Field label="Disponible à partir du">
                          <input
                            type="date" value={draft.disponible_le}
                            onChange={e => setDraft(d => ({ ...d, disponible_le: e.target.value }))}
                            style={inputStyle}
                            onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.4)')}
                            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                          />
                        </Field>
                      </div>
                    </div>
                  )}

                  {draft.step === 3 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                      <Field label="Équipements">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {AMENITIES.map(a => (
                            <Chip key={a} label={a} active={draft.amenities.includes(a)} onClick={() => toggleAmenity(a)} />
                          ))}
                        </div>
                      </Field>

                      <Field label="Règles de vie">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {RULES.map(r => (
                            <Chip key={r} label={r} active={draft.rules.includes(r)} onClick={() => toggleRule(r)} />
                          ))}
                        </div>
                      </Field>

                      <Field label="Règles de la maison" hint="Optionnel — apparaîtra sur l'annonce">
                        <textarea
                          rows={4} value={draft.house_rules}
                          onChange={e => setDraft(d => ({ ...d, house_rules: e.target.value }))}
                          placeholder="Ex: Pas de bruit après 22h, cuisine à nettoyer après usage…"
                          style={{ ...inputStyle, resize: 'vertical', fontFamily: OUTFIT }}
                          onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.4)')}
                          onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                        />
                      </Field>
                    </div>
                  )}

                  {draft.step === 4 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      <div
                        ref={dropRef}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        role="button" tabIndex={0}
                        style={{
                          padding: '36px 20px', borderRadius: '16px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '2px dashed rgba(255,255,255,0.15)',
                          textAlign: 'center', cursor: 'pointer',
                          transition: 'border-color 0.15s ease',
                        }}
                      >
                        <div style={{
                          width: 56, height: 56, borderRadius: '16px', margin: '0 auto 12px',
                          background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                          color: '#10B981',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Upload size={22} strokeWidth={1.8} />
                        </div>
                        <div style={{ fontFamily: OUTFIT, fontSize: '14.5px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                          Glissez-déposez ou cliquez pour ajouter
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)' }}>
                          JPG, PNG · Jusqu&apos;à 6 photos · La première sera la photo principale
                        </div>
                        <input
                          ref={fileInputRef}
                          type="file" accept="image/*" multiple
                          style={{ display: 'none' }}
                          onChange={e => e.target.files && addFiles(e.target.files)}
                        />
                      </div>

                      {photoPreviews.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                          {photoPreviews.map((src, i) => (
                            <div key={i} style={{
                              position: 'relative', aspectRatio: '1 / 1', borderRadius: '12px',
                              overflow: 'hidden', border: `1px solid ${i === 0 ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)'}`,
                            }}>
                              <Image src={src} alt={`Photo ${i + 1}`} fill sizes="200px" style={{ objectFit: 'cover' }} unoptimized />
                              {i === 0 && (
                                <span style={{
                                  position: 'absolute', top: 6, left: 6,
                                  fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '20px',
                                  background: 'rgba(16,185,129,0.9)', color: '#fff', letterSpacing: '0.4px',
                                }}>PRINCIPALE</span>
                              )}
                              <div style={{
                                position: 'absolute', bottom: 6, left: 6, right: 6,
                                display: 'flex', justifyContent: 'space-between', gap: '4px',
                              }}>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    type="button" onClick={() => movePhoto(i, i - 1)} disabled={i === 0}
                                    aria-label="Reculer" style={miniBtn(i === 0)}
                                  ><ArrowLeft size={11} strokeWidth={2.2} /></button>
                                  <button
                                    type="button" onClick={() => movePhoto(i, i + 1)} disabled={i === photos.length - 1}
                                    aria-label="Avancer" style={miniBtn(i === photos.length - 1)}
                                  ><ArrowRight size={11} strokeWidth={2.2} /></button>
                                </div>
                                <button
                                  type="button" onClick={() => removePhoto(i)}
                                  aria-label="Supprimer la photo"
                                  style={{ ...miniBtn(false), background: 'rgba(239,68,68,0.85)' }}
                                >
                                  <Trash2 size={11} strokeWidth={2.2} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: photos.length ? '#10B981' : 'rgba(255,255,255,0.4)' }}>
                        {photos.length}/6 photo{photos.length > 1 ? 's' : ''} — {photos.length >= 1 ? 'OK pour publier' : 'au moins 1 obligatoire'}
                      </div>
                    </div>
                  )}

                  {draft.step === 5 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      <div style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '16px', padding: '18px 20px',
                        display: 'flex', flexDirection: 'column', gap: '10px',
                      }}>
                        {photoPreviews[0] && (
                          <div style={{
                            width: '100%', aspectRatio: '16 / 9', borderRadius: '12px', overflow: 'hidden',
                            position: 'relative', background: 'rgba(16,185,129,0.08)',
                          }}>
                            <Image src={photoPreviews[0]} alt="Photo principale" fill sizes="600px" style={{ objectFit: 'cover' }} unoptimized />
                          </div>
                        )}
                        <div style={{ fontFamily: OUTFIT, fontSize: '17px', fontWeight: 700, color: '#fff' }}>
                          {draft.title || `Colocation à ${draft.city}`}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12.5px', color: 'rgba(255,255,255,0.6)' }}>
                          <span><MapPin size={12} strokeWidth={1.8} style={{ display: 'inline', marginRight: 4 }} />{draft.city}</span>
                          {draft.property_type && <span>· {PROPERTY_TYPES.find(p => p.id === draft.property_type)?.label}</span>}
                          {draft.surface && <span>· {draft.surface} m²</span>}
                          <span>· {draft.occupants_current}/{draft.capacity_total} places</span>
                        </div>
                        <div style={{ fontFamily: OUTFIT, fontSize: '20px', fontWeight: 800, color: '#10B981' }}>
                          {draft.rent || 0} €<span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginLeft: 3 }}>/mois {draft.charges_incluses ? 'CC' : 'HC'}</span>
                        </div>
                        {(draft.amenities.length + draft.rules.length) > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                            {[...draft.amenities, ...draft.rules].map(t => (
                              <span key={t} style={{
                                fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px',
                                background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)',
                              }}>{t}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px', borderRadius: '12px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                      }}>
                        <div>
                          <div style={{ fontFamily: OUTFIT, fontSize: '13.5px', fontWeight: 700, color: '#fff' }}>
                            {draft.publish_now ? 'Publier immédiatement' : 'Enregistrer en brouillon'}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.5)' }}>
                            {draft.publish_now
                              ? "L'annonce sera visible dans la recherche et le swipe."
                              : "L'annonce reste masquée jusqu'à activation."}
                          </div>
                        </div>
                        <Toggle
                          active={draft.publish_now}
                          onToggle={() => setDraft(d => ({ ...d, publish_now: !d.publish_now }))}
                          label="Publier immédiatement"
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {error && (
                <div style={{
                  marginTop: '18px', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', borderRadius: '10px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#F87171', fontSize: '13px',
                }}>
                  <X size={14} strokeWidth={2.2} />
                  {error}
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
              flexShrink: 0,
            }}>
              <Button
                variant="ghost" size="md"
                onClick={() => draft.step > 1 ? setStep(draft.step - 1) : handleClose()}
                disabled={publishing}
              >
                <ArrowLeft size={14} strokeWidth={2} />
                {draft.step > 1 ? 'Précédent' : 'Annuler'}
              </Button>
              {draft.step < TOTAL_STEPS ? (
                <Button variant="primary" size="md" onClick={handleNext}>
                  Suivant
                  <ArrowRight size={14} strokeWidth={2} />
                </Button>
              ) : (
                <Button variant="primary" size="md" onClick={publish} loading={publishing} disabled={publishing}>
                  {publishing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Publication…
                    </>
                  ) : draft.publish_now ? (
                    <>
                      <CheckCircle2 size={14} strokeWidth={2} />
                      Publier l&apos;annonce
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} strokeWidth={2} />
                      Enregistrer le brouillon
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function miniBtn(disabled: boolean): React.CSSProperties {
  return {
    width: 24, height: 24, borderRadius: '6px',
    border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(4px)',
  }
}
