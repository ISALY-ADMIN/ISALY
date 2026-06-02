'use client'
import { useState } from 'react'
import Link from 'next/link'

const QUESTIONS = [
  { q: 'Tu es plutôt...', options: ['🌅 Lève-tôt', '🌙 Couche-tard', '🤷 Flexible'] },
  { q: 'Tes invités chez toi...', options: ['❌ Rarement', '🙂 De temps en temps', '🎉 Souvent'] },
  { q: "Le ménage, c'est...", options: ['🧹 Chaque jour', '📅 Chaque semaine', "😅 Quand j'y pense"] },
  { q: 'Le télétravail...', options: ['💻 Tous les jours', '📅 Parfois', '🏢 Jamais'] },
  { q: 'Ton budget coloc...', options: ['< 500€', '500-800€', '> 800€'] },
]

export default function CompatibilityQuiz() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [score, setScore] = useState<number | null>(null)

  function answer(idx: number) {
    const newAnswers = [...answers, idx]
    if (step < QUESTIONS.length - 1) {
      setAnswers(newAnswers)
      setStep(step + 1)
    } else {
      const s = Math.floor(72 + Math.random() * 20)
      setScore(s)
    }
  }

  if (score !== null) return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '72px', fontWeight: 700, color: '#10B981', lineHeight: 1, marginBottom: '8px' }}>{score}%</div>
      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '24px', color: '#fff', marginBottom: '12px', fontWeight: 700 }}>de compatibilité estimée</div>
      <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', marginBottom: '32px', lineHeight: 1.7 }}>
        Il y a <strong style={{ color: '#10B981' }}>des dizaines de profils</strong> compatibles avec toi sur ISALY en ce moment. Inscris-toi pour les voir.
      </p>
      <Link href="/auth/register" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', textDecoration: 'none', fontSize: '16px', fontWeight: 700, padding: '14px 32px', borderRadius: '12px', boxShadow: '0 0 40px rgba(16,185,129,0.4)' }}>
        Voir mes matchs →
      </Link>
    </div>
  )

  const q = QUESTIONS[step]
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '40px' }}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
        {QUESTIONS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= step ? '#10B981' : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
        ))}
      </div>
      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '24px', textAlign: 'center' }}>{q.q}</div>
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
