'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import BuildingAnimation from '@/components/landing/BuildingAnimation'
import ScrollReveal from '@/components/animations/ScrollReveal'
import Marquee from '@/components/animations/Marquee'
import StaggerContainer, { StaggerItem } from '@/components/animations/StaggerContainer'

const P = '#F4F3EE'
const N = '#14171F'
const J = '#FFC857'
const BORDER = '#E5E4DE'
const GRAY = '#7A7A74'

const darkBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  background: N, color: P,
  textDecoration: 'none', fontWeight: 700,
  padding: '12px 26px', borderRadius: '50px',
  fontSize: '15px', transition: 'opacity 0.2s',
  border: 'none', cursor: 'pointer',
}
const ghostBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  background: 'transparent', color: N,
  textDecoration: 'none', fontWeight: 600,
  padding: '12px 26px', borderRadius: '50px',
  fontSize: '15px', border: `1.5px solid ${BORDER}`,
  transition: 'border-color 0.2s',
}
const pill: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  background: `${N}0D`, border: `1px solid ${N}18`,
  borderRadius: '50px', padding: '5px 14px',
  fontSize: '12px', fontWeight: 600, color: N,
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div style={{ fontFamily: "'Schibsted Grotesk', sans-serif", background: P, color: N, minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: '64px', padding: '0 clamp(20px, 4vw, 48px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(244,243,238,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? `1px solid ${BORDER}` : 'none',
        transition: 'all 0.3s',
      }}>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '24px', fontWeight: 800, color: N, letterSpacing: '-0.5px' }}>
          ISALY<span style={{ color: J }}>.</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Link href="/auth/login" style={{ color: N, textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '8px 16px', borderRadius: '50px' }}>
            Connexion
          </Link>
          <Link href="/auth/register" style={{ ...darkBtn, padding: '9px 20px', fontSize: '14px' }}>
            Commencer →
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        maxWidth: '1180px', margin: '0 auto',
        padding: 'clamp(100px, 14vw, 140px) clamp(20px, 4vw, 48px) 80px',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 'clamp(40px, 6vw, 88px)', alignItems: 'center',
      }}>
        {/* Left: text */}
        <div>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <span style={{ ...pill, marginBottom: '26px', display: 'inline-flex' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: J, flexShrink: 0 }} />
              14 000 colocataires actifs
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(44px, 6.5vw, 76px)', fontWeight: 800, lineHeight: 1.06, margin: '0 0 20px', letterSpacing: '-2px' }}
          >
            Trouve ta coloc{' '}
            <em style={{ color: J, fontStyle: 'italic' }}>parfaite.</em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            style={{ fontSize: 'clamp(15px, 1.8vw, 17px)', color: GRAY, lineHeight: 1.75, margin: '0 0 36px', maxWidth: '460px' }}
          >
            ISALY combine le matching intelligent façon Tinder avec une gestion complète de ton bail. Fini les conflits de mode de vie et les mauvaises surprises.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <Link href="/auth/register" style={darkBtn}>Commencer gratuitement</Link>
              <Link href="/auth/login" style={ghostBtn}>Se connecter</Link>
            </div>
            <div style={{ display: 'flex', gap: '20px', fontSize: '12.5px', color: '#B0AFA8', flexWrap: 'wrap' }}>
              <span>✓ 3 min pour créer ton profil</span>
              <span>✓ 100% gratuit</span>
              <span>✓ Sans carte bancaire</span>
            </div>
          </motion.div>
        </div>

        {/* Right: building + floating card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.6 }}
          style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}
        >
          <BuildingAnimation />

          {/* Floating compat card */}
          <motion.div
            animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', bottom: '20px', right: '-8px',
              background: '#fff', borderRadius: '16px', padding: '12px 16px',
              boxShadow: '0 6px 24px rgba(20,23,31,0.12)', border: `1px solid ${BORDER}`,
              minWidth: '190px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FFF8E7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>👩‍🎨</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: N }}>Sophie M.</div>
                <div style={{ fontSize: '11px', color: GRAY }}>Paris 11ème · 850€/mois</div>
              </div>
              <div style={{ background: J, color: N, fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '50px', flexShrink: 0 }}>94%</div>
            </div>
          </motion.div>

          {/* "Nouveau match" badge */}
          <motion.div
            animate={{ y: [0, 6, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            style={{
              position: 'absolute', top: '16px', left: '-8px',
              background: N, color: '#fff',
              borderRadius: '50px', padding: '7px 14px',
              fontSize: '12px', fontWeight: 700,
              boxShadow: '0 4px 16px rgba(20,23,31,0.2)',
            }}
          >
            🎉 Nouveau match !
          </motion.div>
        </motion.div>
      </section>

      {/* ── MARQUEE ── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: '18px 0' }}>
        <Marquee items={[
          '🏠 Matching intelligent', '❤️ 40+ critères', '💬 Messagerie temps réel',
          '📁 Dossier certifié', '🔒 Bail sécurisé', '⚡ Match en 3 jours',
          '0€ pour commencer', '🗺️ Carte des annonces', '🎯 Score de compatibilité',
        ]} />
      </div>

      {/* ── STATS BAND ── */}
      <div style={{ background: N, padding: 'clamp(48px, 6vw, 72px) clamp(20px, 4vw, 48px)' }}>
        <StaggerContainer style={{
          maxWidth: '900px', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '32px', textAlign: 'center',
        }}>
          {[
            { val: '14k+', label: 'Colocataires actifs' },
            { val: '94%',  label: 'Taux de satisfaction' },
            { val: '3 min', label: 'Pour créer ton profil' },
            { val: '0€',   label: 'Pour commencer' },
          ].map(s => (
            <StaggerItem key={s.label}>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(36px, 4.5vw, 54px)', fontWeight: 800, color: J, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '8px' }}>{s.label}</div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>

      {/* ── PROBLÈMES + SOLUTIONS ── */}
      <ScrollReveal delay={0}>
        <section style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(72px, 8vw, 110px) clamp(20px, 4vw, 48px)' }}>

          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', color: '#B0AFA8', marginBottom: '12px' }}>POURQUOI ISALY</div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, color: N, margin: '0 0 14px', letterSpacing: '-1px' }}>
              La coloc, c'est souvent…
            </h2>
            <p style={{ fontSize: '16px', color: GRAY, maxWidth: '420px', margin: '0 auto' }}>Ces problèmes te semblent familiers ?</p>
          </div>

          {/* Problem cards */}
          <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '36px' }}>
            {[
              { icon: '😬', title: 'Mauvaise entente', desc: "Tu t'installes avec quelqu'un dont tu ne connais pas les habitudes. Résultat : tensions, conflits, déménagement en catastrophe." },
              { icon: '📋', title: 'Dossier refusé', desc: "Tu passes des heures à scanner tes documents. Tu ne sais même pas si ton dossier est complet. Et au final, les loueurs ne répondent pas." },
              { icon: '📱', title: 'Gestion chaotique', desc: "WhatsApp pour les loyers, email pour les charges, tableur pour les réparations. C'est épuisant." },
            ].map((p) => (
              <StaggerItem key={p.title}>
                <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', border: `1px solid ${BORDER}`, borderLeft: '4px solid #EF4444', height: '100%' }}>
                  <div style={{ fontSize: '36px', marginBottom: '14px' }}>{p.icon}</div>
                  <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '18px', fontWeight: 700, color: N, marginBottom: '8px' }}>{p.title}</h3>
                  <p style={{ fontSize: '14px', color: GRAY, lineHeight: 1.7 }}>{p.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Separator arrow */}
          <div style={{ textAlign: 'center', padding: '4px 0 28px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: N, color: '#fff', padding: '9px 22px', borderRadius: '50px', fontSize: '13px', fontWeight: 700 }}>
              ↓&nbsp; ISALY résout tout ça
            </div>
          </div>

          {/* Solution cards */}
          <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
            {[
              { icon: '🎯', title: 'Matching intelligent', desc: "Notre algorithme analyse 40+ critères de mode de vie. Tu swipes uniquement des profils vraiment compatibles avec toi. Score affiché sur chaque carte." },
              { icon: '📁', title: 'Dossier certifié', desc: "Centralise tous tes documents en un clic. Partage-le instantanément avec un lien sécurisé. Ton dossier est toujours prêt et à jour." },
              { icon: '🏠', title: 'Gestion complète', desc: "Bail, loyers, charges, maintenances — tout dans l'app. Ta coloc gérée comme un pro, sans email, sans tableur." },
            ].map((s) => (
              <StaggerItem key={s.title}>
                <div style={{ background: N, borderRadius: '16px', padding: '28px', borderLeft: `4px solid ${J}`, height: '100%' }}>
                  <div style={{ fontSize: '36px', marginBottom: '14px' }}>{s.icon}</div>
                  <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{s.title}</h3>
                  <p style={{ fontSize: '14px', color: '#9CA3AF', lineHeight: 1.7 }}>{s.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      </ScrollReveal>

      {/* ── DEUX ESPACES ── */}
      <ScrollReveal delay={0}>
        <section style={{ background: N, padding: 'clamp(72px, 8vw, 110px) clamp(20px, 4vw, 48px)' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', color: '#6B7280', marginBottom: '12px' }}>POUR TOUT LE MONDE</div>
              <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-1px' }}>
                Une plateforme, deux espaces
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Locataires */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '20px', padding: 'clamp(28px, 3vw, 44px)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2.5px', color: '#6B7280', marginBottom: '14px' }}>LOCATAIRES</div>
                <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(22px, 2.5vw, 28px)', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Je cherche une coloc</h3>
                <p style={{ fontSize: '15px', color: '#9CA3AF', marginBottom: '28px', lineHeight: 1.7 }}>Swipe des profils compatibles, envoie ton dossier en 1 clic, gère ton bail dans l'app.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '32px' }}>
                  {[
                    '🔥 Swipe & matching compatible',
                    '💬 Messagerie instantanée',
                    '📁 Dossier numérique certifié',
                    '🗺️ Carte des annonces',
                    '🏠 Gestion du bail incluse',
                  ].map(f => (
                    <div key={f} style={{ fontSize: '14px', color: '#D1D5DB' }}>{f}</div>
                  ))}
                </div>
                <Link href="/auth/register" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fff', color: N, textDecoration: 'none', fontSize: '14px', fontWeight: 700, padding: '12px 24px', borderRadius: '50px' }}>
                  Je cherche une coloc →
                </Link>
              </div>

              {/* Loueurs */}
              <div style={{ background: J, borderRadius: '20px', padding: 'clamp(28px, 3vw, 44px)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2.5px', color: `${N}80`, marginBottom: '14px' }}>PROPRIÉTAIRES</div>
                <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(22px, 2.5vw, 28px)', fontWeight: 800, color: N, marginBottom: '12px' }}>Je loue mon bien</h3>
                <p style={{ fontSize: '15px', color: `${N}99`, marginBottom: '28px', lineHeight: 1.7 }}>Publie une annonce, reçois des dossiers certifiés et gère tes colocataires depuis un tableau de bord.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '32px' }}>
                  {[
                    "📢 Publication d'annonce gratuite",
                    '🎯 Locataires pré-qualifiés',
                    '📋 Dossiers certifiés vérifiés',
                    '💳 Suivi des loyers',
                    '👥 Gestion des colocataires',
                  ].map(f => (
                    <div key={f} style={{ fontSize: '14px', color: `${N}CC` }}>{f}</div>
                  ))}
                </div>
                <Link href="/auth/register?role=loueur" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: N, color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 700, padding: '12px 24px', borderRadius: '50px' }}>
                  Je loue mon bien →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ── SWIPE DEMO ── */}
      <ScrollReveal delay={0}>
        <section style={{ maxWidth: '1100px', margin: '0 auto', padding: 'clamp(72px, 8vw, 110px) clamp(20px, 4vw, 48px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(40px, 6vw, 88px)', alignItems: 'center' }}>

            {/* Steps */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', color: '#B0AFA8', marginBottom: '12px' }}>COMMENT ÇA MARCHE</div>
              <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, color: N, margin: '0 0 36px', letterSpacing: '-1px', lineHeight: 1.1 }}>
                Swipe. Matche.<br />Emménage.
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
                {[
                  { num: '01', title: 'Crée ton profil', desc: 'Réponds à 5 questions sur ton rythme de vie. Notre algorithme fait le reste.' },
                  { num: '02', title: 'Swipe des profils', desc: 'Vois uniquement des personnes compatibles avec toi. Le score est affiché sur chaque carte.' },
                  { num: '03', title: 'Parle & emménage', desc: "Contacte directement tes matchs. Gère tout ton bail depuis l'app." },
                ].map((step) => (
                  <div key={step.num} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: J, color: N, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>
                      {step.num}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: N, marginBottom: '4px' }}>{step.title}</div>
                      <div style={{ fontSize: '14px', color: GRAY, lineHeight: 1.65 }}>{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '36px' }}>
                <Link href="/auth/register" style={darkBtn}>Essayer maintenant →</Link>
              </div>
            </div>

            {/* Mock swipe card */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '100%', maxWidth: '320px', background: '#fff', borderRadius: '22px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(20,23,31,0.14)', border: `1px solid ${BORDER}` }}>
                {/* Photo area */}
                <div style={{ height: '210px', background: 'linear-gradient(135deg, #FFF8E7, #FFF0CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '80px' }}>
                  👩‍🎨
                </div>
                {/* Card body */}
                <div style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '21px', fontWeight: 800, color: N }}>Sophie M., 24</div>
                      <div style={{ fontSize: '12.5px', color: GRAY, marginTop: '2px' }}>Designer UX · Paris 11ème · 850€/mois</div>
                    </div>
                    <div style={{ background: J, color: N, fontSize: '12px', fontWeight: 800, padding: '5px 12px', borderRadius: '50px', flexShrink: 0, marginLeft: '8px' }}>
                      💚 94%
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                    {['🌙 Couche-tard', '🎵 Musique', '🏠 Télétravail', '🐱 Animaux ok'].map(tag => (
                      <span key={tag} style={{ background: P, color: '#4A4A42', fontSize: '11px', fontWeight: 500, padding: '4px 10px', borderRadius: '50px', border: `1px solid ${BORDER}` }}>{tag}</span>
                    ))}
                  </div>
                  <p style={{ fontSize: '13px', color: GRAY, lineHeight: 1.65, marginBottom: '14px' }}>Passionnée de design et de musique indie. Coloc calme en semaine, festive le weekend !</p>
                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fff', border: `1.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(20,23,31,0.08)' }}>✕</div>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: J, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', cursor: 'pointer', boxShadow: `0 4px 16px rgba(255,200,87,0.4)` }}>♥</div>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fff', border: `1.5px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(20,23,31,0.08)' }}>⭐</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ── PRICING ── */}
      <ScrollReveal delay={0}>
        <section style={{ background: N, padding: 'clamp(72px, 8vw, 110px) clamp(20px, 4vw, 48px)' }}>
          <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', color: J, marginBottom: '12px' }}>TARIFS</div>
              <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, color: '#fff', margin: '0 0 10px', letterSpacing: '-1px' }}>
                Transparent & juste
              </h2>
              <p style={{ fontSize: '16px', color: '#6B7280' }}>On ne gagne que quand tu trouves ta coloc.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
              {[
                {
                  label: 'LOCATAIRE', name: 'Essentiel',
                  price: 'Gratuit', priceNote: 'pour toujours',
                  desc: 'Pour trouver ta coloc',
                  features: ['Swipe & matching illimité', 'Messagerie avec matchs', 'Dossier de base', 'Carte des annonces'],
                  crossed: ['Assurance dossier', 'Gestion bail complète'],
                  cta: 'Commencer', href: '/auth/register',
                  highlighted: false,
                },
                {
                  label: 'LOCATAIRE', name: 'Sécurisé',
                  price: '2,5%', priceNote: 'du loyer/mois',
                  desc: 'Pour une coloc sereine',
                  badge: 'POPULAIRE',
                  features: ['Tout Essentiel inclus', 'Assurance dossier certifié', 'Gestion bail complète', 'Support prioritaire'],
                  crossed: [],
                  cta: "S'assurer", href: '/app/paiement',
                  highlighted: true,
                },
                {
                  label: 'LOUEUR', name: 'Boost annonce',
                  price: '9,99€', priceNote: 'par mois',
                  desc: 'Pour louer plus vite',
                  features: ["Annonce mise en avant", 'Badge "Prioritaire"', 'Dossiers certifiés', 'Messagerie directe'],
                  crossed: [],
                  cta: 'Booster mon annonce', href: '/auth/register?role=loueur',
                  highlighted: false,
                  note: 'Prioritaire à 24,99€/mois disponible',
                },
              ].map((plan) => (
                <div key={plan.name} style={{
                  background: plan.highlighted ? '#fff' : 'rgba(255,255,255,0.04)',
                  border: plan.highlighted ? `2px solid ${J}` : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px', padding: '32px',
                  position: 'relative', display: 'flex', flexDirection: 'column',
                }}>
                  {plan.badge && (
                    <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: J, color: N, fontSize: '10px', fontWeight: 800, padding: '4px 14px', borderRadius: '50px', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                      {plan.badge}
                    </div>
                  )}
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: plan.highlighted ? '#B0AFA8' : '#6B7280', marginBottom: '6px' }}>{plan.label}</div>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '22px', fontWeight: 800, color: plan.highlighted ? N : '#fff', marginBottom: '12px' }}>{plan.name}</div>
                  <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '42px', fontWeight: 800, color: plan.highlighted ? N : '#fff', lineHeight: 1, marginBottom: '4px' }}>{plan.price}</div>
                  <div style={{ fontSize: '13px', color: plan.highlighted ? GRAY : '#6B7280', marginBottom: '6px' }}>{plan.priceNote}</div>
                  <div style={{ fontSize: '14px', color: plan.highlighted ? GRAY : '#9CA3AF', marginBottom: '24px' }}>{plan.desc}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px', flex: 1 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: plan.highlighted ? N : '#D1D5DB' }}>
                        <span style={{ color: J, fontWeight: 800, flexShrink: 0 }}>✓</span> {f}
                      </div>
                    ))}
                    {plan.crossed?.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#4B5563', textDecoration: 'line-through' }}>
                        <span style={{ flexShrink: 0 }}>✗</span> {f}
                      </div>
                    ))}
                  </div>
                  <Link href={plan.href} style={{ display: 'block', textAlign: 'center', background: plan.highlighted ? N : 'rgba(255,255,255,0.08)', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 700, padding: '13px', borderRadius: '50px', border: plan.highlighted ? 'none' : '1px solid rgba(255,255,255,0.14)', transition: 'opacity 0.2s' }}>
                    {plan.cta}
                  </Link>
                  {'note' in plan && plan.note && (
                    <div style={{ textAlign: 'center', fontSize: '11px', color: '#4B5563', marginTop: '10px' }}>{plan.note}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ── CTA FINAL ── */}
      <ScrollReveal delay={0}>
        <section style={{ padding: 'clamp(80px, 8vw, 120px) clamp(20px, 4vw, 48px)', textAlign: 'center' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', color: '#B0AFA8', marginBottom: '16px' }}>REJOINS-NOUS</div>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(34px, 5vw, 58px)', fontWeight: 800, color: N, margin: '0 0 18px', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
              Ta prochaine chambre<br />t&apos;attend.
            </h2>
            <p style={{ fontSize: '16px', color: GRAY, margin: '0 0 40px', lineHeight: 1.7 }}>
              Des milliers de personnes ont déjà trouvé leur colocataire parfait sur ISALY. C&apos;est gratuit pour commencer.
            </p>
            <Link href="/auth/register" style={{ ...darkBtn, padding: '16px 40px', fontSize: '16px', fontWeight: 800 }}>
              Créer mon compte — c&apos;est gratuit →
            </Link>
          </div>
        </section>
      </ScrollReveal>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: 'clamp(28px, 3vw, 44px) clamp(20px, 4vw, 48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '20px', fontWeight: 800, color: N }}>
          ISALY<span style={{ color: J }}>.</span>
        </div>
        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
          {[
            { label: 'Confidentialité', href: '/confidentialite' },
            { label: 'CGU', href: '/cgu' },
            { label: 'Contact', href: '/contact' },
          ].map(link => (
            <Link key={link.label} href={link.href} style={{ fontSize: '13px', color: '#B0AFA8', textDecoration: 'none' }}>
              {link.label}
            </Link>
          ))}
        </div>
        <div style={{ fontSize: '13px', color: '#B0AFA8' }}>© 2025 ISALY</div>
      </footer>

      <style>{`
        @media (max-width: 760px) {
          section > div[style*="grid-template-columns: 1fr 1fr"],
          section[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          [style*="grid-template-columns: repeat(3, 1fr)"] { grid-template-columns: 1fr !important; }
          [style*="grid-template-columns: repeat(4, 1fr)"] { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  )
}
