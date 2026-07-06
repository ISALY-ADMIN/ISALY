'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import Emoji from '@/components/ui/Emoji'

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

      let raw: string | null = null
      try { raw = localStorage.getItem('isaly_onboarding_data') } catch {}

      // No onboarding data — user went straight to register without onboarding
      if (!raw) {
        router.push('/onboarding')
        return
      }

      let onboardingData: Record<string, unknown> = {}
      try { onboardingData = JSON.parse(raw) } catch {}

      const meta = user.user_metadata ?? {}
      const fullName: string = (meta.full_name as string) ?? (meta.name as string) ?? ''

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        first_name:
          (onboardingData.first_name as string) ||
          (meta.first_name as string) ||
          (fullName ? fullName.split(' ')[0] : null),
        last_name:
          (onboardingData.last_name as string) ||
          (meta.last_name as string) ||
          (fullName ? fullName.split(' ').slice(1).join(' ') || null : null),
        avatar_url: (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
        role: (onboardingData.role as string) ?? null,
        city: (onboardingData.city as string) ?? null,
        budget_max: typeof onboardingData.budget_max === 'number' ? onboardingData.budget_max : null,
        onboarding_completed: true,
        matching_data: onboardingData.matching_data ?? null,
      })

      if (error) {
        console.error('[finalize] upsert failed:', error.message)
        setErrorMsg(`Erreur de sauvegarde : ${error.message}`)
        return
      }

      try { localStorage.removeItem('isaly_onboarding_data') } catch {}
      router.push('/app/dashboard-home')
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
          <div className="text-[48px] mb-4"><Emoji native="⚠️" /></div>
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
        <div className="text-[48px] mb-4"><Emoji native="✨" /></div>
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
