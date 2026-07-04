'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Check } from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import MatchingQuiz from '@/components/quiz/MatchingQuiz'
import { createClient } from '@/lib/supabase/client'
import { hasCompletedTest, DIMENSION_LABELS, DIMENSIONS, type MatchingData } from '@/lib/matching'

export default function QuizPage() {
  const router = useRouter()
  const [budgetMin, setBudgetMin] = useState<number | undefined>(undefined)
  const [result, setResult] = useState<MatchingData | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  // Récupère le budget_min existant pour le conserver dans le nouveau matching_data
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('matching_data')
        .eq('id', user.id)
        .single()
      const md = profile?.matching_data as { budget_min?: number } | null
      if (md?.budget_min != null) setBudgetMin(md.budget_min)
    }
    load()
  }, [router])

  async function save(data: MatchingData) {
    setSaving(true)
    setError(false)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { error: err } = await supabase
      .from('profiles')
      .update({ matching_data: data })
      .eq('id', user.id)
    setSaving(false)
    if (err) { setError(true); return }
    setResult(data)
  }

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0A' }}>
      <Topbar title="Test de compatibilité" />
      <div className="mx-auto px-5 py-8" style={{ maxWidth: '620px' }}>
        <button
          onClick={() => router.push('/app/profil')}
          className="flex items-center gap-1.5 mb-6 cursor-pointer bg-transparent border-none"
          style={{ fontSize: '13.5px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}
        >
          <ArrowLeft size={16} /> Retour au profil
        </button>

        <h1
          className="mb-1"
          style={{ fontFamily: "'Outfit', sans-serif", fontSize: '26px', fontWeight: 700, color: '#fff' }}
        >
          Mon test de compatibilité
        </h1>
        <p className="mb-7" style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.45)' }}>
          17 questions rapides — tes réponses alimentent tous tes scores de compatibilité.
        </p>

        <div
          className="rounded-3xl p-6 sm:p-8"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {result && hasCompletedTest(result) ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div
                className="mx-auto mb-4 flex items-center justify-center rounded-full"
                style={{ width: 56, height: 56, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)' }}
              >
                <Check size={26} color="#10B981" />
              </div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '18px' }}>
                Test enregistré !
              </div>
              <div className="flex flex-col gap-2.5 mb-7 text-left">
                {DIMENSIONS.map(dim => (
                  <div key={dim}>
                    <div className="flex justify-between mb-1">
                      <span style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.55)' }}>{DIMENSION_LABELS[dim]}</span>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#10B981' }}>{result.scores[dim]}</span>
                    </div>
                    <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)' }}>
                      <div style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, #10B981, #059669)', width: `${result.scores[dim]}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => router.push('/app/swipe')}
                className="cursor-pointer border-none text-white font-bold"
                style={{
                  fontSize: '14.5px', padding: '13px 30px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  boxShadow: '0 0 30px rgba(16,185,129,0.3)',
                }}
              >
                Voir mes nouveaux matchs →
              </button>
            </motion.div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: '13px', color: '#EF4444' }}>
                  Impossible d&apos;enregistrer, réessaie.
                </div>
              )}
              {saving ? (
                <div className="py-10 text-center" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                  Enregistrement…
                </div>
              ) : (
                <MatchingQuiz dark onComplete={save} budgetMin={budgetMin} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
