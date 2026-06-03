'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────
interface Listing {
  id: string
  title: string
  city: string
  neighborhood: string
  rent: number
  surface: number
  rooms_available: number
  photos: string[]
  owner_id: string
  description: string
  created_at: string
  boost_type: string
}

// ── Filter state ──────────────────────────────────────────────
const DEFAULTS = {
  budget_min: 0,
  budget_max: 3000,
  city: '',
  surface_min: 0,
  rooms: 0,
  sort: 'recent',
  date_before: '',
  boost_type: '',
}
type Filters = typeof DEFAULTS

const PAGE_SIZE = 9

// ── Listing card ──────────────────────────────────────────────
function ListingCard({ listing }: { listing: Listing }) {
  const router = useRouter()
  return (
    <div
      className="rounded-[16px] overflow-hidden flex flex-col"
      style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', boxShadow: 'none' }}
    >
      <div
        style={{
          height: '140px',
          flexShrink: 0,
          position: 'relative',
          background: 'linear-gradient(135deg, #6EE7B7, #047857)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '40px',
        }}
      >
        {listing.photos?.[0] ? (
          <img
            src={listing.photos[0]}
            alt={listing.title}
            onError={(e) => { e.currentTarget.style.display = 'none' }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : '🏠'}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-1">
          <span className="text-[14px] font-bold" style={{ color: '#ffffff' }}>
            {listing.title || `Colocation à ${listing.city}`}
          </span>
          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 ml-1" style={{ background: 'rgba(16,185,129,0.15)', color: '#059669' }}>
            🏠 Annonce
          </span>
        </div>
        <div className="text-[12px] mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
          📍 {listing.city}{listing.neighborhood ? ` · ${listing.neighborhood}` : ''}
        </div>
        <div className="text-[15px] font-bold mb-2" style={{ color: '#10B981' }}>
          {listing.rent}€<span className="text-[11px] font-normal" style={{ color: 'rgba(255,255,255,0.35)' }}>/mois</span>
          {listing.rooms_available > 0 && (
            <span className="text-[11px] font-normal ml-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              · {listing.rooms_available} chambre{listing.rooms_available > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {listing.description && (
          <p className="text-[12px] mb-3" style={{ color: 'rgba(255,255,255,0.35)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {listing.description}
          </p>
        )}
        <div className="flex gap-2 mt-auto">
          <button
            onClick={() => router.push(`/app/messages?owner=${listing.owner_id}`)}
            className="flex-1 py-2 rounded-full text-[12px] font-bold text-white border-none cursor-pointer transition-colors"
            style={{ background: '#10B981' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#059669')}
            onMouseLeave={e => (e.currentTarget.style.background = '#10B981')}
          >
            💬 Contacter
          </button>
          <button
            className="flex-1 py-2 rounded-full text-[12px] font-semibold border-[1.5px] cursor-pointer bg-transparent transition-all"
            style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#374151' }}
          >
            👁️ Voir
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────
export default function RecherchePage() {
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery]             = useState('')
  const [filters, setFilters]         = useState<Filters>(DEFAULTS)
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage]               = useState(1)
  const [allListings, setAllListings] = useState<Listing[]>([])
  const [loadingListings, setLoadingListings] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchListings() {
      setLoadingListings(true)
      const supabase = createClient()
      let q = supabase
        .from('listings')
        .select('id, title, city, neighborhood, rent, surface, rooms_available, photos, owner_id, description, created_at, boost_type')
        .eq('is_active', true)

      if (filters.budget_max < 3000) q = q.lte('rent', filters.budget_max)
      if (filters.budget_min > 0)    q = q.gte('rent', filters.budget_min)
      if (filters.city)              q = q.ilike('city', `%${filters.city}%`)
      if (filters.surface_min > 0)   q = q.gte('surface', filters.surface_min)
      if (filters.rooms > 0)         q = q.gte('rooms_available', filters.rooms)
      if (filters.boost_type)        q = q.eq('boost_type', filters.boost_type)

      if (filters.sort === 'price_asc')  q = q.order('rent', { ascending: true })
      else if (filters.sort === 'price_desc') q = q.order('rent', { ascending: false })
      else if (filters.sort === 'surface')    q = q.order('surface', { ascending: false })
      else                                    q = q.order('created_at', { ascending: false })

      const { data } = await q
      if (data) setAllListings(data)
      setLoadingListings(false)
    }
    fetchListings()
  }, [filters])

  function resetAll() {
    setFilters(DEFAULTS)
    setQuery('')
    setSearchInput('')
    setPage(1)
  }

  function runSearch() {
    setQuery(searchInput.trim())
    setPage(1)
  }

  // Text search applied client-side on already-filtered server results
  const filtered = useMemo(() => {
    if (!query) return allListings
    return allListings.filter(l => {
      const text = `${l.title} ${l.city} ${l.neighborhood} ${l.description}`.toLowerCase()
      return text.includes(query.toLowerCase())
    })
  }, [query, allListings])

  const visible = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < filtered.length

  // Active pills
  const pills: { label: string; clear: () => void }[] = []
  if (query)
    pills.push({ label: `"${query}"`, clear: () => { setQuery(''); setSearchInput('') } })
  if (filters.budget_min > 0 || filters.budget_max < 3000)
    pills.push({ label: `${filters.budget_min}€ — ${filters.budget_max === 3000 ? '3000€+' : filters.budget_max + '€'}`, clear: () => setFilters(f => ({ ...f, budget_min: 0, budget_max: 3000 })) })
  if (filters.city)
    pills.push({ label: `📍 ${filters.city}`, clear: () => setFilters(f => ({ ...f, city: '' })) })
  if (filters.surface_min > 0)
    pills.push({ label: `≥ ${filters.surface_min}m²`, clear: () => setFilters(f => ({ ...f, surface_min: 0 })) })
  if (filters.rooms > 0)
    pills.push({ label: `${filters.rooms === 4 ? '4+' : filters.rooms} chambre${filters.rooms > 1 ? 's' : ''}`, clear: () => setFilters(f => ({ ...f, rooms: 0 })) })
  if (filters.boost_type)
    pills.push({ label: filters.boost_type === 'featured' ? '🚀 Mis en avant' : '⭐ Prioritaires', clear: () => setFilters(f => ({ ...f, boost_type: '' })) })

  const sortLabel = filters.sort === 'price_asc' ? '💰 Prix ↑' : filters.sort === 'price_desc' ? '💰 Prix ↓' : filters.sort === 'surface' ? '📐 Surface' : '🕐 Plus récents'
  const activeFilterCount = pills.filter(p => !p.label.startsWith('"')).length

  return (
    <>
      <Topbar title="Recherche" />
      <div className="flex flex-1 overflow-hidden">

        {/* ── Main content ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto" style={{ background: 'transparent' }}>

          {/* Search bar */}
          <div className="px-6 pt-5 pb-4" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
            <div className="flex gap-2.5 max-w-[800px]">
              <div className="flex-1 relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base pointer-events-none">🔍</span>
                <input
                  ref={inputRef}
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runSearch()}
                  placeholder="Ville, quartier, description..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-full text-[13.5px] border-[1.5px] outline-none transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: '#ffffff' }}
                  onFocus={e => (e.target.style.borderColor = '#10B981')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
              <button
                onClick={runSearch}
                className="px-5 py-2.5 rounded-full text-[13px] font-bold text-white border-none cursor-pointer flex-shrink-0 transition-colors"
                style={{ background: '#10B981' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#059669')}
                onMouseLeave={e => (e.currentTarget.style.background = '#10B981')}
              >
                Rechercher
              </button>
              <button
                onClick={() => setShowFilters(f => !f)}
                className="px-4 py-2.5 rounded-full text-[13px] font-semibold border-[1.5px] cursor-pointer flex-shrink-0 transition-all"
                style={
                  showFilters
                    ? { background: 'rgba(16,185,129,0.15)', color: '#10B981', borderColor: '#10B981' }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.1)' }
                }
              >
                ⚙️ Filtres
                {activeFilterCount > 0 && (
                  <span className="ml-1.5 text-[10px] font-extrabold px-1.5 py-px rounded-full" style={{ background: '#10B981', color: '#fff' }}>
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="px-6 pt-4 pb-8 max-w-[940px]">

            {/* Active pills */}
            {pills.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {pills.map((p, i) => (
                  <button
                    key={i}
                    onClick={p.clear}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full border-none cursor-pointer transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#111827' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#6B7280' }}
                  >
                    {p.label}
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>✕</span>
                  </button>
                ))}
                {pills.length > 1 && (
                  <button
                    onClick={resetAll}
                    className="text-[12px] font-semibold px-3 py-1.5 rounded-full border-none cursor-pointer"
                    style={{ background: 'transparent', color: '#EF4444' }}
                  >
                    Tout effacer
                  </button>
                )}
              </div>
            )}

            {/* Results count */}
            <div className="flex justify-between items-center mb-5">
              <div className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {loadingListings
                  ? 'Chargement des annonces...'
                  : filtered.length === 0
                    ? 'Aucune annonce trouvée'
                    : <><strong style={{ color: '#ffffff' }}>{filtered.length} annonce{filtered.length > 1 ? 's' : ''}</strong> disponible{filtered.length > 1 ? 's' : ''}</>
                }
              </div>
              <div className="text-[11.5px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{sortLabel}</div>
            </div>

            {/* Results grid */}
            {loadingListings ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-[52px] mb-4">🏠</div>
                <p className="text-[13.5px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Recherche des annonces...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-[52px] mb-4">🔍</div>
                <h3 className="text-[18px] mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: '#ffffff' }}>
                  Aucune annonce trouvée
                </h3>
                <p className="text-[13.5px] mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Essayez d&apos;élargir vos filtres ou de modifier votre recherche.
                </p>
                <button
                  onClick={resetAll}
                  className="px-6 py-2.5 rounded-full text-[13px] font-bold text-white border-none cursor-pointer"
                  style={{ background: '#10B981' }}
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {visible.map(l => <ListingCard key={l.id} listing={l} />)}
                </div>

                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => setPage(n => n + 1)}
                      className="px-8 py-3 rounded-full text-[13px] font-semibold border-[1.5px] cursor-pointer bg-transparent transition-all"
                      style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#6B7280' }}
                    >
                      Voir plus ({filtered.length - visible.length} annonces restantes)
                    </button>
                  </div>
                )}

                {!hasMore && filtered.length > PAGE_SIZE && (
                  <div className="text-center mt-8 text-[12.5px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Toutes les {filtered.length} annonces affichées
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Overlay ─────────────────────────────────────────── */}
      {showFilters && (
        <div
          onClick={() => setShowFilters(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 40,
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* ── Drawer filtres ───────────────────────────────────── */}
      {showFilters && (
        <div style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: '340px',
          background: '#111111',
          zIndex: 50,
          boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
          animation: 'slideInRight 0.25s cubic-bezier(.34,1.56,.64,1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '20px', color: '#ffffff' }}>Filtres</div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={() => setFilters(DEFAULTS)}
                style={{ fontSize: '12px', color: '#10B981', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Tout effacer
              </button>
              <button
                onClick={() => setShowFilters(false)}
                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Corps scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

            {/* Budget */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>BUDGET</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>{filters.budget_min}€</span>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>{filters.budget_max === 3000 ? '3000€+' : `${filters.budget_max}€`}/mois</span>
              </div>
              <input type="range" min={0} max={3000} step={50}
                value={filters.budget_min}
                onChange={e => setFilters(f => ({ ...f, budget_min: Math.min(Number(e.target.value), f.budget_max - 50) }))}
                style={{ width: '100%', accentColor: '#10B981' }}
              />
              <input type="range" min={0} max={3000} step={50}
                value={filters.budget_max}
                onChange={e => setFilters(f => ({ ...f, budget_max: Math.max(Number(e.target.value), f.budget_min + 50) }))}
                style={{ width: '100%', accentColor: '#10B981', marginTop: '4px' }}
              />
            </div>

            {/* Ville */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>VILLE</div>
              <input
                type="text"
                placeholder="Lyon, Paris, Marseille..."
                value={filters.city}
                onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = '#10B981')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            {/* Surface */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>SURFACE MINIMUM</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>0 m²</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#10B981' }}>{filters.surface_min} m²</span>
              </div>
              <input type="range" min={0} max={200} step={5}
                value={filters.surface_min}
                onChange={e => setFilters(f => ({ ...f, surface_min: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: '#10B981' }}
              />
            </div>

            {/* Chambres */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>CHAMBRES DISPONIBLES</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[0, 1, 2, 3, 4].map(n => (
                  <button key={n}
                    onClick={() => setFilters(f => ({ ...f, rooms: n }))}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: '1.5px solid',
                      borderColor: filters.rooms === n ? '#10B981' : 'rgba(255,255,255,0.1)',
                      background: filters.rooms === n ? '#ECFDF5' : '#fff',
                      color: filters.rooms === n ? '#059669' : '#6B7280',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {n === 0 ? 'Toutes' : n === 4 ? '4+' : n}
                  </button>
                ))}
              </div>
            </div>

            {/* Date d'entrée */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>DATE D&apos;ENTRÉE AVANT LE</div>
              <input
                type="date"
                value={filters.date_before}
                onChange={e => setFilters(f => ({ ...f, date_before: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = '#10B981')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            {/* Tri */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>TRIER PAR</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { value: 'recent',     label: '🕐 Plus récent' },
                  { value: 'price_asc',  label: '💰 Prix croissant' },
                  { value: 'price_desc', label: '💰 Prix décroissant' },
                  { value: 'surface',    label: '📐 Surface' },
                ].map(opt => (
                  <button key={opt.value}
                    onClick={() => setFilters(f => ({ ...f, sort: opt.value }))}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: '1.5px solid',
                      borderColor: filters.sort === opt.value ? '#10B981' : 'rgba(255,255,255,0.1)',
                      background: filters.sort === opt.value ? '#ECFDF5' : '#fff',
                      color: filters.sort === opt.value ? '#059669' : '#374151',
                      fontSize: '13px',
                      fontWeight: filters.sort === opt.value ? 600 : 400,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Type d'annonce */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>TYPE D&apos;ANNONCE</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { value: '',         label: '📋 Toutes' },
                  { value: 'featured', label: '🚀 Mis en avant' },
                  { value: 'priority', label: '⭐ Prioritaires' },
                ].map(opt => (
                  <button key={opt.value}
                    onClick={() => setFilters(f => ({ ...f, boost_type: opt.value }))}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '20px',
                      border: '1.5px solid',
                      borderColor: filters.boost_type === opt.value ? '#10B981' : 'rgba(255,255,255,0.1)',
                      background: filters.boost_type === opt.value ? '#ECFDF5' : '#fff',
                      color: filters.boost_type === opt.value ? '#059669' : '#6B7280',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', flexShrink: 0 }}>
            <button
              onClick={() => setShowFilters(false)}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
              }}
            >
              Appliquer les filtres
            </button>
          </div>
        </div>
      )}
    </>
  )
}
