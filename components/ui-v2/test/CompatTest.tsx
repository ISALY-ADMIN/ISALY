'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  QUIZ_QUESTIONS,
  DEALBREAKER_QUESTIONS,
  QUIZ_TOTAL_STEPS,
  DIMENSIONS,
  DIMENSION_LABELS,
  buildMatchingData,
  type Dimension,
  type MatchingData,
} from '@/lib/matching'
import { Icon, Meter } from '../primitives'
import { BarRow } from '../primitives'
import { Radar } from '../visuals'
import { COL } from '../colors'
import '@/styles/ui-v2-site.css'

type CSSVars = CSSProperties & Record<`--${string}`, string | number>

/** Couleur de chaque dimension (DIMC de la maquette). */
export const DIM_COLORS: Record<Dimension, string> = {
  rythme: COL.azure,
  proprete: COL.mint,
  sociabilite: COL.coral,
  calme: COL.violet,
  partage: COL.sun,
}

/** Tailles des pastilles de l'échelle, symétriques (extrêmes plus grands). */
function dotSizes(n: number): number[] {
  if (n === 5) return [34, 26, 20, 26, 34]
  if (n === 4) return [34, 26, 26, 34]
  return Array.from({ length: n }, () => 28)
}

export interface CompatTestProps {
  /** Réponses initiales (reprise de brouillon). */
  initialAnswers?: Record<string, number>
  /** Appelé à chaque réponse : sauvegarde du brouillon. */
  onProgress?: (answers: Record<string, number>) => void
  /** Appelé quand toutes les questions sont répondues. */
  onComplete: (data: MatchingData) => void
  /** Budget minimum conservé dans matching_data (chevauchement de budget). */
  budgetMin?: number
}

/**
 * Test de compatibilité du site v2 (étape « test » de l'onboarding et
 * « Refaire le test » de Mon profil). Une question par écran, les vraies
 * questions de lib/matching (15 questions et 2 critères), réponse au clic ou
 * avec les touches 1 à N du clavier, passage automatique à la question
 * suivante. Même résultat que l'ancien MatchingQuiz (buildMatchingData).
 */
export function CompatTest({ initialAnswers, onProgress, onComplete, budgetMin }: CompatTestProps) {
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
  const timer = useRef<number>(0)
  const done = useRef(false)

  const isDealbreaker = step >= QUIZ_QUESTIONS.length
  const quizQ = isDealbreaker ? null : QUIZ_QUESTIONS[step]
  const dealQ = isDealbreaker ? DEALBREAKER_QUESTIONS[step - QUIZ_QUESTIONS.length] : null
  const question = (quizQ ?? dealQ)!
  const options = question.options
  const current = answers[question.id]

  const isSelected = (i: number) => {
    if (current == null) return false
    return quizQ ? quizQ.values[i] === current : current === i
  }

  const select = useCallback((optionIndex: number) => {
    if (done.current) return
    const value = quizQ ? quizQ.values[optionIndex] : optionIndex
    const next = { ...answers, [question.id]: value }
    setAnswers(next)
    onProgress?.(next)
    window.clearTimeout(timer.current)
    // Petite pause pour voir la sélection, puis question suivante.
    timer.current = window.setTimeout(() => {
      if (step < QUIZ_TOTAL_STEPS - 1) {
        setStep(s => s + 1)
      } else {
        done.current = true
        const quizAnswers: Record<string, number> = {}
        for (const q of QUIZ_QUESTIONS) quizAnswers[q.id] = next[q.id]
        onComplete(buildMatchingData(
          quizAnswers,
          { d_fumeur: next.d_fumeur ?? 2, d_animaux: next.d_animaux ?? 2 },
          budgetMin,
        ))
      }
    }, 260)
  }, [answers, budgetMin, onComplete, onProgress, question.id, quizQ, step])

  // Touches 1 à N du clavier (hors champs de saisie).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= options.length) {
        e.preventDefault()
        select(n - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [options.length, select])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const dimColor = quizQ ? DIM_COLORS[quizQ.dimension] : COL.ink
  const dimLabel = quizQ ? DIMENSION_LABELS[quizQ.dimension] : 'Critères'
  const sizes = dotSizes(options.length)
  const answered = step + (current != null ? 1 : 0)

  return (
    <div className="qcard">
      <div className="qprog">
        <span className="dimtag" style={{ '--c': dimColor } as CSSVars}><i />{dimLabel}</span>
        <span className="s num">{`Question ${step + 1} sur ${QUIZ_TOTAL_STEPS}`}</span>
      </div>
      <Meter value={(answered / QUIZ_TOTAL_STEPS) * 100} />
      <p className="q" id="qtext">{question.question}</p>
      <div className={`scale s${options.length}`} role="group" aria-labelledby="qtext" style={{ gridTemplateColumns: `repeat(${options.length},1fr)` }}>
        {options.map((label, i) => (
          <button
            key={label}
            type="button"
            aria-pressed={isSelected(i)}
            aria-keyshortcuts={String(i + 1)}
            onClick={() => select(i)}
            style={{ '--d': `${sizes[i]}px` } as CSSVars}
          >
            <i />
            {label}
          </button>
        ))}
      </div>
      <div className="hrow">
        <button className="btn btn-ghost btn-sm" type="button" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}>
          <Icon name="back" size={16} />Question précédente
        </button>
        <span className="hint">{`Astuce : touches 1 à ${options.length} du clavier`}</span>
      </div>
    </div>
  )
}

/** Résultat du test : radar et barres des 5 dimensions (étape « résultat »). */
export function CompatResult({ data }: { data: MatchingData }) {
  const labels = DIMENSIONS.map(d => DIMENSION_LABELS[d])
  const values = DIMENSIONS.map(d => data.scores[d])
  return (
    <div className="v-grid g2" style={{ alignItems: 'center' }}>
      <div className="panel"><Radar values={values} labels={labels} /></div>
      <div className="bars">
        {DIMENSIONS.map((d, i) => <BarRow key={d} label={labels[i]} value={values[i]} />)}
        <p className="hint mt">Tu peux refaire le test à tout moment depuis Mon profil.</p>
      </div>
    </div>
  )
}
