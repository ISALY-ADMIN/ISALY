'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { first_name: form.firstName, last_name: form.lastName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    console.log('[register] signUp result — user:', data?.user?.email, '| session:', !!data?.session, '| error:', error?.message ?? 'none')

    // Supabase may fail to send its own confirmation email but still create the
    // user — treat this as a non-fatal error and proceed with our Resend flow.
    const isSupabaseMailError = error?.message?.includes('Error sending confirmation email')

    if (error && !isSupabaseMailError) {
      setError(translateError(error.message))
      setLoading(false)
      return
    }

    if (data.session) {
      // Email confirmation disabled in Supabase dashboard — user is auto-logged in.
      // Still send a welcome/confirmation email via Resend so the user gets something.
      console.log('[register] immediate session — sending Resend email anyway then going to finalize')
      sendConfirmEmail(form.email)
      router.push('/auth/finalize')
      return
    }

    // Email confirmation required — send via Resend (bypasses unreliable Supabase SMTP)
    const sent = await sendConfirmEmail(form.email)
    if (!sent) {
      setError('Compte créé mais l\'email de confirmation n\'a pas pu être envoyé. Essaie de te connecter directement.')
      setLoading(false)
      return
    }
    setEmailSent(true)
    setLoading(false)
  }

  async function sendConfirmEmail(email: string): Promise<boolean> {
    try {
      console.log('[register] calling /api/email/confirm for', email)
      const res = await fetch('/api/email/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      console.log('[register] /api/email/confirm response:', res.status, json)
      if (!res.ok) {
        console.error('[register] confirm email failed:', json.error)
        return false
      }
      return true
    } catch (err) {
      console.error('[register] confirm email network error:', err)
      return false
    }
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

  if (emailSent) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-5"
        style={{ background: 'linear-gradient(135deg, #edfaf4, #f7f8fa)' }}
      >
        <div
          className="bg-white rounded-[24px] w-full text-center"
          style={{ padding: '52px 44px', boxShadow: '0 8px 36px rgba(0,0,0,.13)', maxWidth: '420px' }}
        >
          <div className="text-[52px] mb-4">📬</div>
          <h2
            className="text-[22px] mb-2"
            style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}
          >
            Vérifie ton email
          </h2>
          <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
            Un lien de confirmation a été envoyé à <strong>{form.email}</strong>.
            Clique dessus pour activer ton compte, puis connecte-toi.
          </p>
          <Link
            href="/auth/login"
            className="block w-full py-3.5 rounded-full text-[14.5px] font-semibold text-white no-underline text-center"
            style={{ background: '#4ECBA0' }}
          >
            Aller à la connexion
          </Link>
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
        <div className="flex justify-center mb-4">
          <Image src="/LOGO_ISALY.png" alt="ISALY" height={36} width={120} style={{ width: 'auto', height: '36px', objectFit: 'contain' }} />
        </div>
        <p className="text-sm mb-7" style={{ color: '#6B7280' }}>Crée ton espace en quelques secondes</p>

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

        <div className="flex items-center gap-3.5 my-5">
          <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
          <span className="text-[12.5px]" style={{ color: '#6B7280' }}>ou par email</span>
          <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
        </div>

        <form onSubmit={handleRegister}>
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <input value={form.firstName} onChange={update('firstName')} placeholder="Prénom" className="px-4 py-3 border-[1.5px] rounded-[9px] text-sm outline-none transition-colors" style={{ borderColor: '#E5E7EB' }} onFocus={e => (e.target.style.borderColor = '#4ECBA0')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} required />
            <input value={form.lastName} onChange={update('lastName')} placeholder="Nom" className="px-4 py-3 border-[1.5px] rounded-[9px] text-sm outline-none transition-colors" style={{ borderColor: '#E5E7EB' }} onFocus={e => (e.target.style.borderColor = '#4ECBA0')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} required />
          </div>
          <input type="email" value={form.email} onChange={update('email')} placeholder="ton@email.com" className="w-full px-4 py-3 border-[1.5px] rounded-[9px] text-sm mb-3 outline-none transition-colors" style={{ borderColor: '#E5E7EB' }} onFocus={e => (e.target.style.borderColor = '#4ECBA0')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} required />
          <input type="password" value={form.password} onChange={update('password')} placeholder="Mot de passe (8 caractères min)" className="w-full px-4 py-3 border-[1.5px] rounded-[9px] text-sm mb-3 outline-none transition-colors" style={{ borderColor: '#E5E7EB' }} onFocus={e => (e.target.style.borderColor = '#4ECBA0')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} required minLength={8} />
          {error && <p className="text-xs mb-3 text-left" style={{ color: '#EF4444' }}>{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3.5 rounded-full text-[14.5px] font-semibold text-white border-none cursor-pointer transition-colors disabled:opacity-60" style={{ background: '#4ECBA0' }}>
            {loading ? 'Création…' : 'Créer mon compte 🚀'}
          </button>
        </form>

        <p className="text-[13px] mt-3.5" style={{ color: '#6B7280' }}>
          Déjà un compte ?{' '}
          <Link href="/auth/login" className="font-bold no-underline" style={{ color: '#2AA87C' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  )
}

function translateError(msg: string): string {
  if (msg.includes('already registered') || msg.includes('already exists')) return 'Un compte existe déjà avec cet email.'
  if (msg.includes('Password should be')) return 'Le mot de passe doit contenir au moins 8 caractères.'
  if (msg.includes('Invalid email')) return 'Adresse email invalide.'
  return msg
}
