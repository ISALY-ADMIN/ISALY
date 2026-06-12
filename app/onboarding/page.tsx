'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { MatchingData } from '@/lib/matching'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingData {
  role: string
  first_name: string; last_name: string; age: string
  city: string; profession: string; status: string
  budget_min: number; budget_max: number
  move_in: string; duration: string; zones: string[]
  wake_time: number; sleep_time: number; home_presence: number
  remote_work: string; party_frequency: string; guests_frequency: string; cooking_frequency: string
  cleanliness: number; noise_tolerance: number; personal_space: number
  shared_cooking: string; cleaning_style: string
  introversion: number
  coloc_relation: string; conflict_style: string; communication: string
  is_smoker: string; accepts_smoker: string; has_pet: string; accepts_pet: string
  drinks_alcohol: string; diet: string; gender_preference: string
  interests: Record<string, number>; non_negotiables: string[]
}

const DEFAULT: OnboardingData = {
  role: '', first_name: '', last_name: '', age: '', city: '', profession: '', status: '',
  budget_min: 400, budget_max: 1000,
  move_in: '', duration: '', zones: [],
  wake_time: 7, sleep_time: 23, home_presence: 50,
  remote_work: '', party_frequency: '', guests_frequency: '', cooking_frequency: '',
  cleanliness: 5, noise_tolerance: 5, personal_space: 5,
  shared_cooking: '', cleaning_style: '',
  introversion: 5,
  coloc_relation: '', conflict_style: '', communication: '',
  is_smoker: 'non', accepts_smoker: 'indifférent', has_pet: 'non', accepts_pet: 'indifférent',
  drinks_alcohol: 'indifférent', diet: '', gender_preference: 'Peu importe',
  interests: {}, non_negotiables: [],
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FREQ_OPTS = ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Très souvent']
const STATUS_OPTS = ['Étudiant', 'Salarié CDI', 'Salarié CDD', 'Freelance', 'Auto-entrepreneur', 'Autre']
const FREQ_MAP: Record<string, number> = { 'Jamais': 0, 'Rarement': 0.25, 'Parfois': 0.5, 'Souvent': 0.75, 'Très souvent': 1 }
const NON_NEG_VEC: Record<string, string> = { cleanliness: 'proprete', silence: 'bruit', schedules: 'heure_coucher', privacy: 'besoin_espace' }

const INTEREST_ITEMS = [
  { key: 'sport',    em: '🏃', lbl: 'Sport' },
  { key: 'music',    em: '🎵', lbl: 'Musique' },
  { key: 'gaming',   em: '🎮', lbl: 'Gaming' },
  { key: 'travel',   em: '🌍', lbl: 'Voyages' },
  { key: 'art',      em: '🎨', lbl: 'Art & Culture' },
  { key: 'cooking',  em: '🍳', lbl: 'Cuisine' },
  { key: 'reading',  em: '📚', lbl: 'Lecture' },
  { key: 'cinema',   em: '🎬', lbl: 'Cinéma' },
  { key: 'wellness', em: '🧘', lbl: 'Bien-être' },
  { key: 'tech',     em: '💻', lbl: 'Tech' },
  { key: 'nature',   em: '🌿', lbl: 'Nature' },
  { key: 'nightlife',em: '🎭', lbl: 'Sorties' },
]

const NON_NEG_OPTS = [
  { key: 'cleanliness', lbl: '🧹 Propreté' },
  { key: 'silence',     lbl: '🔇 Silence' },
  { key: 'schedules',   lbl: '🕐 Horaires' },
  { key: 'smoking',     lbl: '🚬 Tabac' },
  { key: 'pets',        lbl: '🐾 Animaux' },
  { key: 'budget',      lbl: '💰 Budget' },
  { key: 'privacy',     lbl: '🚪 Espace perso' },
  { key: 'gender',      lbl: '👥 Genre' },
]

const STEP_LABELS = [
  'Qui es-tu ?',
  'Ta recherche',
  'Ton rythme de vie',
  'La vie commune',
  'Ta personnalité',
  'Tes contraintes',
  'Passions & non-négociables',
]
const TOTAL = 7

// ─── Shared UI components ─────────────────────────────────────────────────────

function FieldLabel({ children, mt }: { children: string; mt?: boolean }) {
  return (
    <div
      className={`text-[11px] font-extrabold uppercase tracking-[1.5px] mb-2${mt ? ' mt-4' : ''}`}
      style={{ color: '#9CA3AF' }}
    >
      {children}
    </div>
  )
}

function TxtInput({
  placeholder, value, onChange, type = 'text',
}: {
  placeholder: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <input
      type={type} placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3.5 py-2.5 border-[1.5px] rounded-[9px] text-[13px] outline-none"
      style={{ borderColor: '#E5E7EB' }}
      onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
      onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
    />
  )
}

function Pills({ opts, value, onSelect }: {
  opts: string[]; value: string | string[]; onSelect: (v: string) => void
}) {
  function isSelected(v: string) {
    return Array.isArray(value) ? value.includes(v) : value === v
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {opts.map(opt => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          className="px-3 py-1.5 rounded-full text-[12.5px] font-medium border cursor-pointer transition-all"
          style={{
            background: isSelected(opt) ? '#ECFDF5' : '#F9FAFB',
            borderColor: isSelected(opt) ? '#4ECBA0' : '#E5E7EB',
            color: isSelected(opt) ? '#059669' : '#374151',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function SliderField({ label, value, min, max, step = 1, onChange, fmt, left, right }: {
  label: string; value: number; min: number; max: number; step?: number
  onChange: (v: number) => void; fmt?: (v: number) => string; left?: string; right?: string
}) {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-[13px] mb-1.5">
        <span style={{ color: '#6B7280' }}>{label}</span>
        <span className="font-bold" style={{ color: '#2AA87C' }}>{fmt ? fmt(value) : value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full" style={{ accentColor: '#4ECBA0' }}
      />
      {(left || right) && (
        <div className="flex justify-between text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>
          <span>{left}</span><span>{right}</span>
        </div>
      )}
    </div>
  )
}

function Toggle3({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  const opts: Array<[string, string, string]> = [
    ['oui', '#059669', '#ECFDF5'],
    ['non', '#DC2626', '#FEF2F2'],
    ['indifférent', '#6B7280', '#F3F4F6'],
  ]
  return (
    <div className="flex items-center justify-between py-2.5 px-1" style={{ borderBottom: '1px solid #F3F4F6' }}>
      <span className="text-[13px] flex-1 mr-2" style={{ color: '#374151' }}>{label}</span>
      <div className="flex gap-1 flex-shrink-0">
        {opts.map(([v, c, bg]) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className="px-2 py-0.5 rounded-full text-[11px] font-semibold border cursor-pointer transition-all"
            style={{
              background: value === v ? bg : 'transparent',
              borderColor: value === v ? c : '#E5E7EB',
              color: value === v ? c : '#9CA3AF',
            }}
          >
            {v === 'indifférent' ? '~' : v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Step components ──────────────────────────────────────────────────────────

type Upd = <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void
type TogglePill = (k: 'zones' | 'non_negotiables', v: string, max?: number) => void

function Step1({ d, upd }: { d: OnboardingData; upd: Upd }) {
  return (
    <div>
      <FieldLabel>Je suis…</FieldLabel>
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {[{ em: '🔍', lbl: 'Locataire', val: 'locataire' }, { em: '🏠', lbl: 'Loueur', val: 'loueur' }].map(r => (
          <button
            key={r.val}
            onClick={() => upd('role', r.val)}
            className="p-4 rounded-[11px] border-2 cursor-pointer transition-all text-center"
            style={{ borderColor: d.role === r.val ? '#4ECBA0' : '#E5E7EB', background: d.role === r.val ? '#ECFDF5' : '#fff' }}
          >
            <div className="text-[26px] mb-1">{r.em}</div>
            <div className="text-[13px] font-bold">{r.lbl}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        <TxtInput placeholder="Prénom" value={d.first_name} onChange={v => upd('first_name', v)} />
        <TxtInput placeholder="Nom" value={d.last_name} onChange={v => upd('last_name', v)} />
      </div>
      <div className="grid grid-cols-2 gap-2.5 mb-2.5">
        <TxtInput placeholder="Âge" value={d.age} onChange={v => upd('age', v)} type="number" />
        <TxtInput placeholder="Ville" value={d.city} onChange={v => upd('city', v)} />
      </div>
      <div className="mb-3.5">
        <TxtInput placeholder="Profession" value={d.profession} onChange={v => upd('profession', v)} />
      </div>

      <FieldLabel>Statut</FieldLabel>
      <Pills opts={STATUS_OPTS} value={d.status} onSelect={v => upd('status', v)} />
    </div>
  )
}

function Step2({ d, upd, togglePill }: { d: OnboardingData; upd: Upd; togglePill: TogglePill }) {
  const [zoneInput, setZoneInput] = useState('')

  function addZone() {
    if (zoneInput.trim()) {
      togglePill('zones', zoneInput.trim())
      setZoneInput('')
    }
  }

  return (
    <div>
      <FieldLabel>Budget mensuel</FieldLabel>
      <div className="rounded-[12px] p-4 mb-4" style={{ background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
        <div className="text-center text-[15px] font-bold mb-3" style={{ color: '#2AA87C' }}>
          Entre {d.budget_min}€ et {d.budget_max}€/mois
        </div>
        <div className="mb-2.5">
          <div className="flex justify-between text-[11.5px] mb-1" style={{ color: '#6B7280' }}>
            <span>Minimum</span><span className="font-semibold">{d.budget_min}€</span>
          </div>
          <input
            type="range" min={300} max={2000} step={50} value={d.budget_min}
            onChange={e => upd('budget_min', Math.min(Number(e.target.value), d.budget_max - 50))}
            className="w-full" style={{ accentColor: '#4ECBA0' }}
          />
        </div>
        <div>
          <div className="flex justify-between text-[11.5px] mb-1" style={{ color: '#6B7280' }}>
            <span>Maximum</span><span className="font-semibold">{d.budget_max}€</span>
          </div>
          <input
            type="range" min={300} max={2000} step={50} value={d.budget_max}
            onChange={e => upd('budget_max', Math.max(Number(e.target.value), d.budget_min + 50))}
            className="w-full" style={{ accentColor: '#4ECBA0' }}
          />
        </div>
      </div>

      <FieldLabel>Date d'emménagement</FieldLabel>
      <Pills
        opts={["Dès maintenant", "Dans 1 mois", "Dans 2-3 mois", "Date précise"]}
        value={d.move_in}
        onSelect={v => upd('move_in', v)}
      />

      <FieldLabel mt>Durée recherchée</FieldLabel>
      <Pills
        opts={["Court terme -6 mois", "Moyen terme 6-12 mois", "Long terme +1 an"]}
        value={d.duration}
        onSelect={v => upd('duration', v)}
      />

      <FieldLabel mt>Zones souhaitées</FieldLabel>
      <div className="flex gap-2 mb-2">
        <input
          value={zoneInput}
          onChange={e => setZoneInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addZone()}
          placeholder="Ex : Lyon 2e, Part-Dieu… (Entrée)"
          className="flex-1 px-3 py-2 rounded-[9px] text-[13px] border outline-none"
          style={{ borderColor: '#E5E7EB' }}
          onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
          onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
        />
        <button
          onClick={addZone}
          className="px-3 py-2 rounded-[9px] text-[13px] font-bold text-white border-none cursor-pointer"
          style={{ background: '#4ECBA0' }}
        >
          +
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {d.zones.map(z => (
          <span
            key={z}
            className="px-2.5 py-1 rounded-full text-[12px] font-medium flex items-center gap-1"
            style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}
          >
            {z}
            <button
              onClick={() => togglePill('zones', z)}
              className="border-none bg-transparent cursor-pointer ml-0.5 text-[10px] leading-none"
              style={{ color: '#059669' }}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}

function Step3({ d, upd }: { d: OnboardingData; upd: Upd }) {
  function fmtHour(h: number) { return `${h > 24 ? h - 24 : h}h` }
  function fmtPct(v: number) {
    return v < 30 ? `${v}% — Rarement` : v < 70 ? `${v}% — Souvent` : `${v}% — Presque toujours`
  }
  return (
    <div>
      <SliderField label="Je me lève vers…" value={d.wake_time} min={5} max={12} onChange={v => upd('wake_time', v)} fmt={fmtHour} left="5h" right="12h" />
      <SliderField label="Je me couche vers…" value={d.sleep_time} min={21} max={28} onChange={v => upd('sleep_time', v)} fmt={v => fmtHour(v > 24 ? v - 24 : v)} left="21h" right="4h" />
      <SliderField label="Je suis chez moi…" value={d.home_presence} min={0} max={100} onChange={v => upd('home_presence', v)} fmt={fmtPct} left="Rarement" right="Toujours" />
      <FieldLabel mt>Télétravail</FieldLabel>
      <Pills opts={FREQ_OPTS} value={d.remote_work} onSelect={v => upd('remote_work', v)} />
      <FieldLabel mt>Soirées organisées chez moi</FieldLabel>
      <Pills opts={FREQ_OPTS} value={d.party_frequency} onSelect={v => upd('party_frequency', v)} />
      <FieldLabel mt>Invités à dormir</FieldLabel>
      <Pills opts={FREQ_OPTS} value={d.guests_frequency} onSelect={v => upd('guests_frequency', v)} />
      <FieldLabel mt>Cuisine à la maison</FieldLabel>
      <Pills opts={FREQ_OPTS} value={d.cooking_frequency} onSelect={v => upd('cooking_frequency', v)} />
    </div>
  )
}

function Step4({ d, upd }: { d: OnboardingData; upd: Upd }) {
  return (
    <div>
      <SliderField label="Propreté" value={d.cleanliness} min={1} max={10} onChange={v => upd('cleanliness', v)} left="🙈 Détendu" right="🧹 Très ordonné" />
      <SliderField label="Tolérance au bruit" value={d.noise_tolerance} min={1} max={10} onChange={v => upd('noise_tolerance', v)} left="🔇 Silence" right="🔊 Bruit ok" />
      <SliderField label="Espace perso" value={d.personal_space} min={1} max={10} onChange={v => upd('personal_space', v)} left="🤝 Sociable" right="🚪 Intimité" />
      <FieldLabel mt>Cuisine partagée</FieldLabel>
      <Pills opts={['Jamais', 'Parfois', 'Souvent', 'Toujours']} value={d.shared_cooking} onSelect={v => upd('shared_cooking', v)} />
      <FieldLabel mt>Ménage commun</FieldLabel>
      <Pills opts={['Chacun son tour', 'Planning fixe', 'Au feeling']} value={d.cleaning_style} onSelect={v => upd('cleaning_style', v)} />
    </div>
  )
}

function Step5({ d, upd }: { d: OnboardingData; upd: Upd }) {
  return (
    <div>
      <FieldLabel>Je suis plutôt…</FieldLabel>
      <div className="mb-5">
        <div className="flex justify-between text-[13px] mb-2" style={{ color: '#374151' }}>
          <span>🤫 Introverti</span><span>Extraverti 🗣️</span>
        </div>
        <input
          type="range" min={1} max={10} value={d.introversion}
          onChange={e => upd('introversion', Number(e.target.value))}
          className="w-full" style={{ accentColor: '#4ECBA0' }}
        />
        <div className="text-center text-[12px] mt-1" style={{ color: '#6B7280' }}>
          {d.introversion <= 3 ? 'Plutôt introverti' : d.introversion >= 8 ? 'Plutôt extraverti' : 'Entre les deux'}
        </div>
      </div>

      <FieldLabel>Relation idéale avec le coloc</FieldLabel>
      <Pills opts={['On se croise', 'Cordiale', 'Amis', 'Comme une famille']} value={d.coloc_relation} onSelect={v => upd('coloc_relation', v)} />
      <FieldLabel mt>Gestion des conflits</FieldLabel>
      <Pills opts={["J'évite", 'Discussion calme', 'Direct', "Je m'exprime franchement"]} value={d.conflict_style} onSelect={v => upd('conflict_style', v)} />
      <FieldLabel mt>Communication préférée</FieldLabel>
      <Pills opts={['Messages', "À l'oral", 'Réunion coloc', 'Post-it 😄']} value={d.communication} onSelect={v => upd('communication', v)} />
    </div>
  )
}

function Step6({ d, upd }: { d: OnboardingData; upd: Upd }) {
  const dietActive = !!d.diet && d.diet !== 'non'
  const dietType = dietActive && d.diet !== 'oui' ? d.diet : ''

  return (
    <div>
      <p className="text-[12.5px] mb-3" style={{ color: '#6B7280' }}>
        Ces critères bloquent certains matchs
      </p>
      <div className="rounded-[12px] border overflow-hidden mb-4" style={{ borderColor: '#F3F4F6' }}>
        <Toggle3 label="🚬 Je suis fumeur" value={d.is_smoker} onChange={v => upd('is_smoker', v)} />
        <Toggle3 label="🚬 Mon coloc peut fumer" value={d.accepts_smoker} onChange={v => upd('accepts_smoker', v)} />
        <Toggle3 label="🐾 J'ai un animal" value={d.has_pet} onChange={v => upd('has_pet', v)} />
        <Toggle3 label="🐾 Mon coloc peut avoir un animal" value={d.accepts_pet} onChange={v => upd('accepts_pet', v)} />
        <Toggle3 label="🍺 Consommation d'alcool régulière" value={d.drinks_alcohol} onChange={v => upd('drinks_alcohol', v)} />
        <div>
          <Toggle3
            label="🥗 Régime alimentaire particulier"
            value={dietActive ? 'oui' : 'non'}
            onChange={v => upd('diet', v === 'oui' ? 'oui' : '')}
          />
          {dietActive && (
            <div className="px-3 pb-3 pt-2" style={{ background: '#FAFAFA' }}>
              <Pills
                opts={['Végé', 'Vegan', 'Halal', 'Casher', 'Autre']}
                value={dietType}
                onSelect={v => upd('diet', v)}
              />
            </div>
          )}
        </div>
      </div>

      <FieldLabel>Genre du coloc souhaité</FieldLabel>
      <Pills
        opts={['Peu importe', 'Femme', 'Homme']}
        value={d.gender_preference}
        onSelect={v => upd('gender_preference', v)}
      />
    </div>
  )
}

function Step7({ d, cycleInterest, togglePill }: {
  d: OnboardingData; cycleInterest: (k: string) => void; togglePill: TogglePill
}) {
  return (
    <div>
      <FieldLabel>Mes passions</FieldLabel>
      <p className="text-[11.5px] mb-3" style={{ color: '#9CA3AF' }}>
        Clic = j'aime · 2× clic = passionné ❤️
      </p>
      <div className="grid grid-cols-4 gap-2 mb-5">
        {INTEREST_ITEMS.map(item => {
          const val = d.interests[item.key] ?? 0
          return (
            <button
              key={item.key}
              onClick={() => cycleInterest(item.key)}
              className="p-2.5 rounded-[11px] border-2 cursor-pointer transition-all text-center"
              style={{
                borderColor: val > 0 ? '#4ECBA0' : '#E5E7EB',
                background: val === 2 ? '#ECFDF5' : val === 1 ? '#F0FDF4' : '#F9FAFB',
              }}
            >
              <div className="text-[22px] mb-0.5">{item.em}</div>
              <div className="text-[10.5px] font-medium leading-tight">{item.lbl}</div>
              {val === 2 && <div className="text-[9px] mt-0.5" style={{ color: '#059669' }}>❤️</div>}
            </button>
          )
        })}
      </div>

      <FieldLabel>Mes non-négociables (max 3)</FieldLabel>
      <p className="text-[11.5px] mb-2.5" style={{ color: '#9CA3AF' }}>
        Ces critères sont multipliés ×4 dans l'algorithme
      </p>
      <div className="flex flex-wrap gap-2">
        {NON_NEG_OPTS.map(opt => {
          const sel = d.non_negotiables.includes(opt.key)
          const disabled = !sel && d.non_negotiables.length >= 3
          return (
            <button
              key={opt.key}
              onClick={() => !disabled && togglePill('non_negotiables', opt.key, 3)}
              className="px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition-all"
              style={{
                background: sel ? '#FEF3C7' : '#F9FAFB',
                borderColor: sel ? '#F59E0B' : '#E5E7EB',
                color: sel ? '#B45309' : '#374151',
                opacity: disabled ? 0.4 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {opt.lbl}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Matching data builder ────────────────────────────────────────────────────

function buildMatchingData(d: OnboardingData): MatchingData {
  const socMap: Record<string, number> = { 'On se croise': 0.1, 'Cordiale': 0.4, 'Amis': 0.75, 'Comme une famille': 1.0 }
  const confMap: Record<string, number> = { "J'évite": 0.2, 'Discussion calme': 0.7, 'Direct': 0.8, "Je m'exprime franchement": 0.9 }
  const commMap: Record<string, number> = { 'Messages': 0.6, "À l'oral": 0.75, 'Réunion coloc': 0.85, 'Post-it 😄': 0.5 }
  const genderMap: Record<string, 'homme' | 'femme' | 'mixte'> = { 'Femme': 'femme', 'Homme': 'homme', 'Peu importe': 'mixte' }

  return {
    budget_min: d.budget_min,
    genre_preference: genderMap[d.gender_preference] ?? 'mixte',
    lifestyle: {
      proprete:           (d.cleanliness - 1) / 9,
      bruit:              (d.noise_tolerance - 1) / 9,
      heure_coucher:      (d.sleep_time - 21) / 7,
      frequence_soirees:  FREQ_MAP[d.party_frequency] ?? 0.5,
      frequence_invites:  FREQ_MAP[d.guests_frequency] ?? 0.5,
      cuisine:            FREQ_MAP[d.cooking_frequency] ?? 0.5,
      teletravail:        FREQ_MAP[d.remote_work] ?? 0.5,
      temps_domicile:     d.home_presence / 100,
    },
    personality: {
      introversion:       (d.introversion - 1) / 9,
      sociabilite:        socMap[d.coloc_relation] ?? 0.5,
      tolerance_conflit:  confMap[d.conflict_style] ?? 0.65,
      communication:      commMap[d.communication] ?? 0.65,
      besoin_espace:      (d.personal_space - 1) / 9,
    },
    constraints: {
      fumeur:         d.is_smoker === 'oui',
      accepte_fumeurs: d.accepts_smoker !== 'non',
      animaux:        d.has_pet === 'oui',
      accepte_animaux: d.accepts_pet !== 'non',
      alcool:         d.drinks_alcohol === 'oui',
      regime:         d.diet === 'Végé' ? 'vegetarien'
        : d.diet === 'Vegan' ? 'vegan'
        : (d.diet && d.diet !== 'oui' && d.diet !== 'non') ? 'autre'
        : 'omnivore',
    },
    interests: {
      sport:   (d.interests.sport   ?? 0) / 2,
      musique: (d.interests.music   ?? 0) / 2,
      gaming:  (d.interests.gaming  ?? 0) / 2,
      voyages: (d.interests.travel  ?? 0) / 2,
      culture: Math.max(
        d.interests.art     ?? 0,
        d.interests.cooking ?? 0,
        d.interests.reading ?? 0,
        d.interests.cinema  ?? 0
      ) / 2,
    },
    non_negociables: d.non_negotiables.map(k => NON_NEG_VEC[k] ?? k).filter(Boolean),
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [d, setD] = useState<OnboardingData>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [resumeBanner, setResumeBanner] = useState(false)
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load: check DB draft first (if logged in), then localStorage
  useEffect(() => {
    async function loadDraft() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_draft, onboarding_step, onboarding_completed')
          .eq('id', user.id)
          .single()

        if (profile?.onboarding_completed) {
          router.push('/app/swipe')
          return
        }

        if (profile?.onboarding_draft && profile.onboarding_step > 0) {
          const draft = profile.onboarding_draft as Record<string, unknown>
          const localRaw = (() => { try { return localStorage.getItem('isaly_onboarding_data') } catch { return null } })()
          const localStep = (() => { try { const p = JSON.parse(localRaw ?? '{}'); return p.onboarding_step ?? 0 } catch { return 0 } })()
          if (profile.onboarding_step >= localStep) {
            setD({ ...DEFAULT, ...(draft as Partial<OnboardingData>) })
            setStep(profile.onboarding_step)
            setResumeBanner(true)
            setTimeout(() => setResumeBanner(false), 4000)
            return
          }
        }
      }

      // Fallback: localStorage
      let raw: string | null = null
      try { raw = localStorage.getItem('isaly_onboarding_data') } catch {}
      if (!raw) return
      let saved: Record<string, unknown> = {}
      try { saved = JSON.parse(raw) } catch { return }
      if (saved.onboarding_completed) {
        if (user) {
          const supabase = createClient()
          await supabase.from('profiles').upsert({
            id: user.id, email: user.email,
            first_name: (saved.first_name as string) || null,
            last_name: (saved.last_name as string) || null,
            role: (saved.role as string) || null,
            city: (saved.city as string) || null,
            budget_max: typeof saved.budget_max === 'number' ? saved.budget_max : null,
            onboarding_completed: true,
            matching_data: saved.matching_data ?? null,
          })
          try { localStorage.removeItem('isaly_onboarding_data') } catch {}
          router.push('/app/swipe')
        }
        return
      }
      if (saved.onboarding_step && typeof saved.onboarding_step === 'number' && saved.onboarding_step > 1) {
        setD({ ...DEFAULT, ...(saved as Partial<OnboardingData>) })
        setStep(saved.onboarding_step as number)
      }
    }
    loadDraft()
  }, [router])

  // Debounced save to DB + localStorage after each step update
  function saveDraftToServer(data: OnboardingData, currentStep: number) {
    if (draftSaveTimer.current) clearTimeout(draftSaveTimer.current)
    draftSaveTimer.current = setTimeout(async () => {
      try { localStorage.setItem('isaly_onboarding_data', JSON.stringify({ ...data, onboarding_step: currentStep })) } catch {}
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('profiles').update({
        onboarding_draft: { ...data, onboarding_step: currentStep } as Record<string, unknown>,
        onboarding_step: currentStep,
      }).eq('id', user.id)
    }, 800)
  }

  function upd<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setD(prev => {
      const next = { ...prev, [key]: value }
      saveDraftToServer(next, step)
      return next
    })
  }

  function togglePill(key: 'zones' | 'non_negotiables', val: string, max?: number) {
    setD(prev => {
      const arr = prev[key] as string[]
      const has = arr.includes(val)
      if (has) return { ...prev, [key]: arr.filter(v => v !== val) }
      if (max !== undefined && arr.length >= max) return prev
      return { ...prev, [key]: [...arr, val] }
    })
  }

  function cycleInterest(key: string) {
    setD(prev => ({
      ...prev,
      interests: { ...prev.interests, [key]: ((prev.interests[key] ?? 0) + 1) % 3 },
    }))
  }

  async function next() {
    const nextStep = step < TOTAL ? step + 1 : step
    try { localStorage.setItem('isaly_onboarding_data', JSON.stringify({ ...d, onboarding_step: nextStep })) } catch {}
    if (step < TOTAL) {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        supabase.from('profiles').update({
          onboarding_draft: { ...d, onboarding_step: nextStep } as Record<string, unknown>,
          onboarding_step: nextStep,
        }).eq('id', user.id).then(() => {})
      }
      setStep(s => s + 1)
      return
    }
    await finish()
  }

  async function finish() {
    setSaving(true)
    const matching_data = buildMatchingData(d)
    const payload = {
      first_name:  d.first_name  || null,
      last_name:   d.last_name   || null,
      role:        d.role        || null,
      city:        d.city        || null,
      budget_max:  d.budget_max,
      onboarding_completed: true,
      matching_data,
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Already logged in — save directly and clear draft
      await supabase.from('profiles').upsert({
        id: user.id, email: user.email, ...payload,
        onboarding_draft: null, onboarding_step: 0,
      })
      try { localStorage.removeItem('isaly_onboarding_data') } catch {}
      router.push('/app/swipe')
    } else {
      // Not yet logged in — save to localStorage and go to register
      try {
        localStorage.setItem('isaly_onboarding_data', JSON.stringify({ ...d, ...payload, matching_data }))
      } catch {}
      router.push('/auth/register')
    }
    setSaving(false)
  }

  const stepProps = { d, upd }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{ background: 'linear-gradient(135deg, #edfaf4, #f7f8fa)' }}
    >
      <div
        className="bg-white rounded-[24px] w-full"
        style={{ padding: '36px 40px', boxShadow: '0 8px 36px rgba(0,0,0,.13)', maxWidth: '560px' }}
      >
        {/* Resume banner */}
        {resumeBanner && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#10B981', textAlign: 'center' }}>
            On reprend où tu t'étais arrêté ✓
          </div>
        )}

        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Image
            src="/LOGO_ISALY.png" alt="ISALY" height={30} width={95}
            style={{ width: 'auto', height: '30px', objectFit: 'contain' }}
          />
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-3.5">
          {Array.from({ length: TOTAL }, (_, i) => (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full transition-all duration-300"
              style={{ background: i < step ? '#4ECBA0' : '#E5E7EB' }}
            />
          ))}
        </div>

        <div className="text-[10.5px] font-extrabold uppercase mb-1.5" style={{ letterSpacing: '2px', color: '#2AA87C' }}>
          ÉTAPE {step} / {TOTAL}
        </div>
        <h2 className="text-[24px] mb-4" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
          {STEP_LABELS[step - 1]}
        </h2>

        {/* Scrollable step content */}
        <div className="overflow-y-auto" style={{ maxHeight: '420px', paddingRight: '2px' }}>
          {step === 1 && <Step1 {...stepProps} />}
          {step === 2 && <Step2 d={d} upd={upd} togglePill={togglePill} />}
          {step === 3 && <Step3 {...stepProps} />}
          {step === 4 && <Step4 {...stepProps} />}
          {step === 5 && <Step5 {...stepProps} />}
          {step === 6 && <Step6 {...stepProps} />}
          {step === 7 && <Step7 d={d} cycleInterest={cycleInterest} togglePill={togglePill} />}
        </div>

        {/* Navigation */}
        <div className="flex gap-2.5 mt-5">
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 rounded-full text-[13.5px] font-semibold border-[1.5px] cursor-pointer bg-transparent"
              style={{ borderColor: '#E5E7EB', color: '#374151' }}
            >
              ← Retour
            </button>
          )}
          <button
            onClick={next}
            disabled={saving}
            className="py-3 rounded-full text-[13.5px] font-semibold text-white border-none cursor-pointer transition-colors disabled:opacity-60"
            style={{ background: '#4ECBA0', flex: step > 1 ? 2 : 1 }}
            onMouseEnter={e => !saving && (e.currentTarget.style.background = '#2AA87C')}
            onMouseLeave={e => !saving && (e.currentTarget.style.background = '#4ECBA0')}
          >
            {saving ? 'Sauvegarde…' : step < TOTAL ? 'Continuer →' : 'Créer mon profil 🚀'}
          </button>
        </div>
      </div>
    </div>
  )
}
