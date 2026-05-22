'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Step {
  step: string
  title: string
  sub: string
  type: 'choice' | 'multi' | 'slider'
  key: string
  opts?: { em: string; lbl: string; sub?: string }[]
  min?: number
  max?: number
  def?: number
}

const STEPS: Step[] = [
  {
    step: 'ÉTAPE 1 / 5',
    title: 'Tu es…',
    sub: 'Comment tu utilises ISALY ?',
    type: 'choice',
    key: 'role',
    opts: [
      { em: '🔍', lbl: 'Locataire', sub: 'Je cherche une coloc' },
      { em: '🏠', lbl: 'Loueur', sub: 'Je loue mon bien' },
    ],
  },
  {
    step: 'ÉTAPE 2 / 5',
    title: 'Tes horaires',
    sub: 'Ton rythme de vie quotidien ?',
    type: 'choice',
    key: 'schedule',
    opts: [
      { em: '🌅', lbl: 'Lève-tôt', sub: 'Avant 8h' },
      { em: '🌙', lbl: 'Couche-tard', sub: 'Après 23h' },
      { em: '🔄', lbl: 'Variable', sub: 'Ça dépend' },
      { em: '💤', lbl: 'Flexible', sub: 'Sans contrainte' },
    ],
  },
  {
    step: 'ÉTAPE 3 / 5',
    title: 'Ton ambiance',
    sub: "L'atmosphère idéale ?",
    type: 'choice',
    key: 'vibe',
    opts: [
      { em: '🤫', lbl: 'Calme', sub: 'Sérénité' },
      { em: '🎉', lbl: 'Festif', sub: 'Soirées' },
      { em: '🎯', lbl: 'Studieux', sub: 'Concentration' },
      { em: '😎', lbl: 'Détendu', sub: 'Zen & cool' },
    ],
  },
  {
    step: 'ÉTAPE 4 / 5',
    title: 'Tes passions',
    sub: "Sélectionne tes centres d'intérêt",
    type: 'multi',
    key: 'passions',
    opts: [
      { em: '🎵', lbl: 'Musique' },
      { em: '🎬', lbl: 'Cinéma' },
      { em: '🏃', lbl: 'Sport' },
      { em: '🍳', lbl: 'Cuisine' },
      { em: '🎨', lbl: 'Art' },
      { em: '📚', lbl: 'Lecture' },
      { em: '🌍', lbl: 'Voyages' },
      { em: '🎮', lbl: 'Gaming' },
    ],
  },
  {
    step: 'ÉTAPE 5 / 5',
    title: 'Ton budget',
    sub: 'Loyer max que tu peux assumer ?',
    type: 'slider',
    key: 'budget',
    min: 300,
    max: 1500,
    def: 800,
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({})
  const [budget, setBudget] = useState(800)

  const step = STEPS[idx]

  function pick(key: string, val: string, multi: boolean) {
    if (!multi) {
      setAnswers(a => ({ ...a, [key]: val }))
    } else {
      const current = (answers[key] as string[]) ?? []
      const already = current.includes(val)
      setAnswers(a => ({
        ...a,
        [key]: already ? current.filter(v => v !== val) : [...current, val],
      }))
    }
  }

  function isSelected(key: string, val: string) {
    const v = answers[key]
    if (Array.isArray(v)) return v.includes(val)
    return v === val
  }

  async function next() {
    if (idx < STEPS.length - 1) {
      setIdx(i => i + 1)
      return
    }

    // Persist questionnaire answers and hand off to register
    const data = {
      role: answers.role ?? null,
      schedule: answers.schedule ?? null,
      vibe: answers.vibe ?? null,
      passions: answers.passions ?? [],
      budget: answers.budget ?? budget,
    }
    localStorage.setItem('isaly_onboarding_data', JSON.stringify(data))
    router.push('/auth/register')
  }

  function prev() {
    if (idx > 0) setIdx(i => i - 1)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{ background: 'linear-gradient(135deg, #edfaf4, #f7f8fa)' }}
    >
      <div
        className="bg-white rounded-[24px] w-full"
        style={{ padding: '48px 42px', boxShadow: '0 8px 36px rgba(0,0,0,.13)', maxWidth: '520px' }}
      >
        {/* Progress dots */}
        <div className="flex gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === idx ? '20px' : '7px',
                borderRadius: i === idx ? '4px' : '50%',
                background: i < idx ? '#4ECBA0' : i === idx ? '#2AA87C' : '#E5E7EB',
              }}
            />
          ))}
        </div>

        <div
          className="text-[10.5px] font-extrabold uppercase mb-2"
          style={{ letterSpacing: '2px', color: '#2AA87C' }}
        >
          {step.step}
        </div>
        <h2
          className="text-[27px] mb-1.5"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          {step.title}
        </h2>
        <p className="text-sm mb-7" style={{ color: '#6B7280' }}>{step.sub}</p>

        {/* Slider */}
        {step.type === 'slider' && (
          <div className="mb-5">
            <div className="flex justify-between text-[13px] font-bold mb-2.5">
              <span>Budget max</span>
              <span style={{ color: '#2AA87C' }}>{budget}€/mois</span>
            </div>
            <input
              type="range"
              min={step.min}
              max={step.max}
              value={budget}
              step={50}
              onChange={e => {
                const v = Number(e.target.value)
                setBudget(v)
                setAnswers(a => ({ ...a, [step.key]: v }))
              }}
              className="w-full"
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: '#9CA3AF' }}>
              <span>{step.min}€</span>
              <span>{step.max}€</span>
            </div>
          </div>
        )}

        {/* Choice / Multi */}
        {(step.type === 'choice' || step.type === 'multi') && step.opts && (
          <div
            className="grid gap-2.5 mb-5"
            style={{
              gridTemplateColumns: step.type === 'multi' ? 'repeat(4,1fr)' : 'repeat(2,1fr)',
            }}
          >
            {step.opts.map(opt => (
              <button
                key={opt.lbl}
                onClick={() => pick(step.key, opt.lbl, step.type === 'multi')}
                className="p-4 border-2 rounded-[11px] cursor-pointer transition-all text-center border-none"
                style={{
                  borderColor: isSelected(step.key, opt.lbl) ? '#4ECBA0' : '#E5E7EB',
                  background: isSelected(step.key, opt.lbl) ? '#E8F9F3' : '#fff',
                  border: `2px solid ${isSelected(step.key, opt.lbl) ? '#4ECBA0' : '#E5E7EB'}`,
                }}
              >
                <div className="text-[25px] mb-1.5">{opt.em}</div>
                <div className="text-[12.5px] font-bold">{opt.lbl}</div>
                {opt.sub && (
                  <div className="text-[11px] mt-0.5" style={{ color: '#6B7280' }}>{opt.sub}</div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2.5 mt-6">
          {idx > 0 && (
            <button
              onClick={prev}
              className="flex-1 py-3 rounded-full text-sm font-semibold border-[1.5px] cursor-pointer transition-all bg-transparent"
              style={{ borderColor: '#E5E7EB', color: '#1A1A1A' }}
            >
              ← Retour
            </button>
          )}
          <button
            onClick={next}
            className="py-3 rounded-full text-sm font-semibold text-white border-none cursor-pointer transition-colors"
            style={{ background: '#4ECBA0', flex: idx > 0 ? 2 : 1 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2AA87C')}
            onMouseLeave={e => (e.currentTarget.style.background = '#4ECBA0')}
          >
            {idx < STEPS.length - 1 ? 'Continuer →' : 'Créer mon profil 🚀'}
          </button>
        </div>
      </div>
    </div>
  )
}
