'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/ui-v2'
import { PublicLayout } from '@/components/ui-v2/public'

const SUBJECTS = ['Question sur ISALY', 'Je suis bailleur', 'Agence partenaire', 'Presse', 'Autre']

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: SUBJECTS[0], message: '' })
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
    <PublicLayout>
      <div className="err" style={{ minHeight: '60vh' }}>
        <div className="in">
          <span className="okring"><Icon name="check" /></span>
          <h1>Message envoyé</h1>
          <p>Merci&#8239;! On te répond par e-mail dès que possible.</p>
          <Link className="btn btn-glass" href="/">Retour à l’accueil</Link>
        </div>
      </div>
    </PublicLayout>
  )

  return (
    <PublicLayout>
      <div className="wrap">
        <div style={{ padding: '36px 0 0' }}>
          <h1 className="h1">Contacte-nous</h1>
          <p className="lede">Une question sur ISALY, un logement à proposer, un partenariat&#8239;? Écris-nous.</p>
        </div>
        <div className="v-grid wide-l mt">
          <form className="panel form" onSubmit={handleSubmit}>
            <div className="f2">
              <div className="field">
                <label htmlFor="cn">Prénom</label>
                <input id="cn" className="input" autoComplete="given-name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="field">
                <label htmlFor="ce">E-mail</label>
                <input id="ce" className="input" type="email" autoComplete="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="cs">Sujet</label>
              <select id="cs" className="select" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cm">Message</label>
              <textarea id="cm" className="textarea" required style={{ minHeight: 160 }} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
            </div>
            {error && (
              <div className="alert" role="alert"><Icon name="alert" size={18} /><span>{error}</span></div>
            )}
            <button className="btn btn-main" type="submit" disabled={sending}>
              <Icon name="send" size={18} />{sending ? 'Envoi en cours…' : 'Envoyer'}
            </button>
          </form>
          <div className="stackv" style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
            <section className="panel">
              <div className="phead"><h2>Avant d’écrire</h2></div>
              <div className="rows">
                <a className="row" href="/#faq" style={{ textDecoration: 'none' }}>
                  <span className="ico brand"><Icon name="book" size={18} /></span>
                  <span className="grow"><span className="t">Questions fréquentes</span><span className="s">Les réponses aux questions les plus courantes</span></span>
                </a>
                <div className="row">
                  <span className="ico"><Icon name="clock" size={18} /></span>
                  <span className="grow"><span className="t">Réponse par e-mail</span><span className="s">À l’adresse que tu indiques</span></span>
                </div>
              </div>
            </section>
            <section className="panel">
              <div className="phead"><h2>Agences immobilières</h2></div>
              <p className="soft">Tu veux devenir agence partenaire d’ISALY dans ta ville&#8239;? Choisis le sujet « Agence partenaire ».</p>
            </section>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}

/* [HIDDEN] Ancienne version (avant le site v2), conservée pour référence :
'use client'
import { useState } from 'react'
import Link from 'next/link'
import Emoji from '@/components/ui/Emoji'
import RiseText from '@/components/motion/RiseText'

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
        <div style={{ fontSize: '56px', marginBottom: '24px' }}><Emoji native="✅" /></div>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}><RiseText mode="load" text="Message envoyé !" /></h1>
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
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500, color: '#fff', textDecoration: 'none', padding: '8px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', transition: 'background 0.15s, border-color 0.15s', cursor: 'pointer' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
        >← Retour</Link>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '18px', color: '#fff' }}>ISALY</span>
        <div style={{ width: '60px' }} />
      </nav>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px', color: '#10B981', marginBottom: '16px' }}>CONTACT</div>
        <h1 style={{ fontSize: '48px', fontWeight: 700, marginBottom: '12px', letterSpacing: '-1px' }}><RiseText mode="load" text="Écris-nous" /></h1>
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
              <option value="Avis général" style={{ background: '#1A1A1A' }}><Emoji native="💬" /> Avis général</option>
              <option value="Bug ou problème technique" style={{ background: '#1A1A1A' }}><Emoji native="🐛" /> Bug ou problème technique</option>
              <option value="Suggestion de fonctionnalité" style={{ background: '#1A1A1A' }}><Emoji native="💡" /> Suggestion de fonctionnalité</option>
              <option value="Question sur mon compte" style={{ background: '#1A1A1A' }}><Emoji native="👤" /> Question sur mon compte</option>
              <option value="Partenariat" style={{ background: '#1A1A1A' }}><Emoji native="🤝" /> Partenariat</option>
              <option value="Autre" style={{ background: '#1A1A1A' }}><Emoji native="📌" /> Autre</option>
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
*/
