'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Emoji from '@/components/ui/Emoji'

function translateError(msg: string): string {
  if (!msg) return 'Une erreur inconnue est survenue.'
  if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('User already registered')) return 'Cet email est déjà utilisé. Connecte-toi plutôt.'
  if (msg.includes('invalid email') || msg.includes('Invalid email')) return 'Adresse email invalide.'
  if (msg.includes('Password should be at least') || msg.includes('password')) return 'Le mot de passe doit contenir au moins 8 caractères.'
  if (msg.includes('signup_disabled')) return 'Les inscriptions sont temporairement désactivées.'
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Trop de tentatives. Attends quelques minutes.'
  if (msg.includes('network') || msg.includes('fetch')) return 'Erreur réseau. Vérifie ta connexion.'
  if (msg.includes('Email not confirmed')) return 'Email non confirmé. Vérifie ta boîte mail.'
  return `Erreur : ${msg}`
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const ref = new URLSearchParams(window.location.search).get('ref')
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { first_name: form.firstName, last_name: form.lastName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (signUpError) {
      console.error('Supabase signUp error:', signUpError)
      setError(translateError(signUpError.message))
      setLoading(false)
      return
    }
    const newUser = data.user
    const hasSession = !!data.session

    if (newUser && ref) {
      try {
        await fetch('/api/referral/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ref }),
        })
      } catch {}
    }

    // Email confirmation disabled in Supabase → session is immediate, redirect directly
    if (hasSession) {
      router.push('/onboarding')
      return
    }

    // Email confirmation enabled → send custom Resend email
    try {
      const res = await fetch('/api/email/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, firstName: form.firstName }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        console.warn('Email confirm API error:', json)
      }
    } catch (emailErr) {
      console.warn('Email confirm failed (non-blocking):', emailErr)
    }
    setEmailSent(true)
    setLoading(false)
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    const supabase = createClient()
    const ref = new URLSearchParams(window.location.search).get('ref')
    const callbackUrl = ref
      ? `${window.location.origin}/auth/callback?ref=${encodeURIComponent(ref)}`
      : `${window.location.origin}/auth/callback`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
        queryParams: { prompt: 'select_account' },
      },
    })
  }

  if (emailSent) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <div style={{ fontSize: '56px', marginBottom: '24px' }}><Emoji native="📬" /></div>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Vérifie ton email</h1>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: '32px' }}>
          On a envoyé un lien de confirmation à <span style={{ color: '#10B981', fontWeight: 600 }}>{form.email}</span>. Clique dessus pour activer ton compte.
        </p>
        <Link href="/auth/login" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', textDecoration: 'none', fontSize: '15px', fontWeight: 600, padding: '13px 32px', borderRadius: '12px', boxShadow: '0 0 30px rgba(16,185,129,0.3)' }}>
          Aller à la connexion
        </Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", position: 'relative', overflow: 'hidden' }}>

      {/* Glow background */}
      <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Form */}
      <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%' }}>

          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.5px' }}>Créer un compte</h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
              Déjà inscrit ?{' '}
              <Link href="/auth/login" style={{ color: '#10B981', textDecoration: 'none', fontWeight: 600 }}>Se connecter</Link>
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
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { key: 'firstName', placeholder: 'Prénom', type: 'text' },
                { key: 'lastName', placeholder: 'Nom', type: 'text' },
              ].map(field => (
                <input
                  key={field.key}
                  type={field.type}
                  placeholder={field.placeholder}
                  value={(form as any)[field.key]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
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
              ))}
            </div>
            {[
              { key: 'email', placeholder: 'ton@email.com', type: 'email' },
              { key: 'password', placeholder: 'Mot de passe (8 caractères min)', type: 'password' },
            ].map(field => (
              <input
                key={field.key}
                type={field.type}
                placeholder={field.placeholder}
                value={(form as any)[field.key]}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                required
                minLength={field.key === 'password' ? 8 : undefined}
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
            ))}

            {error && (
              <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '4px',
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
              {loading ? 'Création...' : 'Créer mon compte →'}
            </button>
          </form>

          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: '20px', lineHeight: 1.6 }}>
            En créant un compte, tu acceptes nos{' '}
            <a href="/cgu" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>CGU</a>
            {' '}et notre{' '}
            <a href="/confidentialite" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>politique de confidentialité</a>.
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
