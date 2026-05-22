'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Erreur lors de la mise à jour. Le lien a peut-être expiré.')
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => router.push('/app/swipe'), 2500)
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

        {done ? (
          <>
            <div className="text-[52px] mb-4">✅</div>
            <h2 className="text-[22px] mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
              Mot de passe mis à jour !
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Redirection en cours…
            </p>
          </>
        ) : (
          <>
            <div className="text-[44px] mb-4">🔑</div>
            <h2 className="text-[22px] mb-2" style={{ fontFamily: "'DM Serif Display', serif", color: '#111827' }}>
              Nouveau mot de passe
            </h2>
            <p className="text-sm mb-7" style={{ color: '#6B7280' }}>
              Choisis un mot de passe sécurisé pour ton compte ISALY.
            </p>

            <form onSubmit={handleSubmit}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nouveau mot de passe (8 caractères min)"
                className="w-full px-4 py-3 border-[1.5px] rounded-[9px] text-sm mb-3 outline-none transition-colors"
                style={{ borderColor: '#E5E7EB' }}
                onFocus={e => (e.target.style.borderColor = '#4ECBA0')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                required
                minLength={8}
              />
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Confirme le mot de passe"
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
                {loading ? 'Mise à jour…' : 'Enregistrer le mot de passe'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
