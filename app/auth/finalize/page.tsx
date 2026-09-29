'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Icon } from '@/components/ui-v2'
import { SiteRoot } from '@/components/ui-v2/public'

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

      const role = (onboardingData.role as string) ?? null

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
        role,
        city: (onboardingData.city as string) ?? null,
        budget_max: typeof onboardingData.budget_max === 'number' ? onboardingData.budget_max : null,
        onboarding_completed: true,
        // L'utilisateur vient de répondre à la question de rôle dans
        // l'onboarding : sans cet horodatage, RoleGate la lui reposerait
        // immédiatement après l'inscription.
        ...(role ? { role_confirmed_at: new Date().toISOString() } : {}),
        matching_data: onboardingData.matching_data ?? null,
      })

      if (error) {
        console.error('[finalize] upsert failed:', error.message)
        setErrorMsg(`Erreur de sauvegarde : ${error.message}`)
        return
      }

      // Intent loueur collecté à l'onboarding (migration 38). Écriture séparée
      // et best-effort : si la colonne n'existe pas encore, l'inscription
      // aboutit quand même.
      if (role === 'loueur' && onboardingData.owner_intent) {
        try {
          await supabase.from('profiles').update({ owner_intent: onboardingData.owner_intent }).eq('id', user.id)
        } catch { /* noop */ }
      }

      try { localStorage.removeItem('isaly_onboarding_data') } catch {}
      // Un loueur qui vient de s'inscrire part créer sa première annonce.
      router.push(role === 'loueur' ? '/app/annonce' : '/app/dashboard-home')
    }

    finalize()
  }, [router])

  // Site v2 : écran d'attente et d'erreur dans le style des retours de paiement (.pay-card).
  if (errorMsg) {
    return (
      <SiteRoot>
        <main className="pay" id="contenu">
          <div className="pay-card">
            <span className="okring off"><Icon name="alert" /></span>
            <h1>Problème de sauvegarde</h1>
            <div className="alert" role="alert" style={{ textAlign: 'left' }}><Icon name="alert" size={18} /><span>{errorMsg}</span></div>
            <button className="btn btn-main" type="button" onClick={() => router.push('/app/swipe')}>
              Continuer quand même<Icon name="arrow" size={18} />
            </button>
          </div>
        </main>
      </SiteRoot>
    )
  }

  return (
    <SiteRoot>
      <main className="pay" id="contenu">
        <div className="pay-card" role="status">
          <span className="okring"><Icon name="spark" /></span>
          <h1>Création de ton profil…</h1>
          <p>On sauvegarde tes préférences, c’est rapide.</p>
          <span className="skel" style={{ display: 'block', width: '70%', height: 8, borderRadius: 999 }} aria-hidden="true" />
        </div>
      </main>
    </SiteRoot>
  )
}

/* [HIDDEN] Ancienne version (avant le site v2), conservée pour référence :
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

      const role = (onboardingData.role as string) ?? null

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
        role,
        city: (onboardingData.city as string) ?? null,
        budget_max: typeof onboardingData.budget_max === 'number' ? onboardingData.budget_max : null,
        onboarding_completed: true,
        // L'utilisateur vient de répondre à la question de rôle dans
        // l'onboarding : sans cet horodatage, RoleGate la lui reposerait
        // immédiatement après l'inscription.
        ...(role ? { role_confirmed_at: new Date().toISOString() } : {}),
        matching_data: onboardingData.matching_data ?? null,
      })

      if (error) {
        console.error('[finalize] upsert failed:', error.message)
        setErrorMsg(`Erreur de sauvegarde : ${error.message}`)
        return
      }

      // Intent loueur collecté à l'onboarding (migration 38). Écriture séparée
      // et best-effort : si la colonne n'existe pas encore, l'inscription
      // aboutit quand même.
      if (role === 'loueur' && onboardingData.owner_intent) {
        try {
          await supabase.from('profiles').update({ owner_intent: onboardingData.owner_intent }).eq('id', user.id)
        } catch { /* noop * / }
      }

      try { localStorage.removeItem('isaly_onboarding_data') } catch {}
      // Un loueur qui vient de s'inscrire part créer sa première annonce.
      router.push(role === 'loueur' ? '/app/annonce' : '/app/dashboard-home')
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
*/
