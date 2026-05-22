'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailUnconfirmed, setEmailUnconfirmed] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendDone, setResendDone] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setEmailUnconfirmed(false)
    setResendDone(false)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setEmailUnconfirmed(true)
      } else {
        setError(translateError(error.message))
      }
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()

    if (profile?.onboarding_completed === true) {
      router.push('/app/swipe')
    } else {
      // Onboarding data may be in localStorage from a prior questionnaire session
      router.push('/auth/finalize')
    }
  }

  async function handleResend() {
    if (!email) {
      setError('Entre ton email ci-dessus pour renvoyer la confirmation.')
      return
    }
    setResending(true)
    await fetch('/api/email/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => {})
    setResending(false)
    setResendDone(true)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    })
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
        <div className="flex justify-center mb-4">
          <Image src="/LOGO_ISALY.png" alt="ISALY" height={36} width={120} style={{ width: 'auto', height: '36px', objectFit: 'contain' }} />
        </div>
        <p className="text-sm mb-7" style={{ color: '#6B7280' }}>Connexion à ton espace</p>

        {/* Google */}
        <button
          onClick={handleGoogle}
          className="w-full py-3 rounded-full text-sm font-medium cursor-pointer flex items-center justify-center gap-2.5 bg-white transition-all border-[1.5px]"
          style={{ borderColor: '#E5E7EB' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#4285F4'; e.currentTarget.style.background = '#f8f9ff' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#fff' }}
        >
          <span style={{ width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, background: 'conic-gradient(#4285F4 0 90deg,#EA4335 0 180deg,#FBBC05 0 270deg,#34A853 0 360deg)', display: 'inline-block' }} />
          Continuer avec Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3.5 my-5">
          <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
          <span className="text-[12.5px]" style={{ color: '#6B7280' }}>ou par email</span>
          <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleLogin}>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setEmailUnconfirmed(false); setResendDone(false) }}
            placeholder="ton@email.com"
            className="w-full px-4 py-3 border-[1.5px] rounded-[9px] text-sm mb-3 outline-none transition-colors"
            style={{ borderColor: '#E5E7EB' }}
            onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
            onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
            required
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="w-full px-4 py-3 border-[1.5px] rounded-[9px] text-sm mb-3 outline-none transition-colors"
            style={{ borderColor: '#E5E7EB' }}
            onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
            onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
            required
          />

          {/* Email not confirmed block */}
          {emailUnconfirmed && (
            <div
              className="rounded-[10px] p-3.5 mb-3 text-left"
              style={{ background: '#FFF7ED', border: '1.5px solid #FED7AA' }}
            >
              <p className="text-[12.5px] font-semibold mb-1" style={{ color: '#C2410C' }}>
                📬 Email non confirmé
              </p>
              <p className="text-[12px] mb-2.5" style={{ color: '#9A3412' }}>
                Vérifie ta boîte mail et clique sur le lien de confirmation avant de te connecter.
              </p>
              {resendDone ? (
                <p className="text-[12px] font-semibold" style={{ color: '#16A34A' }}>
                  ✓ Email renvoyé ! Vérifie ta boîte mail.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-[12px] font-semibold underline cursor-pointer border-none bg-transparent disabled:opacity-60"
                  style={{ color: '#C2410C' }}
                >
                  {resending ? 'Envoi…' : 'Renvoyer l\'email de confirmation →'}
                </button>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs mb-3 text-left" style={{ color: '#EF4444' }}>{error}</p>
          )}

          <div className="text-right mb-3">
            <Link href="/auth/forgot-password" className="text-[12.5px] no-underline" style={{ color: '#9CA3AF' }}>
              Mot de passe oublié ?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full text-[14.5px] font-semibold text-white border-none cursor-pointer transition-colors disabled:opacity-60"
            style={{ background: '#4ECBA0' }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="text-[13px] mt-3.5" style={{ color: '#6B7280' }}>
          Pas de compte ?{' '}
          <Link href="/auth/register" className="font-bold no-underline" style={{ color: '#2AA87C' }}>
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.'
  if (msg.includes('Too many requests')) return 'Trop de tentatives. Réessaie dans quelques minutes.'
  if (msg.includes('User not found')) return 'Aucun compte trouvé avec cet email.'
  return msg
}
