'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: 'Avis général', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Erreur')
      setSent(true)
    } catch {
      setError('Une erreur est survenue. Réessaie dans quelques instants.')
    }
    setSending(false)
  }

  if (sent) return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ textAlign: 'center', maxWidth: '420px', padding: '24px' }}>
        <div style={{ fontSize: '56px', marginBottom: '24px' }}>✅</div>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Message envoyé !</h1>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, marginBottom: '32px' }}>
          Merci pour ton retour. On lira ton message avec attention.
        </p>
        <Link href="/" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', textDecoration: 'none', fontSize: '15px', fontWeight: 600, padding: '13px 32px', borderRadius: '12px' }}>
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', fontFamily: "'Outfit', sans-serif", color: '#fff' }}>
      <nav style={{ padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>← Retour</Link>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '18px', color: '#fff' }}>ISALY</span>
        <div style={{ width: '60px' }} />
      </nav>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px', color: '#10B981', marginBottom: '16px' }}>CONTACT</div>
        <h1 style={{ fontSize: '48px', fontWeight: 700, marginBottom: '12px', letterSpacing: '-1px' }}>Écris-nous</h1>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.45)', marginBottom: '48px', lineHeight: 1.7 }}>
          Un avis, une question, un bug ? On lit tous les messages.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Ton prénom</label>
              <input
                type="text" required placeholder="Sophie"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{ width: '100%', padding: '13px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '15px', outline: 'none', fontFamily: "'Outfit', sans-serif", boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Ton email</label>
              <input
                type="email" required placeholder="ton@email.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={{ width: '100%', padding: '13px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '15px', outline: 'none', fontFamily: "'Outfit', sans-serif", boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Sujet</label>
            <select
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              style={{ width: '100%', padding: '13px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '15px', outline: 'none', fontFamily: "'Outfit', sans-serif" }}
              onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            >
              <option value="Avis général" style={{ background: '#1A1A1A' }}>💬 Avis général</option>
              <option value="Bug ou problème technique" style={{ background: '#1A1A1A' }}>🐛 Bug ou problème technique</option>
              <option value="Suggestion de fonctionnalité" style={{ background: '#1A1A1A' }}>💡 Suggestion de fonctionnalité</option>
              <option value="Question sur mon compte" style={{ background: '#1A1A1A' }}>👤 Question sur mon compte</option>
              <option value="Partenariat" style={{ background: '#1A1A1A' }}>🤝 Partenariat</option>
              <option value="Autre" style={{ background: '#1A1A1A' }}>📌 Autre</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>Ton message</label>
            <textarea
              required rows={6}
              placeholder="Dis-nous tout..."
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              style={{ width: '100%', padding: '13px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '15px', outline: 'none', fontFamily: "'Outfit', sans-serif", resize: 'none', boxSizing: 'border-box', lineHeight: 1.7 }}
              onFocus={e => (e.target.style.borderColor = 'rgba(16,185,129,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={sending}
            style={{ padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', fontSize: '15px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 0 30px rgba(16,185,129,0.3)', fontFamily: "'Outfit', sans-serif", opacity: sending ? 0.7 : 1, transition: 'all 0.2s' }}
          >
            {sending ? 'Envoi en cours...' : 'Envoyer mon message →'}
          </button>
        </form>

        <style>{`input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); } select option { background: #1A1A1A; }`}</style>
      </div>
    </div>
  )
}
