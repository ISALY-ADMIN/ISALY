'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'

type BoostOption = 'standard' | 'featured' | 'priority'

const BOOST_OPTIONS: { id: BoostOption; label: string; price: string }[] = [
  { id: 'standard', label: 'Standard',      price: 'Gratuit' },
  { id: 'featured', label: 'Mis en avant',  price: '9,99€/mois' },
  { id: 'priority', label: 'Prioritaire',   price: '24,99€/mois' },
]

interface FormData {
  title: string
  rent: string
  charges: string
  city: string
  neighborhood: string
  surface: string
  rooms_available: string
  description: string
}

async function uploadPhotosToStorage(files: File[]): Promise<string[]> {
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

export default function AnnoncePage() {
  const router = useRouter()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [boost, setBoost]                   = useState<BoostOption>('featured')
  const [photos, setPhotos]                 = useState<(File | string)[]>([])
  const [photoPreviews, setPhotoPreviews]   = useState<string[]>([])
  const [publishing, setPublishing]         = useState(false)
  const [published, setPublished]           = useState(false)

  const [form, setForm] = useState<FormData>({
    title: '', rent: '', charges: '', city: '', neighborhood: '',
    surface: '', rooms_available: '1', description: '',
  })

  const [importUrl, setImportUrl]       = useState('')
  const [importing, setImporting]       = useState(false)
  const [importError, setImportError]   = useState('')
  const [importSource, setImportSource] = useState('')

  function set(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function handleSlotClick(i: number) {
    if (photoPreviews[i]) {
      if (photoPreviews[i].startsWith('blob:')) URL.revokeObjectURL(photoPreviews[i])
      setPhotoPreviews(p => p.filter((_, idx) => idx !== i))
      setPhotos(p => p.filter((_, idx) => idx !== i))
    } else {
      fileInputRef.current?.click()
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setPhotos(prev => [...prev, ...files].slice(0, 8))
    setPhotoPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))].slice(0, 8))
    e.target.value = ''
  }

  async function handleImport() {
    if (!importUrl.trim()) { setImportError('Colle une URL avant d\'importer'); return }
    setImporting(true); setImportError(''); setImportSource('')
    try {
      const res  = await fetch('/api/import-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      })
      const json = await res.json()
      if (!res.ok) { setImportError(json.error || 'Erreur lors de l\'importation'); return }
      setForm(f => ({
        ...f,
        title:        json.title        || f.title,
        description:  json.description  || f.description,
        city:         json.city         || f.city,
        neighborhood: json.neighborhood || f.neighborhood,
        rent:         json.rent  != null ? String(json.rent)    : f.rent,
        charges:      json.charges != null ? String(json.charges) : f.charges,
        surface:      json.surface != null ? String(json.surface) : f.surface,
        rooms_available: json.rooms != null ? String(json.rooms) : f.rooms_available,
      }))
      if (Array.isArray(json.photos) && json.photos.length > 0) {
        const importedUrls: string[] = json.photos.slice(0, 8)
        setPhotos(importedUrls)
        setPhotoPreviews(importedUrls)
      }
      setImportSource(json.source_name || 'Web')
    } catch {
      setImportError('Erreur réseau. Vérifie ta connexion.')
    } finally {
      setImporting(false)
    }
  }

  async function handlePublish() {
    if (!form.title.trim() || !form.rent || !form.city.trim()) {
      alert('Titre, loyer et ville sont obligatoires.')
      return
    }
    setPublishing(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Tu dois être connecté pour publier une annonce.')
        router.push('/auth/login')
        return
      }

      const filePhotos = photos.filter((p): p is File => p instanceof File)
      const importedUrls = photos.filter((p): p is string => typeof p === 'string')
      const uploadedUrls = await uploadPhotosToStorage(filePhotos)
      const photoUrls = [...uploadedUrls, ...importedUrls]

      const { error } = await supabase.from('listings').insert({
        owner_id:        user.id,
        title:           form.title || `Colocation à ${form.city}`,
        description:     form.description,
        city:            form.city,
        neighborhood:    form.neighborhood,
        rent:            Number(form.rent) || 0,
        charges:         Number(form.charges) || 0,
        surface:         Number(form.surface) || 0,
        rooms_available: Number(form.rooms_available) || 1,
        photos:          photoUrls,
        boost_type:      boost,
        boost_level:     boost,
        is_active:       true,
      })

      if (error) {
        console.error('Erreur insertion listing:', error)
        alert('Erreur: ' + error.message)
        return
      }

      router.push('/app/mes-annonces')
    } catch (err) {
      console.error('Erreur publication:', err)
      alert('Erreur inattendue lors de la publication.')
    } finally {
      setPublishing(false)
    }
  }

  const inputStyle = { background: '#161616', borderColor: '#2D2D2D', color: '#E5E7EB' }
  const focus = (e: React.FocusEvent<HTMLElement>) =>
    ((e.target as HTMLElement & { style: CSSStyleDeclaration }).style.borderColor = '#4ECBA0')
  const blur = (e: React.FocusEvent<HTMLElement>) =>
    ((e.target as HTMLElement & { style: CSSStyleDeclaration }).style.borderColor = '#2D2D2D')

  if (published) {
    return (
      <>
        <Topbar title="Mon annonce" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center" style={{ maxWidth: '400px' }}>
            <div className="text-6xl mb-4">✅</div>
            <h2
              className="text-[26px] mb-2"
              style={{ fontFamily: "'DM Serif Display', serif", color: '#fff' }}
            >
              Annonce publiée !
            </h2>
            <p className="text-[14px] mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Elle est maintenant visible par tous les utilisateurs sur ISALY.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => router.push('/app/recherche')}
                className="w-full py-3 rounded-full text-sm font-semibold text-white border-none cursor-pointer bg-mint hover:bg-mint-dark transition-colors"
              >
                Explorer les profils →
              </button>
              <button
                onClick={() => {
                  setPublished(false)
                  setForm({ title: '', rent: '', charges: '', city: '', neighborhood: '', surface: '', rooms_available: '1', description: '' })
                  setPhotoPreviews([])
                  setPhotos([])
                }}
                className="w-full py-3 rounded-full text-sm font-semibold border border-gray-200 text-gray-500 cursor-pointer hover:border-mint hover:text-mint transition-colors bg-transparent"
              >
                Publier une autre annonce
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar title="Mon annonce" />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handlePhotoChange}
      />

      <div className="flex-1 overflow-y-auto p-8">
        <div style={{ maxWidth: '620px' }}>
          <h1 className="text-[28px] mb-1" style={{ fontFamily: "'DM Serif Display', serif", color: '#F1F5F9' }}>
            Déposer une annonce
          </h1>
          <p className="text-[13.5px] mb-6" style={{ color: '#6B7280' }}>
            Publiez votre annonce et trouvez des colocataires compatibles.
          </p>

          {/* ── Import section ──────────────────────────────────── */}
          <div className="rounded-[14px] p-5 mb-5 border" style={{ background: '#111', borderColor: '#2D2D2D' }}>
            <div className="text-[13.5px] font-bold mb-1" style={{ color: '#E5E7EB' }}>
              📎 Importer depuis une annonce existante
            </div>
            {importSource && (
              <div
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full mb-3"
                style={{ background: '#0E2B1E', color: '#4ECBA0' }}
              >
                ✓ Annonce importée depuis {importSource}
              </div>
            )}
            <div className="flex gap-2 mt-2.5">
              <input
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleImport()}
                placeholder="Colle l'URL de ton annonce SeLoger, Leboncoin, PAP…"
                className="flex-1 px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13px] outline-none transition-colors"
                style={inputStyle}
                onFocus={focus}
                onBlur={blur}
              />
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2.5 rounded-[9px] text-[13px] font-semibold text-white border-none cursor-pointer transition-colors disabled:opacity-60 whitespace-nowrap"
                style={{ background: '#4ECBA0' }}
                onMouseEnter={e => !importing && (e.currentTarget.style.background = '#2AA87C')}
                onMouseLeave={e => (e.currentTarget.style.background = '#4ECBA0')}
              >
                {importing ? '…' : 'Importer'}
              </button>
            </div>
            {importError ? (
              <p className="text-[11.5px] mt-1.5" style={{ color: '#EF4444' }}>{importError}</p>
            ) : (
              <p className="text-[11.5px] mt-1.5" style={{ color: '#4B5563' }}>
                Les informations publiques de l'annonce seront importées automatiquement
              </p>
            )}
          </div>

          {/* ── Form ────────────────────────────────────────────── */}
          <div className="rounded-[14px] p-7 border" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
            {importSource && (
              <div
                className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-full mb-4"
                style={{ background: '#0E2B1E', color: '#4ECBA0', border: '1px solid #1a4a33' }}
              >
                Importé depuis {importSource}
              </div>
            )}

            <Field label="Titre de l'annonce">
              <input
                value={form.title}
                onChange={set('title')}
                className="w-full px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13.5px] outline-none transition-colors"
                placeholder="Ex: Chambre dans appart 3P Oberkampf"
                style={inputStyle}
                onFocus={focus}
                onBlur={blur}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Loyer mensuel (CC)">
                <input type="number" value={form.rent} onChange={set('rent')} placeholder="850"
                  className="w-full px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13.5px] outline-none transition-colors"
                  style={inputStyle} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Charges">
                <input type="number" value={form.charges} onChange={set('charges')} placeholder="80"
                  className="w-full px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13.5px] outline-none transition-colors"
                  style={inputStyle} onFocus={focus} onBlur={blur} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Ville">
                <input value={form.city} onChange={set('city')} placeholder="Paris"
                  className="w-full px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13.5px] outline-none transition-colors"
                  style={inputStyle} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Quartier">
                <input value={form.neighborhood} onChange={set('neighborhood')} placeholder="Oberkampf"
                  className="w-full px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13.5px] outline-none transition-colors"
                  style={inputStyle} onFocus={focus} onBlur={blur} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Surface (m²)">
                <input type="number" value={form.surface} onChange={set('surface')} placeholder="75"
                  className="w-full px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13.5px] outline-none transition-colors"
                  style={inputStyle} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Chambres disponibles">
                <select value={form.rooms_available} onChange={set('rooms_available')}
                  className="w-full px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13.5px] outline-none transition-colors cursor-pointer"
                  style={inputStyle} onFocus={focus} onBlur={blur}>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </Field>
            </div>

            <Field label="Description">
              <textarea rows={4} value={form.description} onChange={set('description')}
                placeholder="Décris l'appartement, l'ambiance…"
                className="w-full px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13.5px] outline-none transition-colors resize-none"
                style={inputStyle} onFocus={focus} onBlur={blur} />
            </Field>

            {/* Photos */}
            <div className="mb-4">
              <label className="block text-xs font-bold mb-1.5" style={{ color: '#9CA3AF' }}>
                Photos (max 8)
                {photoPreviews.length > 0 && (
                  <span className="ml-2 font-normal" style={{ color: '#4ECBA0' }}>
                    {photoPreviews.length} ajoutée{photoPreviews.length > 1 ? 's' : ''}
                  </span>
                )}
                <span className="ml-2 font-normal" style={{ color: '#6B7280' }}>
                  — Clique sur un slot vide pour ajouter
                </span>
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {Array(8).fill(null).map((_, i) => {
                  const preview = photoPreviews[i] ?? null
                  return (
                    <div
                      key={i}
                      onClick={() => handleSlotClick(i)}
                      className="aspect-square border-2 border-dashed rounded-[9px] flex items-center justify-center cursor-pointer text-xl transition-all overflow-hidden relative"
                      style={{
                        borderColor: preview ? '#4ECBA0' : '#2D2D2D',
                        background: 'transparent',
                        color: preview ? '#4ECBA0' : '#4B5563',
                      }}
                      title={preview ? 'Cliquer pour supprimer' : 'Cliquer pour ajouter une photo'}
                    >
                      {preview ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={preview}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={e => {
                              const parent = (e.target as HTMLImageElement).parentElement
                              if (parent) {
                                parent.style.background = '#0E2B1E'
                                ;(e.target as HTMLImageElement).style.display = 'none'
                                const span = document.createElement('span')
                                span.style.fontSize = '20px'
                                span.textContent = '📷'
                                parent.appendChild(span)
                              }
                            }}
                          />
                          <div
                            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                            style={{ background: 'rgba(0,0,0,0.5)', fontSize: '20px' }}
                          >
                            ✕
                          </div>
                        </>
                      ) : (
                        <span style={{ fontSize: '22px', color: '#4B5563' }}>+</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Boost */}
            <div className="rounded-[9px] p-4 mb-4" style={{ background: '#0E2B1E' }}>
              <div className="font-extrabold text-[13.5px] mb-1.5" style={{ color: '#4ECBA0' }}>
                🚀 Booster l'annonce
              </div>
              <div className="flex flex-col gap-2 mt-2">
                {BOOST_OPTIONS.map(opt => (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer text-[13px]" style={{ color: '#E5E7EB' }}>
                    <input type="radio" name="boost" checked={boost === opt.id} onChange={() => setBoost(opt.id)} style={{ accentColor: '#4ECBA0' }} />
                    {opt.label} — <span className="font-semibold">{opt.price}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="w-full py-3.5 rounded-full text-[14.5px] font-semibold text-white border-none cursor-pointer transition-colors disabled:opacity-60"
              style={{ background: '#4ECBA0' }}
              onMouseEnter={e => !publishing && (e.currentTarget.style.background = '#2AA87C')}
              onMouseLeave={e => (e.currentTarget.style.background = '#4ECBA0')}
            >
              {publishing ? 'Publication en cours…' : "Publier l'annonce →"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold mb-1.5" style={{ color: '#9CA3AF' }}>{label}</label>
      {children}
    </div>
  )
}
