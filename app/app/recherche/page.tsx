'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import CertificationBadge, { CertLevel } from '@/components/ui/CertificationBadge'
import { createClient } from '@/lib/supabase/client'

// ── Types ──────────────────────────────────────────────────────
interface SearchProfile {
  id: string
  name: string
  age: number
  job: string
  city: string
  rent: number
  match: number
  emoji: string
  color: string
  tags: string[]
  certLevel: CertLevel
  schedule: string
  vibe: string
  bio: string
}

// ── Mock profiles ─────────────────────────────────────────────
const ALL_PROFILES: SearchProfile[] = [
  { id: '1',  name: 'Sophie M.',   age: 24, job: 'Designer UX',        city: 'Paris 11ème',    rent: 850, match: 94, emoji: '👩‍🎨', color: '#4ECBA0', certLevel: 3, schedule: 'couche-tard', vibe: 'calme',    tags: ['🌙 Couche-tard', '🎵 Musique', '🏠 Télétravail ok'],       bio: 'Passionnée de design et musique indie.' },
  { id: '2',  name: 'Thomas R.',   age: 27, job: 'Ingénieur backend',   city: 'Paris 10ème',    rent: 780, match: 87, emoji: '👨‍💻', color: '#6366F1', certLevel: 2, schedule: 'leve-tot',    vibe: 'studieux', tags: ['🌅 Lève-tôt', '🏃 Sport', '🚭 Non-fumeur'],               bio: 'Dev backend, cherche ambiance calme.' },
  { id: '3',  name: 'Camille B.',  age: 23, job: 'Étudiante en droit',  city: 'Paris 5ème',     rent: 700, match: 82, emoji: '👩‍⚖️', color: '#F59E0B', certLevel: 1, schedule: 'leve-tot',    vibe: 'studieux', tags: ['📚 Studieux', '🐱 Animaux acceptés', '🌿 Végé'],           bio: 'M2 droit des affaires. Labrador adorable.' },
  { id: '4',  name: 'Lucas A.',    age: 29, job: 'Photographe',         city: 'Paris 18ème',    rent: 900, match: 78, emoji: '📸',   color: '#EF4444', certLevel: 0, schedule: 'couche-tard', vibe: 'festif',   tags: ['🎨 Créatif', '🌍 Voyageur', '🌙 Couche-tard'],             bio: 'Photographe freelance, souvent en déplacement.' },
  { id: '5',  name: 'Léa D.',      age: 25, job: 'Chef de projet',      city: 'Lyon 6ème',      rent: 650, match: 73, emoji: '👩‍💼', color: '#EC4899', certLevel: 2, schedule: 'couche-tard', vibe: 'detendu',  tags: ['🏠 Télétravail ok', '🚭 Non-fumeur', '🌙 Couche-tard'],    bio: 'Marketing digital, adore cuisiner.' },
  { id: '6',  name: 'Marc F.',     age: 31, job: 'Architecte',          city: 'Bordeaux',       rent: 750, match: 68, emoji: '🏗️',  color: '#14B8A6', certLevel: 3, schedule: 'leve-tot',    vibe: 'calme',    tags: ['🌅 Lève-tôt', '🏃 Sport', '🎨 Créatif'],                   bio: 'Architecte passionné de design urbain.' },
  { id: '7',  name: 'Emma P.',     age: 22, job: 'Infirmière',          city: 'Lyon 3ème',      rent: 600, match: 65, emoji: '🏥',  color: '#F97316', certLevel: 1, schedule: 'leve-tot',    vibe: 'calme',    tags: ['🌅 Lève-tôt', '🐱 Animaux acceptés', '🚭 Non-fumeur'],    bio: 'Infirmière en pédiatrie, calme et organisée.' },
  { id: '8',  name: 'Romain C.',   age: 28, job: 'Chef cuisinier',      city: 'Paris 9ème',     rent: 820, match: 71, emoji: '👨‍🍳', color: '#A855F7', certLevel: 2, schedule: 'couche-tard', vibe: 'festif',   tags: ['🍳 Cuisinier', '🎉 Festif', '🌙 Couche-tard'],             bio: 'Chef dans un bistrot parisien.' },
  { id: '9',  name: 'Julie M.',    age: 26, job: 'Professeure',         city: 'Montpellier',    rent: 550, match: 61, emoji: '👩‍🏫', color: '#06B6D4', certLevel: 1, schedule: 'leve-tot',    vibe: 'studieux', tags: ['📚 Studieux', '🏠 Télétravail ok', '🚭 Non-fumeur'],       bio: 'Prof de lettres, aime la lecture et la nature.' },
  { id: '10', name: 'Antoine S.',  age: 33, job: 'Développeur',         city: 'Nantes',         rent: 700, match: 59, emoji: '💻',  color: '#84CC16', certLevel: 0, schedule: 'couche-tard', vibe: 'detendu',  tags: ['🏠 Télétravail ok', '🎮 Gaming', '🌙 Couche-tard'],        bio: 'Dev fullstack, fan de jeux vidéo.' },
  { id: '11', name: 'Clara V.',    age: 24, job: 'Graphiste',           city: 'Paris 2ème',     rent: 880, match: 76, emoji: '🎨',  color: '#F43F5E', certLevel: 2, schedule: 'couche-tard', vibe: 'calme',    tags: ['🎨 Créatif', '🌙 Couche-tard', '🚭 Non-fumeur'],           bio: 'Graphiste freelance, atmosphère tranquille.' },
  { id: '12', name: 'Hugo B.',     age: 30, job: 'Musicien jazz',       city: 'Paris 20ème',    rent: 720, match: 63, emoji: '🎸',  color: '#8B5CF6', certLevel: 1, schedule: 'couche-tard', vibe: 'festif',   tags: ['🎵 Musique', '🎉 Festif', '🌙 Couche-tard'],               bio: 'Musicien jazz, cherche appart avec cave ou studio.' },
]

// ── Filter defaults ───────────────────────────────────────────
const DEFAULTS = {
  budgetMin: 300, budgetMax: 2000,
  city: '', neighborhood: '',
  radius: 5 as 1 | 5 | 10 | 20,
  rooms: '' as '' | '1' | '2' | '3' | '4+',
  surfaceMin: '', availableFrom: '',
  schedule: [] as string[],
  vibe: [] as string[],
  noSmoking: false, petsOk: false, remoteOk: false,
  certifiedOnly: false,
  certMinLevel: '' as '' | '1' | '2' | '3',
  withGuarantor: false,
  sortBy: 'match' as 'match' | 'price_asc' | 'price_desc' | 'newest' | 'rating',
}
type Filters = typeof DEFAULTS

const PAGE_SIZE = 6

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
        {/* Track bg */}
        <div className="absolute inset-x-0 h-1 rounded-full" style={{ background: '#2D2D2D', top: '50%', transform: 'translateY(-50%)' }} />
        {/* Track fill */}
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
  function toggleArr(key: 'schedule' | 'vibe', val: string) {
    const arr = filters[key]
    onChange({ [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] })
  }

  return (
    <div
      className="flex flex-col overflow-y-auto flex-shrink-0 border-l"
      style={{ width: '288px', background: '#111827', borderColor: '#1F2937' }}
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
          <div className="text-[11px] font-extrabold uppercase tracking-[1.5px] mb-3" style={{ color: '#4B5563' }}>Localisation</div>
          <input
            placeholder="Ville..."
            value={filters.city}
            onChange={e => onChange({ city: e.target.value, neighborhood: '' })}
            className="w-full px-3 py-2 rounded-[8px] text-[12.5px] border outline-none mb-2"
            style={{ background: '#1F2937', borderColor: '#374151', color: '#E5E7EB' }}
            onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
            onBlur={e => (e.target.style.borderColor = '#374151')}
          />
          {['Paris', 'Lyon', 'Marseille'].includes(filters.city) && (
            <input
              placeholder="Arrondissement / quartier"
              value={filters.neighborhood}
              onChange={e => onChange({ neighborhood: e.target.value })}
              className="w-full px-3 py-2 rounded-[8px] text-[12.5px] border outline-none mb-2"
              style={{ background: '#1F2937', borderColor: '#374151', color: '#E5E7EB' }}
              onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
              onBlur={e => (e.target.style.borderColor = '#374151')}
            />
          )}
          <div className="flex gap-1.5 flex-wrap mt-1">
            {([1, 5, 10, 20] as const).map(r => (
              <ToggleBtn key={r} label={`${r} km`} active={filters.radius === r} onClick={() => onChange({ radius: r })} />
            ))}
          </div>
        </div>

        {/* Logement */}
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[1.5px] mb-3" style={{ color: '#4B5563' }}>Logement</div>
          <div className="flex gap-1.5 mb-2.5">
            {(['', '1', '2', '3', '4+'] as const).map(r => (
              <ToggleBtn key={r} label={r || 'Tous'} active={filters.rooms === r} onClick={() => onChange({ rooms: r })} />
            ))}
          </div>
          <input
            type="number"
            placeholder="Surface min (m²)"
            value={filters.surfaceMin}
            onChange={e => onChange({ surfaceMin: e.target.value })}
            className="w-full px-3 py-2 rounded-[8px] text-[12.5px] border outline-none mb-2"
            style={{ background: '#1F2937', borderColor: '#374151', color: '#E5E7EB' }}
            onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
            onBlur={e => (e.target.style.borderColor = '#374151')}
          />
          <input
            type="date"
            value={filters.availableFrom}
            onChange={e => onChange({ availableFrom: e.target.value })}
            className="w-full px-3 py-2 rounded-[8px] text-[12.5px] border outline-none"
            style={{ background: '#1F2937', borderColor: '#374151', color: filters.availableFrom ? '#E5E7EB' : '#6B7280', colorScheme: 'dark' }}
            onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
            onBlur={e => (e.target.style.borderColor = '#374151')}
          />
        </div>

        {/* Lifestyle */}
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[1.5px] mb-3" style={{ color: '#4B5563' }}>Lifestyle</div>
          <div className="text-[11px] mb-1.5" style={{ color: '#6B7280' }}>Horaires</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {[['leve-tot', '🌅 Lève-tôt'], ['couche-tard', '🌙 Couche-tard'], ['flexible', '🔄 Flexible']].map(([v, l]) => (
              <ToggleBtn key={v} label={l} active={filters.schedule.includes(v)} onClick={() => toggleArr('schedule', v)} />
            ))}
          </div>
          <div className="text-[11px] mb-1.5" style={{ color: '#6B7280' }}>Ambiance</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {[['calme', '🤫 Calme'], ['festif', '🎉 Festif'], ['studieux', '🎯 Studieux'], ['detendu', '😎 Détendu']].map(([v, l]) => (
              <ToggleBtn key={v} label={l} active={filters.vibe.includes(v)} onClick={() => toggleArr('vibe', v)} />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <ToggleBtn label="🐱 Animaux ok"    active={filters.petsOk}    onClick={() => onChange({ petsOk: !filters.petsOk })} />
            <ToggleBtn label="🚭 Non-fumeur"    active={filters.noSmoking} onClick={() => onChange({ noSmoking: !filters.noSmoking })} />
            <ToggleBtn label="🏠 Télétravail ok" active={filters.remoteOk}  onClick={() => onChange({ remoteOk: !filters.remoteOk })} />
          </div>
        </div>

        {/* Certification */}
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[1.5px] mb-3" style={{ color: '#4B5563' }}>Certification</div>
          <label className="flex items-center gap-2.5 cursor-pointer mb-2.5">
            <input
              type="checkbox"
              checked={filters.certifiedOnly}
              onChange={e => onChange({ certifiedOnly: e.target.checked })}
              className="w-4 h-4 cursor-pointer"
              style={{ accentColor: '#4ECBA0' }}
            />
            <span className="text-[12.5px]" style={{ color: '#E5E7EB' }}>Profils certifiés uniquement</span>
          </label>
          <select
            value={filters.certMinLevel}
            onChange={e => onChange({ certMinLevel: e.target.value as Filters['certMinLevel'] })}
            className="w-full px-3 py-2 rounded-[8px] text-[12.5px] border outline-none mb-2.5 cursor-pointer"
            style={{ background: '#1F2937', borderColor: '#374151', color: filters.certMinLevel ? '#E5E7EB' : '#6B7280' }}
          >
            <option value="">Niveau minimum (tous)</option>
            <option value="1">Niveau 1 — Profil vérifié</option>
            <option value="2">Niveau 2 — Identité certifiée</option>
            <option value="3">Niveau 3 — Dossier Gold</option>
          </select>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.withGuarantor}
              onChange={e => onChange({ withGuarantor: e.target.checked })}
              className="w-4 h-4 cursor-pointer"
              style={{ accentColor: '#4ECBA0' }}
            />
            <span className="text-[12.5px]" style={{ color: '#E5E7EB' }}>Avec garant</span>
          </label>
        </div>

        {/* Tri */}
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[1.5px] mb-3" style={{ color: '#4B5563' }}>Trier par</div>
          <div className="flex flex-col gap-2">
            {([
              ['match',      '💚 Compatibilité (défaut)'],
              ['price_asc',  '💰 Prix croissant'],
              ['price_desc', '💰 Prix décroissant'],
              ['newest',     '🕐 Plus récents'],
              ['rating',     '⭐ Mieux notés'],
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

// ── Profile card ──────────────────────────────────────────────
function ProfileCard({ profile, cols }: { profile: SearchProfile; cols: number }) {
  const router = useRouter()
  return (
    <div
      className="card rounded-[16px] overflow-hidden flex flex-col"
      style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 2px 16px rgba(0,0,0,.06)' }}
    >
      {/* Emoji banner */}
      <div
        className="flex items-center justify-center text-[52px] flex-shrink-0"
        style={{ height: '120px', background: `linear-gradient(135deg, ${profile.color}30, ${profile.color}10)` }}
      >
        {profile.emoji}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Name row */}
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[15px] font-bold" style={{ color: '#111827' }}>{profile.name}, {profile.age}</span>
            {profile.certLevel > 0 && <CertificationBadge level={profile.certLevel} size="sm" />}
          </div>
          <span
            className="text-[11px] font-extrabold px-2.5 py-1 rounded-full flex-shrink-0 ml-1"
            style={{ background: '#ECFDF5', color: '#2AA87C' }}
          >
            💚 {profile.match}%
          </span>
        </div>

        {/* Sub info */}
        <div className="text-[12px] mb-2.5" style={{ color: '#6B7280' }}>
          {profile.job} · {profile.city}
        </div>
        <div className="text-[14px] font-bold mb-3" style={{ color: '#4ECBA0' }}>
          {profile.rent}€<span className="text-[11px] font-normal" style={{ color: '#9CA3AF' }}>/mois</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3.5">
          {profile.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="text-[10.5px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: '#F3F4F6', color: '#6B7280' }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          <button
            onClick={() => router.push(`/app/messages?with=${encodeURIComponent(profile.name)}`)}
            className="flex-1 py-2 rounded-full text-[12px] font-bold text-white border-none cursor-pointer transition-colors"
            style={{ background: '#4ECBA0' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2AA87C')}
            onMouseLeave={e => (e.currentTarget.style.background = '#4ECBA0')}
          >
            💬 Écrire
          </button>
          <button
            className="flex-1 py-2 rounded-full text-[12px] font-semibold border-[1.5px] cursor-pointer bg-transparent transition-all"
            style={{ borderColor: '#E5E7EB', color: '#374151' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#4ECBA0'; e.currentTarget.style.color = '#4ECBA0' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#374151' }}
          >
            👤 Profil
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
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset page when filters change
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

  // Apply text search
  function runSearch() {
    setQuery(searchInput.trim())
    setPage(1)
  }

  // Filter + sort logic (client-side; mirrors Supabase query below)
  const filtered = useMemo(() => {
    let results = ALL_PROFILES.filter(p => {
      if (query && !`${p.name} ${p.city} ${p.job} ${p.bio}`.toLowerCase().includes(query.toLowerCase())) return false
      if (p.rent < filters.budgetMin || p.rent > filters.budgetMax) return false
      if (filters.city && !p.city.toLowerCase().includes(filters.city.toLowerCase())) return false
      if (filters.schedule.length > 0 && !filters.schedule.includes(p.schedule)) return false
      if (filters.vibe.length > 0 && !filters.vibe.includes(p.vibe)) return false
      if (filters.noSmoking && !p.tags.some(t => t.includes('Non-fumeur'))) return false
      if (filters.petsOk && !p.tags.some(t => t.includes('Animaux'))) return false
      if (filters.remoteOk && !p.tags.some(t => t.includes('Télétravail'))) return false
      if (filters.certifiedOnly && p.certLevel === 0) return false
      if (filters.certMinLevel && p.certLevel < parseInt(filters.certMinLevel)) return false
      return true
    })

    // Sort
    results = [...results].sort((a, b) => {
      switch (filters.sortBy) {
        case 'price_asc':  return a.rent - b.rent
        case 'price_desc': return b.rent - a.rent
        case 'rating':
        case 'match':      return b.match - a.match
        default:           return b.match - a.match
      }
    })

    return results
  }, [query, filters])

  /*
   * Production Supabase query (wired when auth is set up):
   *
   * const supabase = createClient()
   * let q = supabase.from('profiles').select('*').eq('is_visible', true)
   * if (city) q = q.ilike('city', `%${city}%`)
   * if (budgetMax < 2000) q = q.lte('budget_max', budgetMax)
   * if (budgetMin > 300)  q = q.gte('budget_max', budgetMin)
   * if (schedule.length)  q = q.in('schedule', schedule)
   * if (vibe.length)      q = q.in('vibe', vibe)
   * const { data } = await q.limit(50)
   */

  const visible = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < filtered.length

  // Active pills
  const pills: { label: string; clear: () => void }[] = []
  if (query) pills.push({ label: `"${query}"`, clear: () => { setQuery(''); setSearchInput('') } })
  if (filters.budgetMin > 300 || filters.budgetMax < 2000)
    pills.push({ label: `${filters.budgetMin}€ — ${filters.budgetMax === 2000 ? '2000€+' : filters.budgetMax + '€'}`, clear: () => patchFilters({ budgetMin: 300, budgetMax: 2000 }) })
  if (filters.city)
    pills.push({ label: `📍 ${filters.city}`, clear: () => patchFilters({ city: '', neighborhood: '' }) })
  filters.schedule.forEach(s => {
    const label = s === 'leve-tot' ? '🌅 Lève-tôt' : s === 'couche-tard' ? '🌙 Couche-tard' : '🔄 Flexible'
    pills.push({ label, clear: () => patchFilters({ schedule: filters.schedule.filter(x => x !== s) }) })
  })
  filters.vibe.forEach(v => {
    const label = v === 'calme' ? '🤫 Calme' : v === 'festif' ? '🎉 Festif' : v === 'studieux' ? '🎯 Studieux' : '😎 Détendu'
    pills.push({ label, clear: () => patchFilters({ vibe: filters.vibe.filter(x => x !== v) }) })
  })
  if (filters.noSmoking) pills.push({ label: '🚭 Non-fumeur', clear: () => patchFilters({ noSmoking: false }) })
  if (filters.petsOk)    pills.push({ label: '🐱 Animaux ok', clear: () => patchFilters({ petsOk: false }) })
  if (filters.remoteOk)  pills.push({ label: '🏠 Télétravail ok', clear: () => patchFilters({ remoteOk: false }) })
  if (filters.certifiedOnly) pills.push({ label: '✓ Certifiés', clear: () => patchFilters({ certifiedOnly: false }) })
  if (filters.certMinLevel)  pills.push({ label: `Niveau ${filters.certMinLevel}+`, clear: () => patchFilters({ certMinLevel: '' }) })

  const gridCols = showFilters ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'

  return (
    <>
      <Topbar title="Recherche" />
      <div className="flex flex-1 overflow-hidden">

        {/* ── Main content ────────────────────────────────── */}
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
                  placeholder="Ville, quartier, profession, mot-clé..."
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

          <div className="px-6 pt-4 pb-8 max-w-[900px]">
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
                {filtered.length === 0
                  ? 'Aucun résultat'
                  : <><strong style={{ color: '#111827' }}>{filtered.length} profil{filtered.length > 1 ? 's' : ''}</strong> correspondent à votre recherche</>
                }
              </div>
              <div className="text-[11.5px]" style={{ color: '#9CA3AF' }}>
                Trié par : {filters.sortBy === 'match' ? '💚 Compatibilité' : filters.sortBy === 'price_asc' ? '💰 Prix ↑' : filters.sortBy === 'price_desc' ? '💰 Prix ↓' : filters.sortBy === 'newest' ? '🕐 Récents' : '⭐ Notes'}
              </div>
            </div>

            {/* Results grid */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-[52px] mb-4">🔍</div>
                <h3 className="text-[18px] mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
                  Aucun profil trouvé
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
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: gridCols }}
                >
                  {visible.map(p => (
                    <ProfileCard key={p.id} profile={p} cols={showFilters ? 2 : 3} />
                  ))}
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
                      Voir plus ({filtered.length - visible.length} profils restants)
                    </button>
                  </div>
                )}

                {!hasMore && filtered.length > PAGE_SIZE && (
                  <div className="text-center mt-8 text-[12.5px]" style={{ color: '#9CA3AF' }}>
                    Tous les {filtered.length} profils affichés
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Filters panel ────────────────────────────────── */}
        {showFilters && (
          <FiltersPanel filters={filters} onChange={patchFilters} onReset={resetAll} />
        )}

      </div>
    </>
  )
}
