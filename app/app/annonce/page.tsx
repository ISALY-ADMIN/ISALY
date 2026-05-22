'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'

type BoostOption = 'standard' | 'featured' | 'priority'

const BOOST_OPTIONS: { id: BoostOption; label: string; price: string }[] = [
  { id: 'standard', label: 'Standard', price: 'Gratuit' },
  { id: 'featured', label: 'Mis en avant', price: '9,99€/mois' },
  { id: 'priority', label: 'Prioritaire', price: '24,99€/mois' },
]

interface FormData {
  title: string
  rent: string
  charges: string
  city: string
  neighborhood: string
  surface: string
  rooms: string
  description: string
}

export default function AnnoncePage() {
  const router = useRouter()
  const [boost, setBoost] = useState<BoostOption>('featured')
  // null = empty slot | '' = manually filled | 'https://...' = imported URL
  const [photos, setPhotos] = useState<(string | null)[]>(
    Array(8).fill(null).map((_, i) => i === 0 ? '' : null)
  )

  const [form, setForm] = useState<FormData>({
    title: '', rent: '', charges: '', city: '', neighborhood: '',
    surface: '', rooms: '1', description: '',
  })

  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [importSource, setImportSource] = useState('')

  function set(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleImport() {
    if (!importUrl.trim()) {
      setImportError('Colle une URL avant d\'importer')
      return
    }
    setImporting(true)
    setImportError('')
    setImportSource('')

    try {
      const res = await fetch('/api/import-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      })
      const json = await res.json()

      if (!res.ok) {
        setImportError(json.error || 'Erreur lors de l\'importation')
        return
      }

      setForm(f => ({
        ...f,
        title: json.title || f.title,
        description: json.description || f.description,
        city: json.city || f.city,
        neighborhood: json.neighborhood || f.neighborhood,
        rent: json.rent != null ? String(json.rent) : f.rent,
        charges: json.charges != null ? String(json.charges) : f.charges,
        surface: json.surface != null ? String(json.surface) : f.surface,
        rooms: json.rooms != null ? String(json.rooms) : f.rooms,
      }))
      // Fill photo slots with imported URLs (up to 8)
      if (Array.isArray(json.photos) && json.photos.length > 0) {
        setPhotos(Array(8).fill(null).map((_: null, i: number) => json.photos[i] ?? null))
      }
      setImportSource(json.source_name || 'Web')
    } catch {
      setImportError('Erreur réseau. Vérifie ta connexion.')
    } finally {
      setImporting(false)
    }
  }

  function handlePublish() {
    if (boost !== 'standard') {
      router.push('/app/paiement')
    } else {
      alert('✅ Annonce publiée gratuitement !')
    }
  }

  const inputStyle = { background: '#161616', borderColor: '#2D2D2D', color: '#E5E7EB' }
  const focus = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement & { style: CSSStyleDeclaration }).style.borderColor = '#4ECBA0')
  const blur = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement & { style: CSSStyleDeclaration }).style.borderColor = '#2D2D2D')

  return (
    <>
      <Topbar title="Mon annonce" />
      <div className="flex-1 overflow-y-auto p-8">
        <div style={{ maxWidth: '620px' }}>
          <h1 className="text-[28px] mb-1" style={{ fontFamily: "'DM Serif Display', serif", color: '#F1F5F9' }}>
            Déposer une annonce
          </h1>
          <p className="text-[13.5px] mb-6" style={{ color: '#6B7280' }}>
            Publiez votre annonce et trouvez des colocataires compatibles.
          </p>

          {/* ── Import section ─────────────────────────────────────────── */}
          <div
            className="rounded-[14px] p-5 mb-5 border"
            style={{ background: '#111', borderColor: '#2D2D2D' }}
          >
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

          {/* ── Form ───────────────────────────────────────────────────── */}
          <div className="rounded-[14px] p-7 border" style={{ background: '#1A1A1A', borderColor: '#2D2D2D' }}>
            {importSource && (
              <div
                className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-full mb-4"
                style={{ background: '#0E2B1E', color: '#4ECBA0', border: '1px solid #1a4a33' }}
              >
                Importé depuis {importSource}
              </div>
            )}

            {/* Titre */}
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

            {/* Loyer + Charges */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Loyer mensuel (CC)">
                <input
                  type="number"
                  value={form.rent}
                  onChange={set('rent')}
                  placeholder="850"
                  className="w-full px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13.5px] outline-none transition-colors"
                  style={inputStyle}
                  onFocus={focus}
                  onBlur={blur}
                />
              </Field>
              <Field label="Charges">
                <input
                  type="number"
                  value={form.charges}
                  onChange={set('charges')}
                  placeholder="80"
                  className="w-full px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13.5px] outline-none transition-colors"
                  style={inputStyle}
                  onFocus={focus}
                  onBlur={blur}
                />
              </Field>
            </div>

            {/* Ville + Quartier */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Ville">
                <input
                  value={form.city}
                  onChange={set('city')}
                  placeholder="Paris"
                  className="w-full px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13.5px] outline-none transition-colors"
                  style={inputStyle}
                  onFocus={focus}
                  onBlur={blur}
                />
              </Field>
              <Field label="Quartier">
                <input
                  value={form.neighborhood}
                  onChange={set('neighborhood')}
                  placeholder="Oberkampf"
                  className="w-full px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13.5px] outline-none transition-colors"
                  style={inputStyle}
                  onFocus={focus}
                  onBlur={blur}
                />
              </Field>
            </div>

            {/* Surface + Chambres */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Surface (m²)">
                <input
                  type="number"
                  value={form.surface}
                  onChange={set('surface')}
                  placeholder="75"
                  className="w-full px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13.5px] outline-none transition-colors"
                  style={inputStyle}
                  onFocus={focus}
                  onBlur={blur}
                />
              </Field>
              <Field label="Chambres disponibles">
                <select
                  value={form.rooms}
                  onChange={set('rooms')}
                  className="w-full px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13.5px] outline-none transition-colors cursor-pointer"
                  style={inputStyle}
                  onFocus={focus}
                  onBlur={blur}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </Field>
            </div>

            {/* Description */}
            <Field label="Description">
              <textarea
                rows={4}
                value={form.description}
                onChange={set('description')}
                placeholder="Décris l'appartement, l'ambiance…"
                className="w-full px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13.5px] outline-none transition-colors resize-none"
                style={inputStyle}
                onFocus={focus}
                onBlur={blur}
              />
            </Field>

            {/* Photos */}
            <div className="mb-4">
              <label className="block text-xs font-bold mb-1.5" style={{ color: '#9CA3AF' }}>
                Photos (max 8){photos.filter(Boolean).length > 0 && (
                  <span className="ml-2 font-normal" style={{ color: '#4ECBA0' }}>
                    {photos.filter(Boolean).length} importée{photos.filter(Boolean).length > 1 ? 's' : ''}
                  </span>
                )}
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {photos.map((slot, i) => {
                  const filled = slot !== null
                  const isUrl = slot?.startsWith('http')
                  return (
                    <div
                      key={i}
                      onClick={() => setPhotos(p => p.map((v, j) => j === i ? (v !== null ? null : '') : v))}
                      className="aspect-square border-2 border-dashed rounded-[9px] flex items-center justify-center cursor-pointer text-xl transition-all overflow-hidden relative"
                      style={{
                        borderColor: filled ? '#4ECBA0' : '#2D2D2D',
                        background: filled && !isUrl ? '#0E2B1E' : 'transparent',
                        color: filled ? '#4ECBA0' : '#4B5563',
                      }}
                    >
                      {isUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={slot!}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={e => {
                            // If image fails to load (hotlink protection), show emoji fallback
                            const parent = (e.target as HTMLImageElement).parentElement
                            if (parent) {
                              parent.style.background = '#0E2B1E'
                              ;(e.target as HTMLImageElement).style.display = 'none'
                              parent.innerHTML = '<span style="font-size:20px">📷</span>'
                            }
                          }}
                        />
                      ) : filled ? '📷' : '+'}
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
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 cursor-pointer text-[13px]"
                    style={{ color: '#E5E7EB' }}
                  >
                    <input
                      type="radio"
                      name="boost"
                      checked={boost === opt.id}
                      onChange={() => setBoost(opt.id)}
                      style={{ accentColor: '#4ECBA0' }}
                    />
                    {opt.label} — <span className="font-semibold">{opt.price}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handlePublish}
              className="w-full py-3.5 rounded-full text-[14.5px] font-semibold text-white border-none cursor-pointer transition-colors"
              style={{ background: '#4ECBA0' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2AA87C')}
              onMouseLeave={e => (e.currentTarget.style.background = '#4ECBA0')}
            >
              Publier l'annonce →
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
