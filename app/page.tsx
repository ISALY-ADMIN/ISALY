'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

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
          Plateforme de colocation intelligente
        </div>

        {/* Titre principal */}
        <h1 style={{ margin: '0 0 24px', lineHeight: 1.05, maxWidth: '820px' }}>
          <span style={{ display: 'block', fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(52px, 8vw, 96px)', fontWeight: 400, color: '#fff', letterSpacing: '-2px' }}>
            Trouve ta coloc
          </span>
          <span style={{ display: 'block', fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(52px, 8vw, 96px)', fontWeight: 400, letterSpacing: '-2px', background: 'linear-gradient(135deg, #10B981, #34D399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            parfaite.
          </span>
        </h1>

        <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(255,255,255,0.5)', maxWidth: '520px', lineHeight: 1.7, margin: '0 0 48px' }}>
          ISALY analyse tes habitudes, tes horaires et ta personnalité pour te connecter avec des colocataires vraiment compatibles.
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
            Trouver ma coloc →
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
            { value: '14k+', label: 'Utilisateurs actifs' },
            { value: '94%', label: 'Taux de satisfaction' },
            { value: '3 min', label: 'Pour trouver un match' },
            { value: '0€', label: 'Pour commencer' },
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
            Simple comme bonjour
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2px' }}>
          {[
            { num: '01', title: 'Crée ton profil', desc: 'Réponds à 7 questions sur ton mode de vie, tes habitudes et tes attentes. 5 minutes chrono.' },
            { num: '02', title: 'Swipe & matche', desc: 'Notre algorithme calcule ta compatibilité avec chaque profil. Tu swipes, on matche.' },
            { num: '03', title: 'Emménage serein', desc: "Gère ton bail, tes loyers et ta colocation directement depuis l'app." },
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
            Tout ce qu&apos;il te faut
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {[
            { icon: '🎯', title: 'Matching intelligent', desc: 'Algorithme pondéré sur 4 critères : mode de vie, règles, personnalité, intérêts.' },
            { icon: '💬', title: 'Messagerie temps réel', desc: 'Chat instantané, réactions emoji, réponses, et demandes de colocation directes.' },
            { icon: '🗺️', title: 'Carte des annonces', desc: 'Explore les logements disponibles sur une carte interactive avec filtres avancés.' },
            { icon: '📁', title: 'Dossier numérique', desc: 'Centralise tes documents, partage ton dossier en un clic sécurisé 7 jours.' },
            { icon: '🏠', title: 'Gestion du bail', desc: 'Suivi des loyers, maintenance, colocataires — tout en un seul endroit.' },
            { icon: '🔒', title: 'Certification 3 niveaux', desc: 'Vérifie ton identité et booste ta crédibilité auprès des loueurs.' },
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
            Ils ont trouvé leur coloc
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {[
            { name: 'Sophie M.', role: 'Étudiante, Lyon', text: "J'ai trouvé ma colocataire en 3 jours. Le score de compatibilité était à 91% et on s'entend parfaitement !", avatar: 'SM' },
            { name: 'Thomas R.', role: 'Développeur, Paris', text: "Enfin une app qui comprend que la coloc c'est plus qu'un loyer partagé. Les filtres de mode de vie sont incroyables.", avatar: 'TR' },
            { name: 'Léa K.', role: 'Designer, Bordeaux', text: "La gestion du bail directement dans l'app m'a sauvé la vie. Plus besoin de 50 emails avec mon proprio.", avatar: 'LK' },
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
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff' }}>{t.avatar}</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{t.name}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: '120px 24px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px', color: '#10B981', marginBottom: '16px' }}>TARIFS</div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 400, color: '#fff', margin: 0, letterSpacing: '-1px' }}>
            Transparent &amp; simple
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {[
            {
              name: 'Essentiel',
              price: '0€',
              period: 'pour toujours',
              desc: 'Pour trouver ta coloc',
              features: ['Swipe illimité', 'Messagerie', 'Dossier numérique', 'Carte des annonces'],
              cta: 'Commencer gratuitement',
              highlighted: false,
            },
            {
              name: 'Sécurisé',
              price: '3%',
              period: 'du loyer / mois',
              desc: 'Pour louer en confiance',
              features: ['Tout Essentiel inclus', 'Assurance dossier', 'Certification niveau 3', 'Support prioritaire', 'Gestion bail complète'],
              cta: 'Choisir Sécurisé',
              highlighted: true,
            },
          ].map((plan, i) => (
            <div key={i} style={{
              padding: '40px',
              background: plan.highlighted ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${plan.highlighted ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: '20px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {plan.highlighted && (
                <div style={{ position: 'absolute', top: '16px', right: '16px', background: '#10B981', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px' }}>
                  POPULAIRE
                </div>
              )}
              <div style={{ fontSize: '13px', fontWeight: 600, color: plan.highlighted ? '#10B981' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>{plan.name}</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '48px', color: '#fff', lineHeight: 1, marginBottom: '4px' }}>{plan.price}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>{plan.period}</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '32px' }}>{plan.desc}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                    <span style={{ color: '#10B981', fontWeight: 700 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <Link href="/auth/register" style={{
                display: 'block', textAlign: 'center',
                background: plan.highlighted ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255,255,255,0.06)',
                color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600,
                padding: '13px', borderRadius: '10px',
                boxShadow: plan.highlighted ? '0 0 30px rgba(16,185,129,0.3)' : 'none',
                border: plan.highlighted ? 'none' : '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.2s',
              }}>
                {plan.cta}
              </Link>
            </div>
          ))}
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
          Prêt à trouver<br />ta coloc idéale ?
        </h2>
        <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.45)', maxWidth: '440px', margin: '0 auto 48px', lineHeight: 1.7 }}>
          Rejoins des milliers de personnes qui ont trouvé leur colocataire parfait avec ISALY.
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
          Créer mon compte gratuitement →
        </Link>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Image src="/LOGO_ISALY.png" alt="ISALY" width={80} height={24} style={{ objectFit: 'contain', height: '24px', width: 'auto', opacity: 0.5 }} />
        </div>
        <div style={{ display: 'flex', gap: '32px' }}>
          {['Confidentialité', 'CGU', 'Contact'].map(link => (
            <a key={link} href="#" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
            >{link}</a>
          ))}
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.2)' }}>© 2025 ISALY. Tous droits réservés.</div>
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
