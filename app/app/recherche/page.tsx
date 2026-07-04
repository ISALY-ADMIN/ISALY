'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import Topbar from '@/components/layout/Topbar'
import type { SearchResponse, SearchResult } from '@/app/api/recherche/route'

const SearchMap = dynamic(() => import('@/components/map/SearchMap'), { ssr: false })

// ═══════════════ Filtres ↔ URL ═══════════════

const DEFAULTS = {
  q: '', city: '', budget_max: 0, rooms: 0,
  surface_min: 0, surface_max: 0,
  meuble: false, animaux: false, non_fumeur: false,
  dispo: false, boost_only: false, compat_only: false,
  sort: 'pertinence',
}
type Filters = typeof DEFAULTS

function filtersFromParams(p: URLSearchParams): Filters {
  return {
    q: p.get('q') ?? '',
    city: p.get('city') ?? '',
    budget_max: Number(p.get('budget_max')) || 0,
    rooms: Number(p.get('rooms')) || 0,
    surface_min: Number(p.get('surface_min')) || 0,
    surface_max: Number(p.get('surface_max')) || 0,
    meuble: p.get('meuble') === '1',
    animaux: p.get('animaux') === '1',
    non_fumeur: p.get('non_fumeur') === '1',
    dispo: p.get('dispo') === '1',
    boost_only: p.get('boost_only') === '1',
    compat_only: p.get('compat_only') === '1',
    sort: p.get('sort') ?? 'pertinence',
  }
}

function filtersToParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.city) p.set('city', f.city)
  if (f.budget_max > 0) p.set('budget_max', String(f.budget_max))
  if (f.rooms > 0) p.set('rooms', String(f.rooms))
  if (f.surface_min > 0) p.set('surface_min', String(f.surface_min))
  if (f.surface_max > 0) p.set('surface_max', String(f.surface_max))
  for (const k of ['meuble', 'animaux', 'non_fumeur', 'dispo', 'boost_only', 'compat_only'] as const) {
    if (f[k]) p.set(k, '1')
  }
  if (f.sort !== 'pertinence') p.set('sort', f.sort)
  return p
}

const SORT_OPTIONS = [
  { value: 'pertinence', label: 'Pertinence' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'recent', label: 'Récent' },
  { value: 'places', label: 'Places restantes' },
]

// ═══════════════ Petits composants ═══════════════

function useCountUp(target: number): number {
  const [value, setValue] = useState(target)
  const prev = useRef(target)
  useEffect(() => {
    const from = prev.current
    prev.current = target
    if (from === target) return
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min((now - start) / 500, 1)
      setValue(Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return value
}

/** Cercle % compatibilité (coin haut-gauche des cards). */
function CompatBadge({ score }: { score: number }) {
  const r = 15
  const c = 2 * Math.PI * r
  return (
    <div title={`${score}% de compatibilité`} style={{
      position: 'absolute', top: 10, left: 10, width: 40, height: 40, zIndex: 2,
      background: 'rgba(10,10,10,0.72)', borderRadius: '50%', backdropFilter: 'blur(4px)',
    }}>
      <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
        <circle cx="20" cy="20" r={r} fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <span style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '10.5px', fontWeight: 800, color: '#10B981',
      }}>{score}%</span>
    </div>
  )
}

function Chip({ active, label, onClick, onClear }: {
  active: boolean; label: string; onClick: () => void; onClear?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 flex-shrink-0 rounded-full cursor-pointer transition-all text-[12.5px] font-semibold px-3.5 py-1.5"
      style={active
        ? { background: 'rgba(16,185,129,0.1)', border: '1.5px solid #10B981', color: '#10B981' }
        : { background: 'transparent', border: '1.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
    >
      {label}
      {active && onClear && (
        <span
          role="button"
          aria-label="Retirer le filtre"
          onClick={e => { e.stopPropagation(); onClear() }}
          style={{ fontSize: '11px', opacity: 0.8 }}
        >✕</span>
      )}
    </button>
  )
}

// ═══════════════ Card annonce ═══════════════

function ListingCard({ l, isFav, onFav, onContact, onHover, active, cardRef }: {
  l: SearchResult
  isFav: boolean
  onFav: () => void
  onContact: () => void
  onHover: (id: string | null) => void
  active: boolean
  cardRef: (el: HTMLDivElement | null) => void
}) {
  const router = useRouter()
  const [photoIdx, setPhotoIdx] = useState(0)
  const [hovering, setHovering] = useState(false)
  const photos = l.photos.length > 0 ? l.photos : [null]
  const remaining = l.occupancy.total - l.occupancy.current

  return (
    <div
      ref={cardRef}
      onClick={() => router.push(`/app/annonce/${l.id}`)}
      onMouseEnter={() => { setHovering(true); onHover(l.id) }}
      onMouseLeave={() => { setHovering(false); onHover(null) }}
      role="link"
      aria-label={`${l.title}, ${l.rent}€ par mois à ${l.city}`}
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') router.push(`/app/annonce/${l.id}`) }}
      className="rounded-[18px] overflow-hidden flex flex-col cursor-pointer"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${active || hovering ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.08)'}`,
        transform: hovering ? 'translateY(-4px)' : 'none',
        boxShadow: hovering || active ? '0 10px 34px rgba(16,185,129,0.14)' : 'none',
        transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
        outline: 'none',
      }}
    >
      {/* Photo 4:3 + carousel au hover */}
      <div style={{ position: 'relative', aspectRatio: '4/3', background: 'linear-gradient(135deg, #0f2e24, #04160f)', overflow: 'hidden' }}>
        {photos[photoIdx] ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={photos[photoIdx]!} alt={l.title}
            onError={e => { e.currentTarget.style.display = 'none' }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '38px' }}>🏠</div>
        )}

        {l.compat && <CompatBadge score={l.compat.score} />}

        {l.boostTier !== 'standard' && (
          <span style={{
            position: 'absolute', top: 10, right: 10, zIndex: 2,
            fontSize: '10px', fontWeight: 800, letterSpacing: '0.06em', padding: '4px 10px', borderRadius: '12px',
            background: l.boostTier === 'priority' ? 'rgba(245,158,11,0.92)' : 'rgba(99,102,241,0.92)',
            color: '#fff',
          }}>
            {l.boostTier === 'priority' ? '⚡ PRIORITAIRE' : '✨ ESSENTIEL'}
          </span>
        )}

        {hovering && photos.length > 1 && (
          <>
            <button
              aria-label="Photo précédente"
              onClick={e => { e.stopPropagation(); setPhotoIdx(i => (i - 1 + photos.length) % photos.length) }}
              style={{
                position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 3,
                width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'rgba(10,10,10,0.6)', color: '#fff', fontSize: '13px', backdropFilter: 'blur(4px)',
              }}
            >‹</button>
            <button
              aria-label="Photo suivante"
              onClick={e => { e.stopPropagation(); setPhotoIdx(i => (i + 1) % photos.length) }}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 3,
                width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'rgba(10,10,10,0.6)', color: '#fff', fontSize: '13px', backdropFilter: 'blur(4px)',
              }}
            >›</button>
            <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4, zIndex: 3 }}>
              {photos.map((_, i) => (
                <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: i === photoIdx ? '#10B981' : 'rgba(255,255,255,0.5)' }} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Contenu */}
      <div className="p-4 flex flex-col flex-1">
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {l.title}
        </div>
        <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', margin: '3px 0 8px' }}>
          📍 {l.city}{l.neighborhood ? ` · ${l.neighborhood}` : ''}
          {l.surface ? ` · ${l.surface} m²` : ''}
          {l.rooms > 0 ? ` · ${l.rooms} ch.` : ''}
        </div>
        <div className="flex items-center justify-between mb-3">
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: 800, color: '#10B981' }}>
            {l.rent}€<span style={{ fontSize: '11.5px', fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>/mois</span>
          </div>
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '14px',
            ...(remaining > 0
              ? { background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }
              : { background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }),
          }}>
            👥 {l.occupancy.current}/{l.occupancy.total}{remaining <= 0 ? ' · Complet' : ''}
          </span>
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 mt-auto">
          <button
            aria-label={isFav ? 'Retirer des favoris' : 'Sauvegarder en favori'}
            onClick={e => { e.stopPropagation(); onFav() }}
            className="py-2 px-3.5 rounded-full text-[12.5px] font-bold cursor-pointer transition-all"
            style={isFav
              ? { background: 'rgba(16,185,129,0.12)', border: '1.5px solid #10B981', color: '#10B981' }
              : { background: 'transparent', border: '1.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
          >
            {isFav ? '💚 Sauvegardé' : '🤍 Sauvegarder'}
          </button>
          <button
            aria-label="Contacter le loueur"
            onClick={e => { e.stopPropagation(); onContact() }}
            className="flex-1 py-2 rounded-full text-[12.5px] font-bold text-white border-none cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
          >
            💬 Contacter
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════ Page ═══════════════

function RechercheInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<Filters>(() => filtersFromParams(new URLSearchParams(searchParams.toString())))
  const [data, setData] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [openPanel, setOpenPanel] = useState<'city' | 'budget' | 'rooms' | 'surface' | 'sort' | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showMobileMap, setShowMobileMap] = useState(false)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstLoad = useRef(true)

  const set = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(f => ({ ...f, [key]: value }))
  }, [])

  // Recherche instantanée : debounce 300 ms + URL partageable
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const delay = firstLoad.current ? 0 : 300
    firstLoad.current = false
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const params = filtersToParams(filters)
      const qs = params.toString()
      router.replace(`/app/recherche${qs ? `?${qs}` : ''}`, { scroll: false })
      try {
        const res = await fetch(`/api/recherche?${qs}`)
        if (res.status === 401) { router.push('/auth/login'); return }
        if (res.ok) {
          const json: SearchResponse = await res.json()
          setData(json)
          setFavorites(new Set(json.favoriteIds))
        }
      } catch {}
      setLoading(false)
    }, delay)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [filters, router])

  async function toggleFav(id: string) {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
    try {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_id: id, target_type: 'listing' }),
      })
    } catch {}
  }

  function onMarkerClick(id: string) {
    setActiveId(id)
    setShowMobileMap(false)
    cardRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const results = data?.results ?? []
  const count = useCountUp(data?.total ?? 0)
  const mapItems = useMemo(
    () => results.filter(r => r.coords).map(r => ({
      id: r.id, title: r.title, rent: r.rent, photo: r.photos[0] ?? null, coords: r.coords!,
    })),
    [results],
  )
  const sortLabel = SORT_OPTIONS.find(o => o.value === filters.sort)?.label ?? 'Pertinence'

  const panelStyle: React.CSSProperties = {
    position: 'absolute', top: 'calc(100% + 8px)', zIndex: 45,
    background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
    padding: '16px', boxShadow: '0 16px 48px rgba(0,0,0,0.5)', minWidth: '240px',
  }

  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>
      <Topbar title="Recherche" />

      {openPanel && <div onClick={() => setOpenPanel(null)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />}

      <div className="px-5 lg:px-8 pt-5">
        {/* ── Barre de recherche pill 3 segments ── */}
        <div className="relative max-w-[780px]" style={{ zIndex: 46 }}>
          <div
            className="flex items-stretch"
            style={{
              background: 'rgba(255,255,255,0.06)', borderRadius: '100px', height: '56px',
              border: `1.5px solid ${openPanel && openPanel !== 'sort' ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
              transition: 'border-color 0.2s',
            }}
          >
            {([
              { key: 'city' as const, icon: '📍', label: 'Ville', value: filters.city || 'Où ?' },
              { key: 'budget' as const, icon: '💰', label: 'Budget max', value: filters.budget_max > 0 ? `${filters.budget_max}€` : 'Peu importe' },
              { key: 'rooms' as const, icon: '🛏', label: 'Chambres', value: filters.rooms > 0 ? `${filters.rooms}+` : 'Toutes' },
            ]).map((seg, i) => (
              <button
                key={seg.key}
                onClick={() => setOpenPanel(p => p === seg.key ? null : seg.key)}
                aria-label={`Filtrer par ${seg.label.toLowerCase()}`}
                className="flex-1 flex flex-col justify-center text-left cursor-pointer border-none"
                style={{
                  background: openPanel === seg.key ? 'rgba(16,185,129,0.08)' : 'transparent',
                  borderRadius: '100px', padding: '0 22px', minWidth: 0,
                  borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                }}
              >
                <span style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                  {seg.icon} {seg.label}
                </span>
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: seg.value === 'Où ?' || seg.value === 'Peu importe' || seg.value === 'Toutes' ? 'rgba(255,255,255,0.35)' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {seg.value}
                </span>
              </button>
            ))}
            <div className="flex items-center pr-1.5 pl-1 flex-shrink-0">
              <button
                aria-label="Rechercher"
                onClick={() => setOpenPanel(null)}
                className="border-none cursor-pointer text-white font-extrabold"
                style={{
                  width: '46px', height: '46px', borderRadius: '50%', fontSize: '17px',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
                }}
              >🔍</button>
            </div>
          </div>

          {/* Dropdowns inline */}
          {openPanel === 'city' && (
            <div style={{ ...panelStyle, left: 0 }}>
              <input
                autoFocus
                value={filters.city}
                onChange={e => set('city', e.target.value)}
                placeholder="Lyon, Paris, Marseille…"
                className="w-full px-3.5 py-2.5 rounded-[10px] text-[13.5px] outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#fff' }}
              />
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Lille', 'Toulouse'].map(c => (
                  <button key={c} onClick={() => { set('city', c); setOpenPanel(null) }}
                    className="text-[12px] font-semibold px-3 py-1.5 rounded-full cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.7)' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
          {openPanel === 'budget' && (
            <div style={{ ...panelStyle, left: '25%' }}>
              <div className="flex justify-between mb-2">
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Budget max</span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#10B981' }}>
                  {filters.budget_max > 0 ? `${filters.budget_max}€/mois` : 'Peu importe'}
                </span>
              </div>
              <input type="range" min={0} max={2000} step={50} value={filters.budget_max}
                onChange={e => set('budget_max', Number(e.target.value))}
                style={{ width: '100%', accentColor: '#10B981' }} />
              <div className="flex gap-1.5 mt-3">
                {[500, 700, 900, 1200].map(v => (
                  <button key={v} onClick={() => { set('budget_max', v); setOpenPanel(null) }}
                    className="text-[12px] font-semibold px-3 py-1.5 rounded-full cursor-pointer flex-1"
                    style={{ background: filters.budget_max === v ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', border: 'none', color: filters.budget_max === v ? '#10B981' : 'rgba(255,255,255,0.7)' }}>
                    {v}€
                  </button>
                ))}
              </div>
            </div>
          )}
          {openPanel === 'rooms' && (
            <div style={{ ...panelStyle, right: '60px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>Chambres disponibles minimum</div>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4].map(n => (
                  <button key={n} onClick={() => { set('rooms', n); setOpenPanel(null) }}
                    className="px-4 py-2 rounded-full text-[13px] font-bold cursor-pointer"
                    style={filters.rooms === n
                      ? { background: 'rgba(16,185,129,0.15)', border: '1.5px solid #10B981', color: '#10B981' }
                      : { background: 'transparent', border: '1.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}>
                    {n === 0 ? 'Toutes' : n === 4 ? '4+' : n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Chips filtres ── */}
        <div className="relative flex gap-2 mt-4 pb-1 overflow-x-auto" style={{ scrollbarWidth: 'none', zIndex: 44 }}>
          <Chip
            active={filters.surface_min > 0 || filters.surface_max > 0}
            label={filters.surface_min > 0 || filters.surface_max > 0
              ? `📐 ${filters.surface_min > 0 ? `${filters.surface_min}` : '0'}–${filters.surface_max > 0 ? `${filters.surface_max}` : '∞'} m²`
              : '📐 Superficie'}
            onClick={() => setOpenPanel(p => p === 'surface' ? null : 'surface')}
            onClear={() => { set('surface_min', 0); set('surface_max', 0) }}
          />
          <Chip active={filters.meuble} label="🛋 Meublé" onClick={() => set('meuble', !filters.meuble)} onClear={() => set('meuble', false)} />
          <Chip active={filters.dispo} label="✅ Disponible maintenant" onClick={() => set('dispo', !filters.dispo)} onClear={() => set('dispo', false)} />
          <Chip active={filters.boost_only} label="🚀 Boost uniquement" onClick={() => set('boost_only', !filters.boost_only)} onClear={() => set('boost_only', false)} />
          <Chip active={filters.compat_only} label="🎯 Score compatibilité" onClick={() => set('compat_only', !filters.compat_only)} onClear={() => set('compat_only', false)} />
          <Chip active={filters.animaux} label="🐾 Animaux OK" onClick={() => set('animaux', !filters.animaux)} onClear={() => set('animaux', false)} />
          <Chip active={filters.non_fumeur} label="🚭 Non-fumeur" onClick={() => set('non_fumeur', !filters.non_fumeur)} onClear={() => set('non_fumeur', false)} />

          {openPanel === 'surface' && (
            <div style={{ ...panelStyle, left: 0, top: 'calc(100% + 6px)' }}>
              <div className="flex justify-between mb-1.5">
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Surface min</span>
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#10B981' }}>{filters.surface_min || 0} m²</span>
              </div>
              <input type="range" min={0} max={150} step={5} value={filters.surface_min}
                onChange={e => set('surface_min', Number(e.target.value))} style={{ width: '100%', accentColor: '#10B981' }} />
              <div className="flex justify-between mb-1.5 mt-3">
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Surface max</span>
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#10B981' }}>{filters.surface_max > 0 ? `${filters.surface_max} m²` : '∞'}</span>
              </div>
              <input type="range" min={0} max={250} step={5} value={filters.surface_max}
                onChange={e => set('surface_max', Number(e.target.value))} style={{ width: '100%', accentColor: '#10B981' }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Corps : résultats + carte ── */}
      <div className="flex px-5 lg:px-8 pt-5 pb-16 gap-6 items-start">
        {/* Résultats */}
        <div className="w-full lg:w-[60%]">
          <div className="flex items-center justify-between mb-4 relative">
            <div style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.5)' }}>
              {loading && !data
                ? 'Recherche…'
                : <><strong style={{ color: '#fff', fontSize: '15px' }}>{count}</strong> annonce{count > 1 ? 's' : ''} trouvée{count > 1 ? 's' : ''}</>}
            </div>
            <button
              onClick={() => setOpenPanel(p => p === 'sort' ? null : 'sort')}
              className="text-[12.5px] font-semibold cursor-pointer rounded-full px-3.5 py-1.5"
              style={{ background: 'transparent', border: '1.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}
            >
              ↕ {sortLabel}
            </button>
            {openPanel === 'sort' && (
              <div style={{ ...panelStyle, right: 0, top: 'calc(100% + 6px)', minWidth: '190px', padding: '8px' }}>
                {SORT_OPTIONS.map(o => (
                  <button key={o.value}
                    onClick={() => { set('sort', o.value); setOpenPanel(null) }}
                    className="w-full text-left px-3 py-2 rounded-[10px] text-[13px] font-semibold cursor-pointer border-none"
                    style={{
                      background: filters.sort === o.value ? 'rgba(16,185,129,0.12)' : 'transparent',
                      color: filters.sort === o.value ? '#10B981' : 'rgba(255,255,255,0.7)',
                    }}>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading && !data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-[18px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="search-shimmer" style={{ aspectRatio: '4/3', background: 'rgba(255,255,255,0.05)' }} />
                  <div className="p-4">
                    <div className="search-shimmer rounded-md mb-2" style={{ height: 16, width: '70%', background: 'rgba(255,255,255,0.05)' }} />
                    <div className="search-shimmer rounded-md" style={{ height: 12, width: '45%', background: 'rgba(255,255,255,0.05)' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <svg width="110" height="110" viewBox="0 0 110 110" fill="none" aria-hidden="true">
                <circle cx="55" cy="55" r="46" stroke="rgba(16,185,129,0.25)" strokeWidth="1.5" strokeDasharray="4 6" />
                <path d="M38 62V48l17-12 17 12v14a4 4 0 0 1-4 4H42a4 4 0 0 1-4-4z" stroke="#10B981" strokeWidth="2" fill="rgba(16,185,129,0.07)" />
                <circle cx="76" cy="74" r="12" stroke="rgba(16,185,129,0.6)" strokeWidth="2" fill="rgba(10,10,10,0.6)" />
                <path d="M85 83l7 7" stroke="rgba(16,185,129,0.6)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 700, color: '#fff', margin: '18px 0 6px' }}>
                Aucune annonce dans cette zone
              </h3>
              <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.45)', marginBottom: '20px' }}>
                Essaie d&apos;élargir ta zone ou d&apos;assouplir tes critères.
              </p>
              <button
                onClick={() => setFilters(DEFAULTS)}
                className="px-6 py-2.5 rounded-full text-[13px] font-bold text-white border-none cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}
              >
                Élargir la recherche
              </button>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.045 } } }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {results.map(l => (
                <motion.div key={l.id} variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}>
                  <ListingCard
                    l={l}
                    isFav={favorites.has(l.id)}
                    onFav={() => toggleFav(l.id)}
                    onContact={() => router.push(`/app/messages?owner=${l.ownerId}`)}
                    onHover={setHoveredId}
                    active={activeId === l.id}
                    cardRef={el => { if (el) cardRefs.current.set(l.id, el); else cardRefs.current.delete(l.id) }}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Carte desktop — sticky */}
        <div className="hidden lg:block lg:w-[40%] sticky" style={{ top: '76px', height: 'calc(100vh - 100px)', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
          <SearchMap items={mapItems} hoveredId={hoveredId ?? activeId} onMarkerClick={onMarkerClick} />
        </div>
      </div>

      {/* Bouton flottant carte — mobile */}
      <button
        onClick={() => setShowMobileMap(true)}
        aria-label="Voir la carte"
        className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 border-none cursor-pointer text-white font-extrabold text-[13.5px] px-6 py-3 rounded-full"
        style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 8px 28px rgba(16,185,129,0.45)', fontFamily: "'Outfit', sans-serif" }}
      >
        🗺 Voir la carte
      </button>

      {/* Overlay carte mobile */}
      {showMobileMap && (
        <div className="lg:hidden fixed inset-0 z-50" style={{ background: '#0A0A0A' }}>
          <SearchMap items={mapItems} hoveredId={activeId} onMarkerClick={onMarkerClick} />
          <button
            onClick={() => setShowMobileMap(false)}
            aria-label="Fermer la carte"
            className="fixed top-4 right-4 z-[60] border-none cursor-pointer"
            style={{
              width: 40, height: 40, borderRadius: '50%', fontSize: '16px',
              background: 'rgba(10,10,10,0.85)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)',
            }}
          >✕</button>
        </div>
      )}

      <style>{`
        .search-shimmer { animation: searchShimmer 1.4s ease-in-out infinite; }
        @keyframes searchShimmer { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
      `}</style>
    </div>
  )
}

export default function RecherchePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'transparent' }} />}>
      <RechercheInner />
    </Suspense>
  )
}
