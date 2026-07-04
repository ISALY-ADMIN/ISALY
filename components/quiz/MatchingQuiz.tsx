'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  QUIZ_QUESTIONS,
  DEALBREAKER_QUESTIONS,
  QUIZ_TOTAL_STEPS,
  buildMatchingData,
  type MatchingData,
} from '@/lib/matching'

interface MatchingQuizProps {
  /** Palette sombre (app) ou claire (onboarding). */
  dark?: boolean
  /** Réponses initiales (reprise de brouillon). */
  initialAnswers?: Record<string, number>
  /** Appelé à chaque réponse — permet de sauvegarder un brouillon. */
  onProgress?: (answers: Record<string, number>) => void
  /** Appelé quand les 17 questions sont répondues. */
  onComplete: (data: MatchingData) => void
  /** Budget min conservé dans matching_data pour le chevauchement budget. */
  budgetMin?: number
}

const MINT = '#10B981'

export default function MatchingQuiz({ dark = false, initialAnswers, onProgress, onComplete, budgetMin }: MatchingQuizProps) {
  // answers: qN → valeur 0/33/66/100 ; d_fumeur/d_animaux → index d'option 0-3
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers ?? {})
  const [step, setStep] = useState(() => {
    if (!initialAnswers) return 0
    let s = 0
    for (const q of QUIZ_QUESTIONS) { if (initialAnswers[q.id] == null) break; s++ }
    if (s === QUIZ_QUESTIONS.length) {
      for (const q of DEALBREAKER_QUESTIONS) { if (initialAnswers[q.id] == null) break; s++ }
    }
    return Math.min(s, QUIZ_TOTAL_STEPS - 1)
  })
  const [direction, setDirection] = useState(1)

  const isDealbreaker = step >= QUIZ_QUESTIONS.length
  const question = isDealbreaker
    ? DEALBREAKER_QUESTIONS[step - QUIZ_QUESTIONS.length]
    : QUIZ_QUESTIONS[step]

  const c = dark
    ? {
        text: '#fff', sub: 'rgba(255,255,255,0.45)',
        cardBg: 'rgba(255,255,255,0.04)', cardBorder: 'rgba(255,255,255,0.08)',
        cardBgActive: 'rgba(16,185,129,0.10)', track: 'rgba(255,255,255,0.08)',
      }
    : {
        text: '#111827', sub: '#6B7280',
        cardBg: '#F9FAFB', cardBorder: '#E5E7EB',
        cardBgActive: '#ECFDF5', track: '#E5E7EB',
      }

  function currentValue(): number | undefined {
    return answers[question.id]
  }

  function select(optionIndex: number) {
    const value = isDealbreaker
      ? optionIndex
      : (question as (typeof QUIZ_QUESTIONS)[number]).values[optionIndex]
    const next = { ...answers, [question.id]: value }
    setAnswers(next)
    onProgress?.(next)

    // petite pause pour voir la sélection, puis avance
    setTimeout(() => {
      if (step < QUIZ_TOTAL_STEPS - 1) {
        setDirection(1)
        setStep(s => s + 1)
      } else {
        const quizAnswers: Record<string, number> = {}
        for (const q of QUIZ_QUESTIONS) quizAnswers[q.id] = next[q.id]
        onComplete(buildMatchingData(
          quizAnswers,
          { d_fumeur: next.d_fumeur ?? 2, d_animaux: next.d_animaux ?? 2 },
          budgetMin
        ))
      }
    }, 220)
  }

  function back() {
    if (step === 0) return
    setDirection(-1)
    setStep(s => s - 1)
  }

  function isSelected(optionIndex: number): boolean {
    const v = currentValue()
    if (v == null) return false
    if (isDealbreaker) return v === optionIndex
    return (question as (typeof QUIZ_QUESTIONS)[number]).values[optionIndex] === v
  }

  return (
    <div>
      {/* Progress bar fine mint */}
      <div className="mb-1.5" style={{ height: '4px', borderRadius: '2px', background: c.track, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%', borderRadius: '2px', background: MINT,
            width: `${Math.round(((step + 1) / QUIZ_TOTAL_STEPS) * 100)}%`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontSize: '11.5px', fontWeight: 700, color: MINT, letterSpacing: '1px' }}>
          {isDealbreaker ? 'DERNIÈRES QUESTIONS' : `QUESTION ${step + 1} / ${QUIZ_TOTAL_STEPS}`}
        </span>
        <span style={{ fontSize: '11.5px', color: c.sub }}>~2 min</span>
      </div>

      <div style={{ overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={question.id}
            custom={direction}
            initial={{ x: direction > 0 ? 60 : -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? -60 : 60, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <h3
              className="mb-4"
              style={{ fontFamily: "'Outfit', sans-serif", fontSize: '21px', fontWeight: 700, color: c.text, lineHeight: 1.3 }}
            >
              {question.question}
            </h3>

            <div className="flex flex-col gap-2.5">
              {question.options.map((opt, i) => {
                const active = isSelected(i)
                return (
                  <button
                    key={i}
                    onClick={() => select(i)}
                    className="text-left cursor-pointer transition-all"
                    style={{
                      padding: '14px 16px', borderRadius: '14px', fontSize: '14.5px', fontWeight: 500,
                      fontFamily: "'Outfit', sans-serif",
                      background: active ? c.cardBgActive : c.cardBg,
                      border: `1.5px solid ${active ? MINT : c.cardBorder}`,
                      color: active ? (dark ? '#fff' : '#065F46') : c.text,
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = 'rgba(16,185,129,0.45)' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = c.cardBorder }}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Retour */}
      <div className="mt-4" style={{ minHeight: '30px' }}>
        {step > 0 && (
          <button
            onClick={back}
            className="cursor-pointer bg-transparent border-none"
            style={{ fontSize: '13px', fontWeight: 600, color: c.sub, padding: '4px 0' }}
          >
            ← Question précédente
          </button>
        )}
      </div>
    </div>
  )
}
