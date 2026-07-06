'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import MatchingQuiz from '@/components/quiz/MatchingQuiz'
import type { MatchingData } from '@/lib/matching'
import Emoji from '@/components/ui/Emoji'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingData {
  role: string
  first_name: string; last_name: string; age: string
  city: string; profession: string; status: string
  budget_min: number; budget_max: number
  move_in: string; duration: string; zones: string[]
  quiz_answers: Record<string, number>
}

const DEFAULT: OnboardingData = {
  role: '', first_name: '', last_name: '', age: '', city: '', profession: '', status: '',
  budget_min: 400, budget_max: 1000,
  move_in: '', duration: '', zones: [],
  quiz_answers: {},
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTS = ['Étudiant', 'Salarié CDI', 'Salarié CDD', 'Freelance', 'Auto-entrepreneur', 'Autre']

const STEP_LABELS = [
  'Qui es-tu ?',
  'Ta recherche',
  'Ton test de compatibilité',
]
const TOTAL = 3

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
type TogglePill = (k: 'zones', v: string, max?: number) => void

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
            <div className="text-[26px] mb-1"><Emoji native={r.em} size="26px" /></div>
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
            setStep(Math.min(profile.onboarding_step, TOTAL))
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
        setStep(Math.min(saved.onboarding_step as number, TOTAL))
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

  function togglePill(key: 'zones', val: string, max?: number) {
    setD(prev => {
      const arr = prev[key]
      const has = arr.includes(val)
      if (has) return { ...prev, [key]: arr.filter(v => v !== val) }
      if (max !== undefined && arr.length >= max) return prev
      return { ...prev, [key]: [...arr, val] }
    })
  }

  async function next() {
    if (step >= TOTAL) return
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
    setStep(s => s + 1)
  }

  async function finish(matching_data: MatchingData) {
    setSaving(true)
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
        <div className="overflow-y-auto" style={{ maxHeight: '440px', paddingRight: '2px' }}>
          {step === 1 && <Step1 d={d} upd={upd} />}
          {step === 2 && <Step2 d={d} upd={upd} togglePill={togglePill} />}
          {step === 3 && (
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
        {step < TOTAL && (
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
              className="py-3 rounded-full text-[13.5px] font-semibold text-white border-none cursor-pointer transition-colors"
              style={{ background: '#4ECBA0', flex: step > 1 ? 2 : 1 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2AA87C')}
              onMouseLeave={e => (e.currentTarget.style.background = '#4ECBA0')}
            >
              Continuer →
            </button>
          </div>
        )}
        {step === TOTAL && (
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
