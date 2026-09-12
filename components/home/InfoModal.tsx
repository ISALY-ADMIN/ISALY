'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

/**
 * Fenêtres secondaires du footer — « Comment ça marche », « Notre communauté »,
 * « Rejoindre ISALY ».
 *
 * Contenu repris mot pour mot de la maquette (objet MODALS : steps / trust /
 * cta). Les boutons de la maquette étaient inertes ; ils pointent ici vers les
 * vraies routes du site (test de personnalité, inscription).
 */

export type InfoModalKey = 'steps' | 'trust' | 'cta'

const ACCENT = '#4ADE80'
const SERIF = "'Fraunces', serif"
const SANS = "'Outfit', sans-serif"

const STEPS = [
  {
    n: '1',
    title: 'Réponds au test',
    body: '15 questions sur ton rythme de vie, ta sociabilité et ton rapport au calme et au partage. Cinq minutes, une fois.',
  },
  {
    n: '2',
    title: 'Swipe les logements',
    body: 'Chaque carte affiche ta compatibilité avec les colocataires déjà en place, ou juste le logement s’il est encore vide.',
  },
  {
    n: '3',
    title: 'Emménage',
    body: 'Candidate, discute avec les colocataires et le loueur, signe ton bail directement depuis ton espace.',
  },
]

function CtaButton({ href, children, large = false }: { href: string; children: React.ReactNode; large?: boolean }) {
  return (
    <Link
      href={href}
      style={{
        display: 'inline-block', marginTop: 6, background: ACCENT, color: '#08170F',
        fontWeight: 700, fontFamily: SANS, textDecoration: 'none', borderRadius: 100,
        fontSize: large ? 15 : 14, padding: large ? '14px 28px' : '12px 24px',
      }}
    >
      {children}
    </Link>
  )
}

function StepsContent() {
  return (
    <>
      <h2 className="isaly-serif" style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 26, margin: '0 0 8px' }}>
        Comment ça marche
      </h2>
      <p style={{ color: 'rgba(246,243,240,0.62)', fontSize: 14.5, margin: '0 0 26px' }}>
        Trois étapes, dans cet ordre — le test avant le swipe, pas après.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {STEPS.map(s => (
          <div key={s.n}>
            <p className="isaly-serif" style={{ fontFamily: SERIF, fontStyle: 'italic', fontWeight: 400, fontSize: 22, color: ACCENT, margin: '0 0 4px' }}>
              {s.n}
            </p>
            <h3 style={{ fontSize: 15, margin: '0 0 4px', fontWeight: 600 }}>{s.title}</h3>
            <p style={{ fontSize: 13.5, color: 'rgba(246,243,240,0.62)', margin: 0, lineHeight: 1.5 }}>
              {s.body}
            </p>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 26 }}>
        <CtaButton href="/onboarding">Faire le test de personnalité</CtaButton>
      </div>
    </>
  )
}

function TrustContent() {
  return (
    <>
      <h2 className="isaly-serif" style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 26, margin: '0 0 8px' }}>
        Notre communauté
      </h2>
      <p style={{ color: 'rgba(246,243,240,0.62)', fontSize: 14.5, margin: '0 0 26px' }}>
        On construit cette plateforme avec nos premiers loueurs et locataires à Lyon,
        Paris et Toulouse — pas de faux chiffres, juste une vraie communauté qui démarre.
      </p>
      <CtaButton href="/auth/register">Créer mon compte gratuitement</CtaButton>
    </>
  )
}

function CtaContent() {
  return (
    <>
      <h2 className="isaly-serif" style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 26, margin: '0 0 8px' }}>
        Ta coloc idéale existe déjà. Reste à la trouver.
      </h2>
      <p style={{ color: 'rgba(246,243,240,0.62)', fontSize: 14.5, margin: '0 0 26px' }}>
        Réponds au test de personnalité et commence à swiper des logements compatibles
        dès aujourd’hui.
      </p>
      <CtaButton href="/auth/register" large>Créer mon compte gratuitement</CtaButton>
    </>
  )
}

const CONTENT: Record<InfoModalKey, () => React.ReactElement> = {
  steps: StepsContent,
  trust: TrustContent,
  cta: CtaContent,
}

const LABEL: Record<InfoModalKey, string> = {
  steps: 'Comment ça marche',
  trust: 'Notre communauté',
  cta: 'Rejoindre ISALY',
}

interface Props {
  openKey: InfoModalKey | null
  onClose: () => void
}

export default function InfoModal({ openKey, onClose }: Props) {
  useEffect(() => {
    if (!openKey) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [openKey, onClose])

  if (!openKey) return null
  const Body = CONTENT[openKey]

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      role="dialog"
      aria-modal="true"
      aria-label={LABEL[openKey]}
    >
      <div style={{
        position: 'relative', background: '#131110',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 22,
        padding: 40, maxWidth: 520, width: '100%', maxHeight: '86vh',
        overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        color: '#F6F3F0',
      }}>
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: 'absolute', top: 14, right: 14, width: 32, height: 32,
            borderRadius: '50%', background: 'rgba(246,243,240,0.08)',
            border: 'none', color: '#F6F3F0', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
          }}
        >
          <X size={16} />
        </button>
        <Body />
      </div>
    </div>
  )
}
