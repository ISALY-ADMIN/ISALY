'use client'
import { useState } from 'react'
import Link from 'next/link'
import { QUIZ_QUESTIONS, DIMENSION_LABELS, type Dimension } from '@/lib/matching'

// Une question réelle par dimension — mêmes questions que le vrai test.
const TEASER_IDS = ['q1', 'q4', 'q7', 'q10', 'q13']
const QUESTIONS = TEASER_IDS
  .map(id => QUIZ_QUESTIONS.find(q => q.id === id))
  .filter((q): q is (typeof QUIZ_QUESTIONS)[number] => !!q)

// Portrait par dimension selon la réponse (valeur 0-100)
const PORTRAITS: Record<Dimension, [string, string]> = {
  rythme: ['Plutôt du matin', 'Plutôt de la nuit'],
  proprete: ['Ambiance détendue', 'Organisation au carré'],
  sociabilite: ['Cocon tranquille', 'Porte ouverte'],
  calme: ['Le bruit ne te fait pas peur', 'Besoin de calme'],
  partage: ['Chacun son espace', 'Tout se partage'],
}

export default function CompatibilityQuiz() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<Dimension, number>>({} as Record<Dimension, number>)
  const [done, setDone] = useState(false)

  function answer(optIdx: number) {
    const q = QUESTIONS[step]
    const next = { ...answers, [q.dimension]: q.values[optIdx] }
    setAnswers(next)
    if (step < QUESTIONS.length - 1) setStep(step + 1)
    else setDone(true)
  }

  if (done) {
    const traits = (Object.entries(answers) as Array<[Dimension, number]>)
      .map(([dim, v]) => ({ dim, label: PORTRAITS[dim][v >= 50 ? 1 : 0], strength: Math.abs(v - 50) }))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 3)

    return (
      <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '40px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '24px', color: '#fff', marginBottom: '18px', fontWeight: 700 }}>
          Ton profil coloc
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {traits.map(t => (
            <div key={t.dim} style={{ padding: '11px 16px', borderRadius: '12px', background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', fontSize: '14.5px', fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
              {DIMENSION_LABELS[t.dim]} — {t.label}
            </div>
          ))}
        </div>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', marginBottom: '32px', lineHeight: 1.7 }}>
          Inscris-toi et complète le test complet (2 min) pour voir ton <strong style={{ color: '#10B981' }}>vrai score de compatibilité</strong> avec chaque profil.
        </p>
        <Link href="/auth/register" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', textDecoration: 'none', fontSize: '16px', fontWeight: 700, padding: '14px 32px', borderRadius: '12px', boxShadow: '0 0 40px rgba(16,185,129,0.4)' }}>
          Voir mes matchs →
        </Link>
      </div>
    )
  }

  const q = QUESTIONS[step]
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '40px' }}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
        {QUESTIONS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= step ? '#10B981' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
        ))}
      </div>
      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '24px', textAlign: 'center' }}>{q.question}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {q.options.map((opt, i) => (
          <button key={i} onClick={() => answer(i)}
            style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '15px', cursor: 'pointer', textAlign: 'left', fontFamily: "'Outfit', sans-serif", transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
          >
            {opt}
          </button>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Question {step + 1} sur {QUESTIONS.length}</div>
    </div>
  )
}
