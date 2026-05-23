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
  rooms_available: number
  photos: string[]
  owner_id: string
  description: string
  created_at: string
}

// ── Filter defaults ───────────────────────────────────────────
const DEFAULTS = {
  budgetMin: 300, budgetMax: 2000,
  city: '',
  rooms: '' as '' | '1' | '2' | '3' | '4+',
  sortBy: 'newest' as 'newest' | 'price_asc' | 'price_desc',
}
type Filters = typeof DEFAULTS

const PAGE_SIZE = 9

// ── Dual range slider ─────────────────────────────────────────
function DualRangeSlider({
  min = 300, max = 2000, step = 50,
  valueMin, valueMax,
  onMin, onMax,
}: {
  min?: number; max?: number; step?: number
  valueMin: number; valueMax: number
  onMin: (v: number) => void; onMax: (v: number) => void
}) {
  const span = max - min
  const leftPct  = ((valueMin - min) / span) * 100
  const rightPct = 100 - ((valueMax - min) / span) * 100

  return (
    <div>
      <div className="flex justify-between text-[12px] font-bold mb-2" style={{ color: '#4ECBA0' }}>
        <span>{valueMin}€</span>
        <span>{valueMax === 2000 ? '2000€+' : `${valueMax}€`}</span>
      </div>
      <div className="range-wrap">
        <div className="absolute inset-x-0 h-1 rounded-full" style={{ background: '#2D2D2D', top: '50%', transform: 'translateY(-50%)' }} />
        <div
          className="absolute h-1 rounded-full"
          style={{ left: `${leftPct}%`, right: `${rightPct}%`, background: '#4ECBA0', top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="range" min={min} max={max} step={step} value={valueMin}
          style={{ zIndex: valueMin > max - 200 ? 5 : 3 }}
          onChange={e => onMin(Math.min(Number(e.target.value), valueMax - step))}
        />
        <input
          type="range" min={min} max={max} step={step} value={valueMax}
          style={{ zIndex: 4 }}
          onChange={e => onMax(Math.max(Number(e.target.value), valueMin + step))}
        />
      </div>
      <div className="text-[11px] text-center mt-1.5" style={{ color: '#6B7280' }}>
        {valueMin}€ — {valueMax === 2000 ? '2000€ et +' : `${valueMax}€`}/mois
      </div>
    </div>
  )
}

// ── Toggle button ─────────────────────────────────────────────
function ToggleBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer border-[1.5px] transition-all"
      style={
        active
          ? { background: '#0E2B1E', color: '#4ECBA0', borderColor: '#4ECBA0' }
          : { background: 'transparent', color: '#9CA3AF', borderColor: '#2D2D2D' }
      }
    >
      {label}
    </button>
  )
}

// ── Filters panel ─────────────────────────────────────────────
function FiltersPanel({
  filters, onChange, onReset,
}: {
  filters: Filters
  onChange: (patch: Partial<Filters>) => void
  onReset: () => void
}) {
  return (
    <div
      className="flex flex-col overflow-y-auto flex-shrink-0 border-l"
      style={{ width: '272px', background: '#111827', borderColor: '#1F2937' }}
    >
      <div className="flex justify-between items-center px-5 py-4 border-b" style={{ borderColor: '#1F2937' }}>
        <span className="text-[13.5px] font-bold" style={{ color: '#F1F5F9' }}>Filtres</span>
        <button
          onClick={onReset}
          className="text-[12px] font-semibold cursor-pointer border-none bg-transparent"
          style={{ color: '#4ECBA0' }}
        >
          Tout effacer
        </button>
      </div>

      <div className="p-5 flex flex-col gap-6 flex-1">

        {/* Budget */}
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[1.5px] mb-3" style={{ color: '#4B5563' }}>Budget</div>
          <DualRangeSlider
            valueMin={filters.budgetMin} valueMax={filters.budgetMax}
            onMin={v => onChange({ budgetMin: v })}
            onMax={v => onChange({ budgetMax: v })}
          />
        </div>

        {/* Localisation */}
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[1.5px] mb-3" style={{ color: '#4B5563' }}>Ville</div>
          <input
            placeholder="Paris, Lyon, Marseille..."
            value={filters.city}
            onChange={e => onChange({ city: e.target.value })}
            className="w-full px-3 py-2 rounded-[8px] text-[12.5px] border outline-none"
            style={{ background: '#1F2937', borderColor: '#374151', color: '#E5E7EB' }}
            onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
            onBlur={e => (e.target.style.borderColor = '#374151')}
          />
        </div>

        {/* Chambres */}
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[1.5px] mb-3" style={{ color: '#4B5563' }}>Chambres disponibles</div>
          <div className="flex gap-1.5 flex-wrap">
            {(['', '1', '2', '3', '4+'] as const).map(r => (
              <ToggleBtn key={r} label={r || 'Toutes'} active={filters.rooms === r} onClick={() => onChange({ rooms: r })} />
            ))}
          </div>
        </div>

        {/* Tri */}
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[1.5px] mb-3" style={{ color: '#4B5563' }}>Trier par</div>
          <div className="flex flex-col gap-2">
            {([
              ['newest',     '🕐 Plus récents'],
              ['price_asc',  '💰 Prix croissant'],
              ['price_desc', '💰 Prix décroissant'],
            ] as const).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="sortBy"
                  value={v}
                  checked={filters.sortBy === v}
                  onChange={() => onChange({ sortBy: v })}
                  className="w-4 h-4 cursor-pointer"
                  style={{ accentColor: '#4ECBA0' }}
                />
                <span className="text-[12.5px]" style={{ color: filters.sortBy === v ? '#4ECBA0' : '#9CA3AF' }}>{l}</span>
              </label>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Listing card ──────────────────────────────────────────────
function ListingCard({ listing }: { listing: Listing }) {
  const router = useRouter()
  return (
    <div
      className="rounded-[16px] overflow-hidden flex flex-col"
      style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}
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
          <span className="text-[14px] font-bold" style={{ color: '#111827' }}>
            {listing.title || `Colocation à ${listing.city}`}
          </span>
          <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full flex-shrink-0 ml-1" style={{ background: '#ECFDF5', color: '#059669' }}>
            🏠 Annonce
          </span>
        </div>
        <div className="text-[12px] mb-2" style={{ color: '#6B7280' }}>
          📍 {listing.city}{listing.neighborhood ? ` · ${listing.neighborhood}` : ''}
        </div>
        <div className="text-[15px] font-bold mb-2" style={{ color: '#10B981' }}>
          {listing.rent}€<span className="text-[11px] font-normal" style={{ color: '#9CA3AF' }}>/mois</span>
          {listing.rooms_available > 0 && (
            <span className="text-[11px] font-normal ml-2" style={{ color: '#6B7280' }}>
              · {listing.rooms_available} chambre{listing.rooms_available > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {listing.description && (
          <p className="text-[12px] mb-3" style={{ color: '#9CA3AF', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
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
            style={{ borderColor: '#E5E7EB', color: '#374151' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#374151' }}
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
  const [showFilters, setShowFilters] = useState(true)
  const [page, setPage]               = useState(1)
  const [allListings, setAllListings] = useState<Listing[]>([])
  const [loadingListings, setLoadingListings] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function fetchListings() {
      const supabase = createClient()
      const { data } = await supabase
        .from('listings')
        .select('id, title, city, neighborhood, rent, rooms_available, photos, owner_id, description, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (data) setAllListings(data)
      setLoadingListings(false)
    }
    fetchListings()
  }, [])

  function patchFilters(patch: Partial<Filters>) {
    setFilters(f => ({ ...f, ...patch }))
    setPage(1)
  }

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

  const filtered = useMemo(() => {
    let results = allListings.filter(l => {
      if (query) {
        const text = `${l.title} ${l.city} ${l.neighborhood} ${l.description}`.toLowerCase()
        if (!text.includes(query.toLowerCase())) return false
      }
      if (l.rent < filters.budgetMin || (filters.budgetMax < 2000 && l.rent > filters.budgetMax)) return false
      if (filters.city && !l.city.toLowerCase().includes(filters.city.toLowerCase())) return false
      if (filters.rooms) {
        const r = filters.rooms === '4+' ? 4 : parseInt(filters.rooms)
        if (filters.rooms === '4+' ? l.rooms_available < r : l.rooms_available !== r) return false
      }
      return true
    })

    results = [...results].sort((a, b) => {
      switch (filters.sortBy) {
        case 'price_asc':  return a.rent - b.rent
        case 'price_desc': return b.rent - a.rent
        default:           return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    return results
  }, [query, filters, allListings])

  const visible = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < filtered.length

  // Active pills
  const pills: { label: string; clear: () => void }[] = []
  if (query) pills.push({ label: `"${query}"`, clear: () => { setQuery(''); setSearchInput('') } })
  if (filters.budgetMin > 300 || filters.budgetMax < 2000)
    pills.push({ label: `${filters.budgetMin}€ — ${filters.budgetMax === 2000 ? '2000€+' : filters.budgetMax + '€'}`, clear: () => patchFilters({ budgetMin: 300, budgetMax: 2000 }) })
  if (filters.city)
    pills.push({ label: `📍 ${filters.city}`, clear: () => patchFilters({ city: '' }) })
  if (filters.rooms)
    pills.push({ label: `${filters.rooms} chambre${filters.rooms === '1' ? '' : 's'}`, clear: () => patchFilters({ rooms: '' }) })

  const gridCols = showFilters ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'

  return (
    <>
      <Topbar title="Recherche" />
      <div className="flex flex-1 overflow-hidden">

        {/* ── Main content ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto" style={{ background: '#F7F8FA' }}>

          {/* Search bar */}
          <div className="px-6 pt-5 pb-4 border-b" style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 1px 0 #F3F4F6' }}>
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
                  style={{ background: '#F9FAFB', borderColor: '#E5E7EB', color: '#111827' }}
                  onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
                  onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                />
              </div>
              <button
                onClick={runSearch}
                className="px-5 py-2.5 rounded-full text-[13px] font-bold text-white border-none cursor-pointer flex-shrink-0 transition-colors"
                style={{ background: '#4ECBA0' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#2AA87C')}
                onMouseLeave={e => (e.currentTarget.style.background = '#4ECBA0')}
              >
                Rechercher
              </button>
              <button
                onClick={() => setShowFilters(f => !f)}
                className="px-4 py-2.5 rounded-full text-[13px] font-semibold border-[1.5px] cursor-pointer flex-shrink-0 transition-all"
                style={
                  showFilters
                    ? { background: '#ECFDF5', color: '#4ECBA0', borderColor: '#4ECBA0' }
                    : { background: 'transparent', color: '#6B7280', borderColor: '#E5E7EB' }
                }
              >
                ⚙️ Filtres {pills.length > 0 && <span className="ml-1 text-[10px] font-extrabold px-1.5 py-px rounded-full" style={{ background: '#4ECBA0', color: '#FFFFFF' }}>{pills.length}</span>}
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
                    style={{ background: '#F3F4F6', color: '#6B7280' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#E5E7EB'; e.currentTarget.style.color = '#111827' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#6B7280' }}
                  >
                    {p.label}
                    <span style={{ color: '#9CA3AF', fontSize: '11px' }}>✕</span>
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
              <div className="text-[13px]" style={{ color: '#6B7280' }}>
                {loadingListings
                  ? 'Chargement des annonces...'
                  : filtered.length === 0
                    ? 'Aucune annonce trouvée'
                    : <><strong style={{ color: '#111827' }}>{filtered.length} annonce{filtered.length > 1 ? 's' : ''}</strong> disponible{filtered.length > 1 ? 's' : ''}</>
                }
              </div>
              <div className="text-[11.5px]" style={{ color: '#9CA3AF' }}>
                {filters.sortBy === 'newest' ? '🕐 Plus récents' : filters.sortBy === 'price_asc' ? '💰 Prix ↑' : '💰 Prix ↓'}
              </div>
            </div>

            {/* Results grid */}
            {loadingListings ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-[52px] mb-4" style={{ animation: 'bop 1s ease infinite' }}>🏠</div>
                <p className="text-[13.5px]" style={{ color: '#9CA3AF' }}>Recherche des annonces...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-[52px] mb-4">🔍</div>
                <h3 className="text-[18px] mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
                  Aucune annonce trouvée
                </h3>
                <p className="text-[13.5px] mb-5" style={{ color: '#6B7280' }}>
                  Essayez d'élargir vos filtres ou de modifier votre recherche.
                </p>
                <button
                  onClick={resetAll}
                  className="px-6 py-2.5 rounded-full text-[13px] font-bold text-white border-none cursor-pointer"
                  style={{ background: '#4ECBA0' }}
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-4" style={{ gridTemplateColumns: gridCols }}>
                  {visible.map(l => <ListingCard key={l.id} listing={l} />)}
                </div>

                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => setPage(n => n + 1)}
                      className="px-8 py-3 rounded-full text-[13px] font-semibold border-[1.5px] cursor-pointer bg-transparent transition-all"
                      style={{ borderColor: '#E5E7EB', color: '#6B7280' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#4ECBA0'; e.currentTarget.style.color = '#4ECBA0' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280' }}
                    >
                      Voir plus ({filtered.length - visible.length} annonces restantes)
                    </button>
                  </div>
                )}

                {!hasMore && filtered.length > PAGE_SIZE && (
                  <div className="text-center mt-8 text-[12.5px]" style={{ color: '#9CA3AF' }}>
                    Toutes les {filtered.length} annonces affichées
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Filters panel ───────────────────────────────── */}
        {showFilters && (
          <FiltersPanel filters={filters} onChange={patchFilters} onReset={resetAll} />
        )}

      </div>
    </>
  )
}
