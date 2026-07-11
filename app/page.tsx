'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { User, Heart, FileCheck, X, Check, Star } from 'lucide-react'
import CompatibilityQuiz from '@/components/landing/CompatibilityQuiz'
import AnnoncesPreview from '@/components/landing/AnnoncesPreview'
import MapPreview from '@/components/landing/MapPreview'
import ScrollReveal from '@/components/animations/ScrollReveal'
import Marquee from '@/components/animations/Marquee'
import FloatingCard from '@/components/animations/FloatingCard'
import StaggerContainer, { StaggerItem } from '@/components/animations/StaggerContainer'
import Emoji from '@/components/ui/Emoji'
import { ARTICLES, readingTime } from '@/content/blog/articles'

// ─── Styles partagés ─────────────────────────────────────────────────────────

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
}

const sectionKicker: React.CSSProperties = {
  fontSize: '12px', fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '3px', color: '#10B981', marginBottom: '16px',
}

const sectionTitle: React.CSSProperties = {
  fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(32px, 5vw, 52px)',
  fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-1px', lineHeight: 1.15,
}

const ctaPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  background: 'linear-gradient(135deg, #10B981, #059669)',
  color: '#fff', textDecoration: 'none', fontSize: '16px', fontWeight: 700,
  fontFamily: "'Outfit', sans-serif",
  padding: '15px 32px', borderRadius: '14px',
  boxShadow: '0 0 40px rgba(16,185,129,0.35)',
  transition: 'all 0.2s',
}

const ctaGhost: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  background: 'transparent',
  color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '16px', fontWeight: 600,
  fontFamily: "'Outfit', sans-serif",
  padding: '15px 32px', borderRadius: '14px',
  border: '1px solid rgba(255,255,255,0.15)',
  transition: 'all 0.2s',
}

// ─── Count-up au scroll ──────────────────────────────────────────────────────

function CountUpStat({ end, decimals = 0, prefix = '', suffix = '', label }: {
  end: number; decimals?: number; prefix?: string; suffix?: string; label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started.current) return
      started.current = true
      const t0 = performance.now()
      const dur = 1400
      function tick(t: number) {
        const p = Math.min((t - t0) / dur, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        setValue(end * eased)
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [end])

  return (
    <div ref={ref} style={{ textAlign: 'center', padding: '8px 24px' }}>
      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
        {prefix}{value.toFixed(decimals)}{suffix}
      </div>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginTop: '8px' }}>{label}</div>
    </div>
  )
}

// ─── Démo swipe visuelle ─────────────────────────────────────────────────────

const DEMO_CARDS = [
  { title: 'Coloc lumineuse · Croix-Rousse', city: 'Lyon 4e', price: '520€', match: 92, gradient: 'linear-gradient(160deg, #134E4A, #0F172A)' },
  { title: 'T4 refait à neuf · Canal', city: 'Toulouse', price: '450€', match: 87, gradient: 'linear-gradient(160deg, #1E3A5F, #0F172A)' },
  { title: 'Maison partagée · Chartrons', city: 'Bordeaux', price: '580€', match: 84, gradient: 'linear-gradient(160deg, #3B2F4E, #0F172A)' },
]

function SwipeDemo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' }}>
      <div style={{ position: 'relative', width: 'min(300px, 80vw)', height: '400px' }}>
        <style>{`
          @keyframes demo-float {
            0%, 100% { transform: translateY(0) rotate(var(--tilt)); }
            50% { transform: translateY(-8px) rotate(var(--tilt)); }
          }
        `}</style>
        {DEMO_CARDS.map((c, i) => {
          return (
            <div
              key={i}
              style={{
                position: 'absolute', inset: 0,
                borderRadius: '24px', overflow: 'hidden',
                background: c.gradient,
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                zIndex: 3 - i,
                ['--tilt' as string]: `${(i - 1) * 4}deg`,
                transform: `rotate(${(i - 1) * 4}deg) translateY(${i * 10}px)`,
                animation: i === 0 ? 'demo-float 4s ease-in-out infinite' : undefined,
                scale: `${1 - i * 0.04}`,
              }}
            >
              {/* Badge compatibilité */}
              <div style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'rgba(16,185,129,0.95)', color: '#fff',
                fontSize: '12.5px', fontWeight: 800, fontFamily: "'Outfit', sans-serif",
                padding: '6px 12px', borderRadius: '20px',
                boxShadow: '0 4px 16px rgba(16,185,129,0.4)',
              }}>
                {c.match}% compatible
              </div>
              {/* Illustration abstraite */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px', opacity: 0.5 }}>
                <Emoji native="🏠" size="64px" />
              </div>
              {/* Infos bas de carte */}
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, padding: '20px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
              }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{c.title}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{c.city} · <span style={{ color: '#10B981', fontWeight: 700 }}>{c.price}/mois</span></div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Boutons visuels */}
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
        }}>
          <X size={24} color="rgba(255,255,255,0.6)" />
        </div>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 6px 24px rgba(16,185,129,0.45)',
        }}>
          <Heart size={24} color="#fff" fill="#fff" />
        </div>
      </div>

      <Link href="/auth/register" style={ctaPrimary}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = '' }}
      >
        Essayer maintenant →
      </Link>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  })

  return (
    <div style={{ fontFamily: "'Inter', 'DM Sans', sans-serif", background: '#0A0A0A', color: '#fff', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* NAVBAR */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 clamp(20px, 4vw, 40px)',
        height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(10,10,10,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        <Link href="/" aria-label="ISALY — accueil">
          <Image src="/LOGO_ISALY.png" alt="ISALY" height={26} width={82} style={{ width: 'auto', height: '26px', objectFit: 'contain' }} />
        </Link>
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

      {/* ═══ 1. HERO ═══ */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '110px 24px 60px', textAlign: 'center', position: 'relative',
      }}>
        {/* Gradient radial mint en haut à droite */}
        <div aria-hidden style={{
          position: 'absolute', top: '-200px', right: '-200px',
          width: '700px', height: '700px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Badge animé */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
          style={{ marginBottom: '28px' }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '100px', padding: '8px 18px',
            fontSize: '13px', color: '#10B981', fontWeight: 600,
          }}>
            <Emoji native="🏠" size="14px" /> +500 colocations trouvées
          </div>
        </motion.div>

        {/* Titre */}
        <motion.h1 {...fadeUp(0.13)} style={{
          margin: '0 0 24px', lineHeight: 1.06, maxWidth: '860px',
          fontFamily: "'Outfit', sans-serif", fontWeight: 700, letterSpacing: '-2px',
          fontSize: 'clamp(40px, 8vw, 72px)', color: '#fff',
        }}>
          Ta coloc idéale{' '}
          <span style={{ background: 'linear-gradient(135deg, #10B981, #34D399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            existe déjà.
          </span>
        </motion.h1>

        {/* Sous-titre */}
        <motion.p {...fadeUp(0.21)} style={{
          fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(255,255,255,0.6)',
          maxWidth: '600px', lineHeight: 1.7, margin: '0 0 40px',
        }}>
          ISALY connecte les colocataires compatibles grâce à un matching intelligent.
          Plus de galère, juste la bonne coloc.
        </motion.p>

        {/* CTA */}
        <motion.div {...fadeUp(0.29)} style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '40px' }}>
          <Link href="/auth/register" style={ctaPrimary}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(16,185,129,0.55)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 40px rgba(16,185,129,0.35)' }}
          >
            Trouver une coloc
          </Link>
          <Link href="/auth/register" style={ctaGhost}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
          >
            Déposer une annonce
          </Link>
        </motion.div>

        {/* Proof social */}
        <motion.div {...fadeUp(0.37)} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex' }}>
            {['/pictures/meuf.jpg', '/pictures/mec.jpg', '/pictures/meuf2.jpg'].map((src, i) => (
              <Image
                key={src} src={src} alt="" width={34} height={34}
                style={{
                  width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover',
                  border: '2px solid #0A0A0A', marginLeft: i > 0 ? '-10px' : 0,
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.45)' }}>
            Rejoignez <span style={{ color: '#fff', fontWeight: 600 }}>2 000+</span> colocataires
          </span>
        </motion.div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
          <div style={{ width: '1px', height: '36px', background: 'linear-gradient(to bottom, rgba(16,185,129,0.5), transparent)' }} />
          Défiler
        </div>
      </section>

      {/* ═══ 2. SOCIAL PROOF — stats count-up ═══ */}
      <section style={{
        background: 'rgba(255,255,255,0.02)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '48px 24px',
      }}>
        <div style={{
          maxWidth: '1000px', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px',
        }}>
          {[
            <CountUpStat key="a" end={500} suffix="+" label="annonces actives" />,
            <CountUpStat key="b" end={2000} suffix="+" label="profils vérifiés" />,
            <CountUpStat key="c" end={89} suffix="%" label="de matchs réussis" />,
            <CountUpStat key="d" end={4.8} decimals={1} suffix="★" label="satisfaction" />,
          ].map((stat, i) => (
            <div key={i} style={{ borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
              {stat}
            </div>
          ))}
        </div>
      </section>

      {/* MARQUEE */}
      <div style={{ padding: '28px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Marquee items={[
          '🏠 Colocation intelligente',
          '❤️ Matching compatible',
          '💬 Messagerie temps réel',
          '🗺️ Carte des annonces',
          '📁 Dossier numérique',
          '🔒 Profils certifiés',
          '⚡ Trouvé en 3 jours',
          '🎯 40+ critères',
          '0€ pour commencer',
        ]} />
      </div>

      {/* ═══ 3. COMMENT ÇA MARCHE ═══ */}
      <ScrollReveal delay={0}>
        <section style={{ padding: '120px 24px', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '72px' }}>
            <div style={sectionKicker}>PROCESSUS</div>
            <h2 style={sectionTitle}>Simple comme bonjour</h2>
          </div>

          <div style={{ position: 'relative' }}>
            {/* Ligne pointillée entre les étapes (desktop) */}
            <div aria-hidden className="hidden md:block" style={{
              position: 'absolute', top: '32px', left: '18%', right: '18%',
              borderTop: '2px dashed rgba(16,185,129,0.3)',
            }} />
            <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '32px' }}>
              {[
                { icon: User, num: '1', title: 'Crée ton profil', desc: 'Réponds au questionnaire de compatibilité en 5 minutes. Rythme de vie, habitudes, budget — tout ce qui compte pour bien vivre ensemble.' },
                { icon: Heart, num: '2', title: 'Swipe les annonces compatibles', desc: 'Notre algorithme te montre uniquement les profils et logements qui te correspondent, avec un score de compatibilité calculé sur 40+ critères.' },
                { icon: FileCheck, num: '3', title: 'Matche, discute, signe', desc: "Messagerie intégrée, visites, dossier numérique et signature du bail 100% en ligne. De la rencontre à l'emménagement sans quitter l'app." },
              ].map((step, i) => {
                const Icon = step.icon
                return (
                  <StaggerItem key={i}>
                    <div style={{ textAlign: 'center', position: 'relative' }}>
                      <div style={{
                        width: 64, height: 64, borderRadius: '20px', margin: '0 auto 20px',
                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative', zIndex: 1, backdropFilter: 'blur(8px)',
                      }}>
                        <Icon size={26} color="#10B981" strokeWidth={1.8} />
                      </div>
                      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '44px', fontWeight: 700, color: 'rgba(16,185,129,0.25)', lineHeight: 1, marginBottom: '8px' }}>
                        {step.num}
                      </div>
                      <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>{step.title}</h3>
                      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: '0 auto', maxWidth: '300px' }}>{step.desc}</p>
                    </div>
                  </StaggerItem>
                )
              })}
            </StaggerContainer>
          </div>
        </section>
      </ScrollReveal>

      {/* ═══ 4. DÉMO SWIPE ═══ */}
      <ScrollReveal delay={0}>
        <section style={{ padding: '100px 24px', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={sectionKicker}>DÉCOUVRE</div>
            <h2 style={sectionTitle}>Vois avec qui tu matches</h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', margin: '16px auto 0', maxWidth: '460px', lineHeight: 1.7 }}>
              Chaque carte affiche ton score de compatibilité réel. Swipe à droite si ça te plaît — si c&apos;est réciproque, c&apos;est un match.
            </p>
          </div>
          <SwipeDemo />
        </section>
      </ScrollReveal>

      {/* ═══ 5. COMPARATIF ═══ */}
      <ScrollReveal delay={0}>
        <section style={{ padding: '100px 24px', maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={sectionKicker}>POURQUOI ISALY</div>
            <h2 style={sectionTitle}>Fini les intermédiaires</h2>
          </div>

          <div style={{ ...glassCard, padding: 'clamp(20px, 4vw, 40px)', backdropFilter: 'blur(12px)', overflowX: 'auto' }}>
            <div style={{ minWidth: '540px' }}>
              {/* En-tête */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.35)' }}>Critère</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Agence traditionnelle</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#10B981', fontFamily: "'Outfit', sans-serif" }}>ISALY</div>
              </div>
              {/* Lignes */}
              {[
                { critere: 'Frais', agence: "Jusqu'à 1 mois de loyer", isaly: '0€ à l’inscription' },
                { critere: 'Délai', agence: '2 à 6 semaines', isaly: '3 jours en moyenne' },
                { critere: 'Compatibilité', agence: 'Aucune garantie', isaly: 'Score sur 40+ critères' },
                { critere: 'Signature', agence: 'Papier, en agence', isaly: '100% en ligne' },
                { critere: 'Disponibilité', agence: 'Horaires de bureau', isaly: '24/7 depuis l’app' },
              ].map((row, i, arr) => (
                <div key={row.critere} style={{
                  display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '16px',
                  padding: '16px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  alignItems: 'center',
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{row.critere}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: 'rgba(248,113,113,0.75)' }}>
                    <X size={15} color="rgba(248,113,113,0.6)" style={{ flexShrink: 0 }} /> {row.agence}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#34D399', fontWeight: 600 }}>
                    <Check size={15} color="#10B981" style={{ flexShrink: 0 }} /> {row.isaly}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ═══ 6. TÉMOIGNAGES ═══ */}
      <ScrollReveal delay={0}>
        <section style={{ padding: '100px 24px', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={sectionKicker}>TÉMOIGNAGES</div>
            <h2 style={sectionTitle}>Ils ont trouvé leur coloc</h2>
          </div>
          <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {[
              { name: 'Sophie M.', role: 'Étudiante · Lyon', text: "En 3 jours j'avais trouvé ma colocataire. Le score de compatibilité était à 91% et 6 mois plus tard on est toujours aussi bien ensemble.", photo: '/pictures/meuf.jpg' },
              { name: 'Thomas R.', role: 'Développeur · Paris', text: "J'avais essayé Le Bon Coin, Facebook, tout. Sur ISALY j'ai eu mon premier match en moins d'une heure.", photo: '/pictures/mec.jpg' },
              { name: 'Léa K.', role: 'Designer · Bordeaux', text: "La gestion du bail dans l'app m'a évité 50 emails avec mon proprio. Je recommande à tous ceux qui veulent une coloc sans prise de tête.", photo: '/pictures/meuf2.jpg' },
            ].map((t, i) => (
              <StaggerItem key={i}>
                <div style={{
                  ...glassCard, padding: '28px', height: '100%',
                  backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ display: 'flex', gap: '3px', marginBottom: '16px' }}>
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} size={14} color="#10B981" fill="#10B981" />
                    ))}
                  </div>
                  <p style={{ fontSize: '14.5px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.8, margin: '0 0 24px', flex: 1 }}>
                    « {t.text} »
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Image src={t.photo} alt={t.name} width={42} height={42} style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>{t.name}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      </ScrollReveal>

      {/* ═══ NOS GUIDES (blog) ═══ */}
      <ScrollReveal delay={0}>
        <section style={{ padding: '100px 24px', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={sectionKicker}>ISALY IMMO</div>
            <h2 style={sectionTitle}>Nos guides de la colocation</h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', margin: '16px auto 0', maxWidth: '460px', lineHeight: 1.7 }}>
              Droits, conseils et bonnes pratiques pour coloquer sereinement.
            </p>
          </div>
          <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {ARTICLES.slice(0, 3).map(a => (
              <StaggerItem key={a.slug}>
                <Link href={`/blog/${a.slug}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                  <div style={{ ...glassCard, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{
                      height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.06))',
                    }}>
                      <Emoji native={a.emoji} size="44px" />
                    </div>
                    <div style={{ padding: '18px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#10B981', marginBottom: '8px' }}>
                        {a.category}
                      </div>
                      <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff', lineHeight: 1.4, marginBottom: '10px', flex: 1 }}>
                        {a.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                        {readingTime(a)} min de lecture
                      </div>
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link href="/blog" style={{ fontSize: '14px', fontWeight: 700, color: '#10B981', textDecoration: 'none', fontFamily: "'Outfit', sans-serif" }}>
              Tous les articles →
            </Link>
          </div>
        </section>
      </ScrollReveal>

      {/* CALCULATEUR — quiz existant */}
      <ScrollReveal delay={0}>
        <section style={{ padding: '100px 24px', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={sectionKicker}>ESSAIE MAINTENANT</div>
            <h2 style={sectionTitle}>Ton score de compatibilité</h2>
          </div>
          <CompatibilityQuiz />
        </section>
      </ScrollReveal>

      {/* ═══ 7. PRICING ═══ */}
      <ScrollReveal delay={0}>
        <section style={{ padding: '100px 24px', maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '72px' }}>
            <div style={sectionKicker}>TARIFS</div>
            <h2 style={sectionTitle}>Transparent. Juste. Sans surprise.</h2>
          </div>

          {/* LOCATAIRES */}
          <div style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '2px', whiteSpace: 'nowrap' }}>
                Pour les locataires
              </div>
              <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>
            <FloatingCard delay={0} amplitude={5}>
              <div style={{
                background: 'rgba(16,185,129,0.05)',
                border: '1px solid rgba(16,185,129,0.15)',
                borderRadius: '24px',
                padding: 'clamp(24px, 4vw, 40px)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '32px',
              }}>
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#10B981', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>LOCATAIRE</div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(44px, 6vw, 64px)', fontWeight: 700, color: '#fff', lineHeight: 1, marginBottom: '6px' }}>Gratuit</div>
                  <div style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', marginBottom: '24px' }}>pour toujours — aucune carte requise</div>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: '400px', margin: '0 0 24px' }}>
                    Swipe, matche, contacte les loueurs et gère ton bail. Tout est gratuit. On prend uniquement <span style={{ color: '#10B981', fontWeight: 600 }}>2,5% du loyer mensuel</span> à la signature du bail — comme une assurance dossier incluse.
                  </p>
                  <Link href="/auth/register" style={{ ...ctaPrimary, fontSize: '15px', padding: '13px 28px' }}>
                    Commencer gratuitement →
                  </Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '240px' }}>
                  {['Swipe & matching illimité', 'Messagerie intégrée', 'Dossier numérique complet', 'Carte des annonces', 'Gestion du bail incluse', 'Support par chat'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                      <Check size={15} color="#10B981" style={{ flexShrink: 0 }} /> {f}
                    </div>
                  ))}
                </div>
              </div>
            </FloatingCard>
          </div>

          {/* LOUEURS */}
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
                  name: 'Essentiel', price: '9,99€', period: 'par mois',
                  desc: 'Ton annonce vue par plus de locataires',
                  features: ['Annonce boostée dans le feed swipe', 'Visible en priorité dans la recherche', 'Badge "Mis en avant"', 'Accès aux dossiers certifiés', 'Messagerie directe'],
                  cta: 'Booster mon annonce', href: '/auth/register?plan=essentiel',
                  highlighted: false, floatDelay: 0.8,
                },
                {
                  name: 'Prioritaire', price: '24,99€', period: 'par mois',
                  desc: 'Visibilité maximale, résultats garantis',
                  features: ['Tout Essentiel inclus', 'Position #1 dans le matching', 'Badge "Prioritaire" visible', 'Mis en avant sur la carte', 'Stats détaillées', 'Support 7j/7'],
                  cta: 'Choisir Prioritaire', href: '/auth/register?plan=prioritaire',
                  highlighted: true, floatDelay: 1.6,
                },
              ].map((plan, i) => (
                <FloatingCard key={i} delay={plan.floatDelay} amplitude={i === 1 ? 8 : 6}>
                  <div style={{
                    padding: '32px',
                    background: plan.highlighted ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${plan.highlighted ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '20px',
                    position: 'relative', height: '100%',
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
                          <Check size={15} color="#10B981" style={{ flexShrink: 0 }} /> {f}
                        </div>
                      ))}
                    </div>
                    <Link href={plan.href} style={{
                      display: 'block', textAlign: 'center',
                      background: plan.highlighted ? 'linear-gradient(135deg, #10B981, #059669)' : 'rgba(255,255,255,0.06)',
                      color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600,
                      padding: '13px', borderRadius: '12px',
                      border: plan.highlighted ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    }}>
                      {plan.cta}
                    </Link>
                  </div>
                </FloatingCard>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* VILLES */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '80px clamp(20px, 4vw, 40px)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ ...sectionTitle, fontSize: 'clamp(26px, 4vw, 38px)' }}>Trouve ta coloc dans ta ville</h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', margin: '12px 0 0' }}>
              ISALY est disponible dans toutes les grandes villes françaises
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
            {[
              ['paris', 'Paris'], ['marseille', 'Marseille'], ['lyon', 'Lyon'], ['toulouse', 'Toulouse'],
              ['nice', 'Nice'], ['nantes', 'Nantes'], ['montpellier', 'Montpellier'], ['strasbourg', 'Strasbourg'],
              ['bordeaux', 'Bordeaux'], ['lille', 'Lille'], ['rennes', 'Rennes'], ['reims', 'Reims'],
              ['grenoble', 'Grenoble'], ['dijon', 'Dijon'], ['angers', 'Angers'], ['nimes', 'Nîmes'],
              ['clermont-ferrand', 'Clermont-Ferrand'], ['toulon', 'Toulon'], ['saint-etienne', 'Saint-Étienne'], ['le-havre', 'Le Havre'],
            ].map(([slug, name]) => (
              <Link
                key={slug}
                href={`/colocation/${slug}`}
                style={{
                  display: 'block', textDecoration: 'none',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  transition: 'background 0.2s, border-color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px' }}><Emoji native="📍" /></span>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#fff' }}>{name}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#10B981' }}>Voir les annonces</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <AnnoncesPreview />

      {/* CARTE */}
      <section style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '80px clamp(20px, 4vw, 40px)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ ...sectionTitle, fontSize: 'clamp(26px, 4vw, 38px)' }}>Toutes les annonces près de chez toi</h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', margin: '12px 0 0' }}>
              Explore les logements disponibles sur la carte
            </p>
          </div>
          <MapPreview />
        </div>
      </section>

      {/* ═══ 8. CTA FINAL ═══ */}
      <section style={{
        padding: '120px 24px',
        textAlign: 'center',
        position: 'relative',
        background: 'linear-gradient(180deg, rgba(16,185,129,0.06) 0%, rgba(16,185,129,0.12) 100%)',
        borderBottom: '1px solid rgba(16,185,129,0.15)',
        overflow: 'hidden',
      }}>
        <div aria-hidden style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '700px', height: '700px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <ScrollReveal delay={0}>
          <h2 style={{
            fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(34px, 6vw, 60px)', fontWeight: 700,
            color: '#fff', margin: '0 0 16px', letterSpacing: '-1.5px', lineHeight: 1.1, position: 'relative',
          }}>
            Prêt à trouver ta coloc idéale ?
          </h2>
          <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.55)', maxWidth: '440px', margin: '0 auto 44px', lineHeight: 1.7, position: 'relative' }}>
            Inscription gratuite en 2 minutes. Aucun engagement.
          </p>
          <Link href="/auth/register" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: '#fff', color: '#059669',
            textDecoration: 'none', fontSize: '17px', fontWeight: 700,
            fontFamily: "'Outfit', sans-serif",
            padding: '17px 44px', borderRadius: '16px',
            boxShadow: '0 8px 40px rgba(255,255,255,0.15)',
            transition: 'all 0.2s', position: 'relative',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 60px rgba(255,255,255,0.25)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 40px rgba(255,255,255,0.15)' }}
          >
            Commencer maintenant →
          </Link>
        </ScrollReveal>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '56px clamp(20px, 4vw, 40px) 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <Image src="/LOGO_ISALY.png" alt="ISALY" height={24} width={76} style={{ width: 'auto', height: '24px', objectFit: 'contain', opacity: 0.8 }} />
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
            La colocation par matching intelligent.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', flexWrap: 'wrap' }}>
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
          </div>
        </div>
      </footer>

      <style>{`
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  )
}
