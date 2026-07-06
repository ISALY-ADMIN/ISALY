'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Emoji from '@/components/ui/Emoji'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/email/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (!res.ok) {
      setError('Une erreur est survenue. Réessaie.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
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

        {sent ? (
          <>
            <div className="text-[52px] mb-4"><Emoji native="📬" /></div>
            <h2 className="text-[22px] mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
              Email envoyé !
            </h2>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
              Si un compte existe pour <strong>{email}</strong>, tu vas recevoir un lien pour réinitialiser ton mot de passe.
            </p>
            <Link
              href="/auth/login"
              className="block w-full py-3.5 rounded-full text-[14.5px] font-semibold text-white no-underline text-center"
              style={{ background: '#4ECBA0' }}
            >
              Retour à la connexion
            </Link>
          </>
        ) : (
          <>
            <div className="text-[44px] mb-4"><Emoji native="🔐" /></div>
            <h2 className="text-[22px] mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
              Mot de passe oublié ?
            </h2>
            <p className="text-sm mb-7" style={{ color: '#6B7280' }}>
              Entre ton adresse email, on t&apos;envoie un lien pour en choisir un nouveau.
            </p>

            <form onSubmit={handleSubmit}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ton@email.com"
                className="w-full px-4 py-3 border-[1.5px] rounded-[9px] text-sm mb-3 outline-none transition-colors"
                style={{ borderColor: '#E5E7EB' }}
                onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                required
              />
              {error && (
                <p className="text-xs mb-3 text-left" style={{ color: '#EF4444' }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-full text-[14.5px] font-semibold text-white border-none cursor-pointer transition-colors disabled:opacity-60"
                style={{ background: '#4ECBA0' }}
              >
                {loading ? 'Envoi…' : 'Envoyer le lien'}
              </button>
            </form>

            <p className="text-[13px] mt-4" style={{ color: '#6B7280' }}>
              <Link href="/auth/login" className="font-bold no-underline" style={{ color: '#2AA87C' }}>
                ← Retour à la connexion
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
