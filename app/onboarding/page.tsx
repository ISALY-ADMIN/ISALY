'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import MatchingQuiz from '@/components/quiz/MatchingQuiz'
import type { MatchingData } from '@/lib/matching'
import Emoji from '@/components/ui/Emoji'
import { ROLE_CHOICES } from '@/lib/roles'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingData {
  role: string
  first_name: string; last_name: string; age: string
  city: string; profession: string; status: string
  budget_min: number; budget_max: number
  move_in: string; duration: string; zones: string[]
  quiz_answers: Record<string, number>
  // ── Branche loueur (role = 'loueur') ──
  // Ces trois réponses remplacent entièrement l'étape « Ta recherche » et le
  // test de compatibilité, qui n'ont aucun sens pour quelqu'un qui loue un bien.
  owner_timing: string
  owner_cities: string[]
  owner_property_type: string
}

const DEFAULT: OnboardingData = {
  role: '',
  first_name: '', last_name: '', age: '', city: '', profession: '', status: '',
  budget_min: 400, budget_max: 1000,
  move_in: '', duration: '', zones: [],
  quiz_answers: {},
  owner_timing: '', owner_cities: [], owner_property_type: '',
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTS = ['Étudiant', 'Salarié CDI', 'Salarié CDD', 'Freelance', 'Auto-entrepreneur', 'Autre']

// Le parcours diverge après la question de rôle de l'étape 1 : un locataire
// passe par sa recherche puis le test de compatibilité (3 étapes), un loueur
// répond à 3 questions sur son bien et part directement créer son annonce
// (2 étapes). stepCountFor() borne la reprise d'un brouillon selon le rôle.
const STEP_LABELS_LOCATAIRE = [
  'Qui es-tu ?',
  'Ta recherche',
  'Ton test de compatibilité',
]
const STEP_LABELS_LOUEUR = [
  'Qui es-tu ?',
  'Ton projet de location',
]

// Message de récompense affiché à la fin de chaque étape
const STEP_REWARDS_LOCATAIRE = [
  'Super ! Ton profil est en place 🎉',
  'Ta recherche est enregistrée ✨',
  'Ton score de compatibilité est calculé ✨',
]
const STEP_REWARDS_LOUEUR = [
  'Super ! Ton profil est en place 🎉',
  'Ton espace loueur est prêt 🏠',
]

const OWNER_TIMING_OPTS = [
  'J’ai un bien à publier maintenant',
  'Bientôt, d’ici quelques semaines',
  'Je regarde comment ça marche',
]
const OWNER_TYPE_OPTS = [
  'Appartement en colocation',
  'Maison en colocation',
  'Studio / T1',
  'Plusieurs biens',
]

/** Barre de progression gamifiée : cercles ✓ + segments animés (spring). */
function ProgressSteps({ step, total }: { step: number; total: number }) {
  const TOTAL = total
  return (
    <div className="flex items-center mb-3.5">
      {Array.from({ length: TOTAL }, (_, i) => {
        const done = i < step - 1
        const current = i === step - 1
        return (
          <div key={i} className="flex items-center" style={{ flex: i < TOTAL - 1 ? 1 : 'none' }}>
            <div
              className="flex items-center justify-center rounded-full flex-shrink-0 transition-colors duration-300"
              style={{
                width: 24, height: 24, fontSize: 11.5, fontWeight: 800,
                background: done ? '#10B981' : current ? '#ECFDF5' : '#F3F4F6',
                border: `2px solid ${done || current ? '#10B981' : '#E5E7EB'}`,
                color: done ? '#fff' : current ? '#059669' : '#9CA3AF',
              }}
            >
              {done ? <Check size={13} strokeWidth={3} /> : i + 1}
            </div>
            {i < TOTAL - 1 && (
              <div className="flex-1 mx-1.5 rounded-full overflow-hidden" style={{ height: 3, background: '#E5E7EB' }}>
                <motion.div
                  initial={false}
                  animate={{ scaleX: done ? 1 : 0 }}
                  transition={{ type: 'spring', stiffness: 180, damping: 26 }}
                  style={{ height: '100%', background: '#10B981', transformOrigin: 'left', borderRadius: 999 }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Micro-célébration de fin d'étape : check mint + message, scale-in puis fade. */
function StepReward({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[24px]"
      style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 16 }}
        className="flex items-center justify-center rounded-full mb-4"
        style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 8px 32px rgba(16,185,129,0.35)' }}
      >
        <Check size={30} color="#fff" strokeWidth={3} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-[16px] font-bold text-center px-8"
        style={{ color: '#111827', fontFamily: "'Outfit', sans-serif" }}
      >
        {message}
      </motion.div>
    </motion.div>
  )
}

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

// ─── Step components ──────────────────────────────────────────────────────────

type Upd = <K extends keyof OnboardingData>(k: K, v: OnboardingData[K]) => void
type TogglePill = (k: 'zones' | 'owner_cities', v: string, max?: number) => void

function Step1({ d, upd }: { d: OnboardingData; upd: Upd }) {
  return (
    <div>
      {/* Première question de l'onboarding : elle fixe profiles.role, donc la
          navigation et le dashboard que verra ce compte. Elle est obligatoire —
          « Continuer » reste désactivé tant qu'aucun choix n'est fait. */}
      <FieldLabel>Tu es plutôt…</FieldLabel>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
        {ROLE_CHOICES.map(r => {
          const selected = d.role === r.value
          return (
            <button
              key={r.value}
              onClick={() => upd('role', r.value)}
              aria-pressed={selected}
              className="p-4 rounded-[11px] border-2 cursor-pointer transition-all text-left"
              style={{
                borderColor: selected ? '#4ECBA0' : '#E5E7EB',
                background: selected ? '#ECFDF5' : '#fff',
              }}
            >
              <div className="text-[26px] mb-1"><Emoji native={r.emoji} size="26px" /></div>
              <div className="text-[13px] font-bold" style={{ color: selected ? '#059669' : '#111827' }}>
                {r.title}
              </div>
              <div className="text-[11.5px] mt-1 leading-snug" style={{ color: '#6B7280' }}>
                {r.description}
              </div>
            </button>
          )
        })}
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

      <FieldLabel>Date d&apos;emménagement</FieldLabel>
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

/**
 * Étape 2 — branche loueur.
 *
 * Volontairement courte (3 questions) : l'objectif n'est pas de qualifier le
 * loueur en profondeur mais de le mener au plus vite à sa première annonce.
 * Aucune question orientée locataire ici (budget de recherche, date
 * d'emménagement, compatibilité colocataire) : elles ne le concernent pas.
 */
function Step2Loueur({ d, upd, togglePill }: { d: OnboardingData; upd: Upd; togglePill: TogglePill }) {
  const [cityInput, setCityInput] = useState('')

  function addCity() {
    if (cityInput.trim()) {
      togglePill('owner_cities', cityInput.trim())
      setCityInput('')
    }
  }

  return (
    <div>
      <FieldLabel>Où en es-tu ?</FieldLabel>
      <Pills opts={OWNER_TIMING_OPTS} value={d.owner_timing} onSelect={v => upd('owner_timing', v)} />

      <FieldLabel mt>Type de bien</FieldLabel>
      <Pills opts={OWNER_TYPE_OPTS} value={d.owner_property_type} onSelect={v => upd('owner_property_type', v)} />

      <FieldLabel mt>Dans quelle(s) ville(s) ?</FieldLabel>
      <div className="flex gap-2 mb-2">
        <input
          value={cityInput}
          onChange={e => setCityInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCity()}
          placeholder="Ex : Lyon, Villeurbanne… (Entrée)"
          className="flex-1 px-3 py-2 rounded-[9px] text-[13px] border outline-none"
          style={{ borderColor: '#E5E7EB' }}
          onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
          onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
        />
        <button
          onClick={addCity}
          className="px-3 py-2 rounded-[9px] text-[13px] font-bold text-white border-none cursor-pointer"
          style={{ background: '#4ECBA0' }}
        >
          +
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {d.owner_cities.map(c => (
          <span
            key={c}
            className="px-2.5 py-1 rounded-full text-[12px] font-medium flex items-center gap-1"
            style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}
          >
            {c}
            <button
              onClick={() => togglePill('owner_cities', c)}
              className="border-none bg-transparent cursor-pointer ml-0.5 text-[10px] leading-none"
              style={{ color: '#059669' }}
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <div
        className="rounded-[12px] p-3.5 text-[12.5px] leading-relaxed"
        style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', color: '#6B7280' }}
      >
        <Emoji native="🏠" size="14px" /> Juste après, on t&apos;emmène directement sur la
        création de ta première annonce. Tu pourras l&apos;enregistrer en brouillon si tu
        n&apos;as pas encore toutes les infos.
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

/** Nombre d'étapes du parcours pour un rôle donné. */
function stepCountFor(role: string | undefined | null): number {
  return role === 'loueur' ? STEP_LABELS_LOUEUR.length : STEP_LABELS_LOCATAIRE.length
}

/**
 * Destination de fin d'onboarding.
 *
 * Un loueur part droit sur la création d'annonce (/app/annonce, le formulaire
 * mutualisé derrière « Publier une annonce ») : le dashboard swipe ne lui sert
 * à rien tant qu'il n'a rien publié.
 */
function homeFor(role: string | undefined | null): string {
  return role === 'loueur' ? '/app/annonce' : '/app/swipe'
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [d, setD] = useState<OnboardingData>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [resumeBanner, setResumeBanner] = useState(false)
  const [reward, setReward] = useState<string | null>(null)
  const draftSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load: check DB draft first (if logged in), then localStorage
  useEffect(() => {
    async function loadDraft() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, onboarding_draft, onboarding_step, onboarding_completed')
          .eq('id', user.id)
          .single()

        if (profile?.onboarding_completed) {
          router.push(homeFor(profile.role as string | undefined))
          return
        }

        if (profile?.onboarding_draft && profile.onboarding_step > 0) {
          const draft = profile.onboarding_draft as Record<string, unknown>
          const localRaw = (() => { try { return localStorage.getItem('isaly_onboarding_data') } catch { return null } })()
          const localStep = (() => { try { const p = JSON.parse(localRaw ?? '{}'); return p.onboarding_step ?? 0 } catch { return 0 } })()
          if (profile.onboarding_step >= localStep) {
            setD({ ...DEFAULT, ...(draft as Partial<OnboardingData>) })
            // Le brouillon d'un loueur ne compte que 2 étapes.
            setStep(Math.min(profile.onboarding_step, stepCountFor(draft.role as string | undefined)))
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
          router.push(homeFor(saved.role as string | undefined))
        }
        return
      }
      if (saved.onboarding_step && typeof saved.onboarding_step === 'number' && saved.onboarding_step > 1) {
        setD({ ...DEFAULT, ...(saved as Partial<OnboardingData>) })
        setStep(Math.min(saved.onboarding_step as number, stepCountFor(saved.role as string | undefined)))
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

  function togglePill(key: 'zones' | 'owner_cities', val: string, max?: number) {
    setD(prev => {
      const arr = prev[key]
      const has = arr.includes(val)
      if (has) return { ...prev, [key]: arr.filter(v => v !== val) }
      if (max !== undefined && arr.length >= max) return prev
      return { ...prev, [key]: [...arr, val] }
    })
  }

  async function next() {
    if (step >= total || reward) return
    const nextStep = step + 1
    try { localStorage.setItem('isaly_onboarding_data', JSON.stringify({ ...d, onboarding_step: nextStep })) } catch {}
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      supabase.from('profiles').update({
        onboarding_draft: { ...d, onboarding_step: nextStep } as Record<string, unknown>,
        onboarding_step: nextStep,
      }).eq('id', user.id).then(() => {})
    }
    // Récompense de fin d'étape, puis transition
    setReward(stepRewards[step - 1])
    setTimeout(() => {
      setReward(null)
      setStep(s => s + 1)
    }, 1600)
  }

  async function finish(matching_data: MatchingData) {
    setSaving(true)
    setReward(STEP_REWARDS_LOCATAIRE[2])
    const payload = {
      first_name:  d.first_name  || null,
      last_name:   d.last_name   || null,
      role:        d.role        || null,
      city:        d.city        || null,
      budget_max:  d.budget_max,
      onboarding_completed: true,
      // Trace la réponse à la question de rôle : sans elle, la garde de
      // /app/* reposerait la question à ce compte (cf. RoleGate).
      role_confirmed_at: new Date().toISOString(),
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
      // Laisse la récompense visible un instant avant la redirection
      setTimeout(() => router.push('/app/swipe'), 1400)
    } else {
      // Not yet logged in — save to localStorage and go to register
      try {
        localStorage.setItem('isaly_onboarding_data', JSON.stringify({ ...d, ...payload, matching_data }))
      } catch {}
      setTimeout(() => router.push('/auth/register'), 1400)
    }
  }

  /**
   * Fin de parcours loueur.
   *
   * Pas de matching_data : le vecteur de compatibilité est un objet de
   * colocataire, il n'a pas d'équivalent côté loueur et reste donc NULL.
   * Les réponses des 3 questions partent dans profiles.owner_intent (JSONB,
   * migration 38) via une écriture séparée et best-effort : tant que la
   * migration n'est pas jouée, l'onboarding se termine quand même.
   */
  async function finishLoueur() {
    if (saving || reward) return
    setSaving(true)
    setReward(STEP_REWARDS_LOUEUR[1])

    const ownerIntent = {
      timing: d.owner_timing || null,
      property_type: d.owner_property_type || null,
      cities: d.owner_cities,
      answered_at: new Date().toISOString(),
    }
    const payload = {
      first_name:  d.first_name  || null,
      last_name:   d.last_name   || null,
      role:        d.role        || null,
      city:        d.city        || null,
      onboarding_completed: true,
      role_confirmed_at: new Date().toISOString(),
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      await supabase.from('profiles').upsert({
        id: user.id, email: user.email, ...payload,
        onboarding_draft: null, onboarding_step: 0,
      })
      // Colonne absente (migration 38 pas encore jouée) : on ignore l'échec.
      try {
        await supabase.from('profiles').update({ owner_intent: ownerIntent }).eq('id', user.id)
      } catch { /* noop */ }
      try { localStorage.removeItem('isaly_onboarding_data') } catch {}
      setTimeout(() => router.push('/app/annonce'), 1400)
    } else {
      try {
        localStorage.setItem('isaly_onboarding_data', JSON.stringify({ ...d, ...payload, owner_intent: ownerIntent }))
      } catch {}
      setTimeout(() => router.push('/auth/register'), 1400)
    }
  }

  // Le rôle conditionne toute la suite du parcours : on ne laisse pas passer
  // l'étape 1 sans réponse.
  const isLoueur = d.role === 'loueur'
  const stepLabels = isLoueur ? STEP_LABELS_LOUEUR : STEP_LABELS_LOCATAIRE
  const stepRewards = isLoueur ? STEP_REWARDS_LOUEUR : STEP_REWARDS_LOCATAIRE
  const total = stepLabels.length
  const canProceed = step !== 1 || d.role === 'locataire' || d.role === 'loueur'
  // Dernière étape loueur : au moins la question « Où en es-tu ? » doit être
  // renseignée, les deux autres restent facultatives.
  const canFinishLoueur = d.owner_timing !== '' && !saving

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{ background: 'linear-gradient(135deg, #edfaf4, #f7f8fa)' }}
    >
      <div
        className="bg-white rounded-[24px] w-full relative"
        style={{ padding: '36px 40px', boxShadow: '0 8px 36px rgba(0,0,0,.13)', maxWidth: '560px' }}
      >
        {/* Récompense de fin d'étape */}
        <AnimatePresence>
          {reward && <StepReward message={reward} />}
        </AnimatePresence>

        {/* Resume banner */}
        {resumeBanner && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#10B981', textAlign: 'center' }}>
            On reprend où tu t&apos;étais arrêté ✓
          </div>
        )}

        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Image
            src="/LOGO_ISALY.png" alt="ISALY" height={30} width={95}
            style={{ width: 'auto', height: '30px', objectFit: 'contain' }}
          />
        </div>

        {/* Progress bar gamifiée */}
        <ProgressSteps step={step} total={total} />

        <div className="text-[10.5px] font-extrabold uppercase mb-1.5" style={{ letterSpacing: '2px', color: '#2AA87C' }}>
          ÉTAPE {step} SUR {total}
        </div>
        <h2 className="text-[24px] mb-4" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
          {stepLabels[step - 1]}
        </h2>

        {/* Scrollable step content */}
        <div className="overflow-y-auto" style={{ maxHeight: '440px', paddingRight: '2px' }}>
          {step === 1 && <Step1 d={d} upd={upd} />}
          {/* Étape 2 : deux branches distinctes selon la réponse à la question de rôle. */}
          {step === 2 && !isLoueur && <Step2 d={d} upd={upd} togglePill={togglePill} />}
          {step === 2 && isLoueur && (
            saving ? (
              <div className="py-10 text-center text-[14px]" style={{ color: '#6B7280' }}>
                Création de ton espace loueur…
              </div>
            ) : (
              <Step2Loueur d={d} upd={upd} togglePill={togglePill} />
            )
          )}
          {step === 3 && !isLoueur && (
            saving ? (
              <div className="py-10 text-center text-[14px]" style={{ color: '#6B7280' }}>
                Création de ton profil…
              </div>
            ) : (
              <MatchingQuiz
                initialAnswers={Object.keys(d.quiz_answers).length > 0 ? d.quiz_answers : undefined}
                onProgress={answers => upd('quiz_answers', answers)}
                onComplete={finish}
                budgetMin={d.budget_min}
              />
            )
          )}
        </div>

        {/* Navigation */}
        {step < total && (
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
              disabled={!canProceed}
              className="py-3 rounded-full text-[13.5px] font-semibold text-white border-none transition-colors"
              style={{
                background: '#4ECBA0', flex: step > 1 ? 2 : 1,
                opacity: canProceed ? 1 : 0.45,
                cursor: canProceed ? 'pointer' : 'not-allowed',
              }}
              onMouseEnter={e => { if (canProceed) e.currentTarget.style.background = '#2AA87C' }}
              onMouseLeave={e => (e.currentTarget.style.background = '#4ECBA0')}
            >
              Continuer →
            </button>
          </div>
        )}
        {/* Dernière étape loueur : le parcours se conclut sur la création
            d'annonce, pas sur le dashboard swipe. */}
        {step === total && isLoueur && (
          <div className="flex gap-2.5 mt-5">
            <button
              onClick={() => setStep(1)}
              disabled={saving}
              className="flex-1 py-3 rounded-full text-[13.5px] font-semibold border-[1.5px] cursor-pointer bg-transparent"
              style={{ borderColor: '#E5E7EB', color: '#374151' }}
            >
              ← Retour
            </button>
            <button
              onClick={finishLoueur}
              disabled={!canFinishLoueur}
              className="py-3 rounded-full text-[13.5px] font-semibold text-white border-none transition-colors"
              style={{
                background: '#4ECBA0', flex: 2,
                opacity: canFinishLoueur ? 1 : 0.45,
                cursor: canFinishLoueur ? 'pointer' : 'not-allowed',
              }}
              onMouseEnter={e => { if (canFinishLoueur) e.currentTarget.style.background = '#2AA87C' }}
              onMouseLeave={e => (e.currentTarget.style.background = '#4ECBA0')}
            >
              Créer ma première annonce →
            </button>
          </div>
        )}
        {step === total && !isLoueur && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setStep(2)}
              className="cursor-pointer bg-transparent border-none text-[12.5px] font-semibold"
              style={{ color: '#9CA3AF' }}
            >
              ← Revenir à ma recherche
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
