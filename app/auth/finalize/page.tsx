'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

const SCHEDULE_MAP: Record<string, string> = {
  'Lève-tôt': 'leve-tot',
  'Couche-tard': 'couche-tard',
  'Variable': 'variable',
  'Flexible': 'flexible',
}
const VIBE_MAP: Record<string, string> = {
  'Calme': 'calme',
  'Festif': 'festif',
  'Studieux': 'studieux',
  'Détendu': 'detendu',
}
const ROLE_MAP: Record<string, string> = {
  'Locataire': 'locataire',
  'Loueur': 'loueur',
}

export default function FinalizePage() {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function finalize() {
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        router.push('/auth/login')
        return
      }

      // Read questionnaire answers saved before registration
      let onboardingData: Record<string, unknown> = {}
      try {
        const raw = localStorage.getItem('isaly_onboarding_data')
        if (raw) onboardingData = JSON.parse(raw)
      } catch {}

      const budgetVal = typeof onboardingData.budget === 'number' ? onboardingData.budget : 800

      const { error } = await supabase
        .from('profiles')
        .update({
          role: ROLE_MAP[onboardingData.role as string] ?? null,
          schedule: SCHEDULE_MAP[onboardingData.schedule as string] ?? null,
          vibe: VIBE_MAP[onboardingData.vibe as string] ?? null,
          passions: (onboardingData.passions as string[]) ?? [],
          budget_max: budgetVal,
          onboarding_completed: true,
        })
        .eq('id', user.id)

      if (error) {
        console.error('[finalize] profile update failed:', error.message, error.details)
        setErrorMsg(`Erreur de sauvegarde : ${error.message}`)
        return
      }

      localStorage.removeItem('isaly_onboarding_data')
      router.push('/app/swipe')
    }

    finalize()
  }, [router])

  if (errorMsg) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-5"
        style={{ background: 'linear-gradient(135deg, #edfaf4, #f7f8fa)' }}
      >
        <div
          className="bg-white rounded-[24px] w-full text-center"
          style={{ padding: '52px 44px', boxShadow: '0 8px 36px rgba(0,0,0,.13)', maxWidth: '420px' }}
        >
          <div className="text-[48px] mb-4">⚠️</div>
          <h2 className="text-[20px] mb-3" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
            Problème de sauvegarde
          </h2>
          <p className="text-sm mb-5" style={{ color: '#EF4444' }}>{errorMsg}</p>
          <button
            onClick={() => router.push('/app/swipe')}
            className="w-full py-3.5 rounded-full text-[14.5px] font-semibold text-white border-none cursor-pointer"
            style={{ background: '#4ECBA0' }}
          >
            Continuer quand même →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-5"
      style={{ background: 'linear-gradient(135deg, #edfaf4, #f7f8fa)' }}
    >
      <div
        className="bg-white rounded-[24px] w-full text-center"
        style={{ padding: '52px 44px', boxShadow: '0 8px 36px rgba(0,0,0,.13)', maxWidth: '420px' }}
      >
        <div className="flex justify-center mb-6">
          <Image src="/LOGO_ISALY.png" alt="ISALY" height={36} width={120} style={{ width: 'auto', height: '36px', objectFit: 'contain' }} />
        </div>
        <div className="text-[48px] mb-4">✨</div>
        <h2 className="text-[22px] mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
          Création de ton profil…
        </h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          On sauvegarde tes préférences, c'est rapide.
        </p>
      </div>
    </div>
  )
}
