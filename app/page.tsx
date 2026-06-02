'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import CompatibilityQuiz from '@/components/landing/CompatibilityQuiz'

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    const onMouse = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('scroll', onScroll)
    window.addEventListener('mousemove', onMouse)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('mousemove', onMouse) }
  }, [])

  return (
    <div style={{ fontFamily: "'Inter', 'DM Sans', sans-serif", background: '#0A0A0A', color: '#fff', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* Gradient cursor follower */}
      <div style={{
        position: 'fixed',
        width: '600px', height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
        left: mousePos.x - 300,
        top: mousePos.y - 300,
        pointerEvents: 'none',
        zIndex: 0,
        transition: 'left 0.3s ease, top 0.3s ease',
      }} />

      {/* NAVBAR */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 40px',
        height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        background: scrolled ? 'rgba(10,10,10,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link href="/auth/login" style={{
            color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '14px',
            padding: '8px 16px', borderRadius: '8px', transition: 'color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
          >
            Connexion
          </Link>
          <Link href="/auth/register" style={{
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600,
            padding: '9px 20px', borderRadius: '10px',
            boxShadow: '0 0 20px rgba(16,185,129,0.3)',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(16,185,129,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 20px rgba(16,185,129,0.3)' }}
          >
            Commencer
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', textAlign: 'center', position: 'relative' }}>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: '20px', padding: '6px 16px',
          fontSize: '13px', color: '#10B981', fontWeight: 500,
          marginBottom: '32px',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          ✦ La colocation sans mauvaises surprises
        </div>

        {/* Titre principal */}
        <h1 style={{ margin: '0 0 24px', lineHeight: 1.05, maxWidth: '820px' }}>
          <span style={{ display: 'block', fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(52px, 8vw, 96px)', fontWeight: 400, color: '#fff', letterSpacing: '-2px' }}>
            Ta coloc idéale
          </span>
          <span style={{ display: 'block', fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(52px, 8vw, 96px)', fontWeight: 400, letterSpacing: '-2px', background: 'linear-gradient(135deg, #10B981, #34D399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            existe déjà.
          </span>
        </h1>

        <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(255,255,255,0.5)', maxWidth: '520px', lineHeight: 1.7, margin: '0 0 48px' }}>
          Fini les conflits de mode de vie. ISALY analyse ta personnalité et tes habitudes pour te matcher uniquement avec des personnes vraiment compatibles avec toi.
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '80px' }}>
          <Link href="/auth/register" style={{
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#fff', textDecoration: 'none', fontSize: '16px', fontWeight: 600,
            padding: '14px 32px', borderRadius: '12px',
            boxShadow: '0 0 40px rgba(16,185,129,0.4)',
            display: 'flex', alignItems: 'center', gap: '8px',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(16,185,129,0.6)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 40px rgba(16,185,129,0.4)' }}
          >
            Trouver ma coloc — gratuit →
          </Link>
          <Link href="/auth/login" style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '16px', fontWeight: 500,
            padding: '14px 32px', borderRadius: '12px',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
          >
            Se connecter
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { value: '9 sur 10', label: 'colocataires satisfaits' },
            { value: '3 jours', label: 'pour trouver un match' },
            { value: '100%', label: 'gratuit pour commencer' },
            { value: '0 conflit', label: 'grâce au matching' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '32px', color: '#fff', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
          <div style={{ width: '1px', height: '40px', background: 'linear-gradient(to bottom, rgba(16,185,129,0.5), transparent)' }} />
          Défiler
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section style={{ padding: '120px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px', color: '#10B981', marginBottom: '16px' }}>PROCESSUS</div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 400, color: '#fff', margin: 0, letterSpacing: '-1px' }}>
            De la recherche à l&apos;emménagement
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2px' }}>
          {[
            { num: '01', title: 'Ton profil en 5 min', desc: 'Réponds à 7 questions sur ton rythme de vie. Pas de blabla — juste ce qui compte vraiment pour vivre ensemble.' },
            { num: '02', title: 'Swipe. Matche. Parle.', desc: 'Notre algorithme calcule ta compatibilité réelle avant même que tu ne swipes. Tu ne vois que les profils qui te correspondent.' },
            { num: '03', title: 'Emménage sans stress', desc: "Bail, loyers, maintenance — tout est dans l'app. Tu gères ta coloc comme un pro, sans email, sans tableur." },
          ].map((step, i) => (
            <div key={i}
              style={{
                padding: '48px 40px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: i === 0 ? '16px 0 0 16px' : i === 2 ? '0 16px 16px 0' : '0',
                position: 'relative',
                overflow: 'hidden',
                transition: 'background 0.3s',
                cursor: 'default',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
            >
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '72px', color: 'rgba(16,185,129,0.08)', position: 'absolute', top: '16px', right: '24px', lineHeight: 1 }}>{step.num}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#10B981', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '2px' }}>{step.num}</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', color: '#fff', marginBottom: '12px', fontWeight: 400 }}>{step.title}</div>
              <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '120px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px', color: '#10B981', marginBottom: '16px' }}>FONCTIONNALITÉS</div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 400, color: '#fff', margin: 0, letterSpacing: '-1px' }}>
            Pensé pour que ça marche vraiment
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {[
            { icon: '🎯', title: 'Matching intelligent', desc: 'Compatibilité calculée sur 40+ critères de mode de vie. Pas de hasard, que des bonnes rencontres.' },
            { icon: '💬', title: 'Messagerie temps réel', desc: "Parle, réagis, propose une coloc — tout depuis l'app. Sans donner ton numéro." },
            { icon: '🗺️', title: 'Carte des annonces', desc: 'Trouve un logement près de toi sur une carte interactive. Filtre par budget, surface et disponibilité.' },
            { icon: '📁', title: 'Dossier numérique', desc: 'Ton dossier locataire toujours prêt. Partage-le en un clic, sans rien imprimer.' },
            { icon: '🏠', title: 'Gestion du bail', desc: 'Loyers, charges, signalements — tout centralisé. Ton proprio appréciera autant que toi.' },
            { icon: '🔒', title: 'Certification 3 niveaux', desc: 'Plus ton profil est certifié, plus tu inspires confiance. Les loueurs le voient.' },
          ].map((feat, i) => (
            <div key={i}
              style={{
                padding: '32px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                transition: 'all 0.3s',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(16,185,129,0.05)'
                e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)'
                e.currentTarget.style.transform = 'translateY(-4px)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.transform = ''
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>{feat.icon}</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '22px', color: '#fff', marginBottom: '10px', fontWeight: 400 }}>{feat.title}</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{feat.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TÉMOIGNAGES */}
      <section style={{ padding: '120px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px', color: '#10B981', marginBottom: '16px' }}>TÉMOIGNAGES</div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 400, color: '#fff', margin: 0, letterSpacing: '-1px' }}>
            Ils ne cherchent plus
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {[
            { name: 'Sophie M.', role: 'Étudiante, Lyon', text: "En 3 jours j'avais trouvé ma colocataire. Le score de compatibilité était à 91% et 6 mois plus tard on est toujours aussi bien ensemble.", photo: '/pictures/meuf.jpg' },
            { name: 'Thomas R.', role: 'Développeur, Paris', text: "J'avais essayé Le Bon Coin, Facebook, tout. Sur ISALY j'ai eu mon premier match en moins d'une heure.", photo: '/pictures/mec.jpg' },
            { name: 'Léa K.', role: 'Designer, Bordeaux', text: "La gestion du bail dans l'app m'a évité 50 emails avec mon proprio. Je recommande à tous ceux qui veulent une coloc sans prise de tête.", photo: '/pictures/meuf2.jpg' },
          ].map((t, i) => (
            <div key={i} style={{
              padding: '32px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
            }}>
              <div style={{ fontSize: '24px', color: '#10B981', marginBottom: '16px', fontFamily: "'Outfit', sans-serif" }}>&ldquo;</div>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, margin: '0 0 24px' }}>{t.text}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={t.photo} alt={t.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={(e) => { e.currentTarget.style.display = 'none' }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{t.name}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CALCULATEUR */}
      <section style={{ padding: '120px 24px', maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px', color: '#10B981', marginBottom: '16px' }}>ESSAIE MAINTENANT</div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-1px' }}>
            Ton score de compatibilité
          </h2>
        </div>
        <CompatibilityQuiz />
      </section>

      {/* PRICING */}
      <section style={{ padding: '120px 24px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px', color: '#10B981', marginBottom: '16px' }}>TARIFS</div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-1px' }}>
            Zéro surprise sur la facture
          </h2>
        </div>

        {/* BLOC 1 — LOCATAIRES */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '2px', whiteSpace: 'nowrap' }}>
              Pour les locataires
            </div>
            <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>
          <div style={{
            background: 'rgba(16,185,129,0.05)',
            border: '1px solid rgba(16,185,129,0.15)',
            borderRadius: '20px',
            padding: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '32px',
          }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#10B981', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>LOCATAIRE</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '64px', fontWeight: 700, color: '#fff', lineHeight: 1, marginBottom: '6px' }}>Gratuit</div>
              <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', marginBottom: '24px' }}>pour toujours — aucune carte requise</div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: '400px', margin: '0 0 24px' }}>
                Swipe, matche, contacte les loueurs et gère ton bail. Tout est gratuit. On prend uniquement <span style={{ color: '#10B981', fontWeight: 600 }}>2,5% du loyer mensuel</span> à la signature du bail — comme une assurance dossier incluse.
              </p>
              <Link href="/auth/register" style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff', textDecoration: 'none', fontSize: '15px', fontWeight: 600,
                padding: '13px 28px', borderRadius: '12px',
                boxShadow: '0 0 30px rgba(16,185,129,0.3)',
              }}>
                Commencer gratuitement →
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '240px' }}>
              {['Swipe & matching illimité', 'Messagerie intégrée', 'Dossier numérique complet', 'Carte des annonces', 'Gestion du bail incluse', 'Support par chat'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                  <span style={{ color: '#10B981', fontWeight: 700, fontSize: '16px' }}>✓</span> {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BLOC 2 — LOUEURS */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '2px', whiteSpace: 'nowrap' }}>
              Pour les loueurs — mise en avant facultative
            </div>
            <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>
          <p style={{ textAlign: 'center', fontSize: '14px', color: 'rgba(255,255,255,0.35)', marginBottom: '28px' }}>
            Publier une annonce est gratuit. Ces options sont facultatives pour accélérer ta mise en location.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {[
              {
                name: 'Essentiel',
                price: '9,99€',
                period: 'par mois',
                desc: 'Ton annonce vue par plus de locataires',
                features: ['Annonce boostée dans le feed swipe', 'Visible en priorité dans la recherche', 'Badge "Mis en avant"', 'Accès aux dossiers certifiés', 'Messagerie directe'],
                cta: 'Booster mon annonce',
                href: '/auth/register?plan=essentiel',
                highlighted: false,
              },
              {
                name: 'Prioritaire',
                price: '24,99€',
                period: 'par mois',
                desc: 'Visibilité maximale, résultats garantis',
                features: ['Tout Essentiel inclus', 'Position #1 dans le matching', 'Badge "Prioritaire" visible', 'Mis en avant sur la carte', 'Stats détaillées', 'Support 7j/7'],
                cta: 'Choisir Prioritaire',
                href: '/auth/register?plan=prioritaire',
                highlighted: true,
              },
            ].map((plan, i) => (
              <div key={i} style={{
                padding: '32px',
                background: plan.highlighted ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${plan.highlighted ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: '16px',
                position: 'relative',
              }}>
                {plan.highlighted && (
                  <div style={{ position: 'absolute', top: '16px', right: '16px', background: '#10B981', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>
                    MEILLEURE OFFRE
                  </div>
                )}
                <div style={{ fontSize: '13px', fontWeight: 600, color: plan.highlighted ? '#10B981' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>{plan.name}</div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '40px', fontWeight: 700, color: '#fff', lineHeight: 1, marginBottom: '4px' }}>{plan.price}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>{plan.period}</div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>{plan.desc}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.65)' }}>
                      <span style={{ color: '#10B981', fontWeight: 700 }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                <Link href={plan.href} style={{
                  display: 'block', textAlign: 'center',
                  background: plan.highlighted ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255,255,255,0.06)',
                  color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600,
                  padding: '13px', borderRadius: '10px',
                  border: plan.highlighted ? 'none' : '1px solid rgba(255,255,255,0.1)',
                }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: '120px 24px', textAlign: 'center', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px', color: '#10B981', marginBottom: '24px' }}>REJOINS-NOUS</div>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(40px, 6vw, 72px)', fontWeight: 400, color: '#fff', margin: '0 0 24px', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
          La vie en coloc<br />commence ici.
        </h2>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.45)', maxWidth: '440px', margin: '0 auto 48px', lineHeight: 1.7 }}>
          Des milliers de personnes ont déjà trouvé leur colocataire parfait. Ta prochaine chambre t&apos;attend.
        </p>
        <Link href="/auth/register" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          color: '#fff', textDecoration: 'none', fontSize: '17px', fontWeight: 700,
          padding: '16px 40px', borderRadius: '14px',
          boxShadow: '0 0 60px rgba(16,185,129,0.4)',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 0 80px rgba(16,185,129,0.6)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 60px rgba(16,185,129,0.4)' }}
        >
          Créer mon compte — c&apos;est gratuit →
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px' }}>
        {[
          { label: 'Confidentialité', href: '/confidentialite' },
          { label: 'CGU', href: '/cgu' },
          { label: 'Contact', href: '/contact' },
        ].map(link => (
          <Link key={link.label} href={link.href} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          >{link.label}</Link>
        ))}
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  )
}
