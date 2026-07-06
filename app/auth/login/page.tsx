'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Emoji from '@/components/ui/Emoji'

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.'
  if (msg.includes('Too many requests')) return 'Trop de tentatives. Réessaie dans quelques minutes.'
  if (msg.includes('User not found')) return 'Aucun compte trouvé avec cet email.'
  return 'Une erreur est survenue. Réessaie.'
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
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
    const supabase = createClient()

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
      router.push('/auth/finalize')
    }
  }

  async function handleResend() {
    if (!email) { setError('Entre ton email ci-dessus pour renvoyer la confirmation.'); return }
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
    setGoogleLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", position: 'relative', overflow: 'hidden' }}>

      {/* Glow background */}
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Form */}
      <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%' }}>

          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.5px' }}>Bon retour <Emoji native="👋" /></h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
              Pas encore de compte ?{' '}
              <Link href="/auth/register" style={{ color: '#10B981', textDecoration: 'none', fontWeight: 600 }}>Créer un compte</Link>
            </p>
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            style={{
              width: '100%', padding: '13px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontSize: '15px', fontWeight: 500,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              marginBottom: '24px', transition: 'all 0.2s',
              fontFamily: "'Outfit', sans-serif",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {googleLoading ? 'Redirection...' : 'Continuer avec Google'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>ou par email</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="email"
              placeholder="ton@email.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailUnconfirmed(false); setResendDone(false) }}
              required
              style={{
                padding: '13px 16px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: '15px', outline: 'none',
                fontFamily: "'Outfit', sans-serif",
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                padding: '13px 16px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: '15px', outline: 'none',
                fontFamily: "'Outfit', sans-serif",
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />

            {/* Email non confirmé */}
            {emailUnconfirmed && (
              <div style={{ padding: '14px 16px', borderRadius: '10px', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#FB923C', margin: '0 0 6px' }}><Emoji native="📬" /> Email non confirmé</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '0 0 10px', lineHeight: 1.5 }}>
                  Vérifie ta boîte mail et clique sur le lien de confirmation avant de te connecter.
                </p>
                {resendDone ? (
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#10B981', margin: 0 }}>✓ Email renvoyé ! Vérifie ta boîte mail.</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    style={{ fontSize: '13px', fontWeight: 600, color: '#FB923C', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: "'Outfit', sans-serif", opacity: resending ? 0.6 : 1 }}
                  >
                    {resending ? 'Envoi…' : "Renvoyer l'email de confirmation →"}
                  </button>
                )}
              </div>
            )}

            {error && (
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <div style={{ textAlign: 'right' }}>
              <Link href="/auth/forgot-password" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '14px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff', fontSize: '15px', fontWeight: 700,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 0 30px rgba(16,185,129,0.3)',
                fontFamily: "'Outfit', sans-serif",
                transition: 'all 0.2s',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 0 50px rgba(16,185,129,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 30px rgba(16,185,129,0.3)' }}
            >
              {loading ? 'Connexion...' : 'Se connecter →'}
            </button>
          </form>

          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: '20px', lineHeight: 1.6 }}>
            Protégé par{' '}
            <a href="/confidentialite" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>la politique de confidentialité</a>
            {' '}d&apos;ISALY.
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) { .hidden { display: none !important; } }
        input::placeholder { color: rgba(255,255,255,0.25); }
      `}</style>
    </div>
  )
}
