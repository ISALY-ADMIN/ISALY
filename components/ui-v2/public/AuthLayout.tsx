'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { Icon, Logo } from '../primitives'
import { COL } from '../colors'
import { SiteRoot } from './SiteRoot'

/** Constellation du panneau en dégradé (orb() de la maquette), purement décorative. */
function Orb() {
  const n: [number, number, number, string, string][] = [
    [190, 110, 46, COL.violet, 'Toi'],
    [360, 70, 34, COL.azure, 'H'],
    [380, 250, 38, COL.mint, 'M'],
    [150, 290, 30, COL.sun, 'J'],
  ]
  return (
    <svg className="orb" viewBox="0 0 480 380" aria-hidden="true">
      {n.slice(1).map(([x, y]) => (
        <line key={`${x}-${y}`} x1="190" y1="110" x2={x} y2={y} stroke="#FFFFFF" strokeOpacity=".55" strokeWidth="2" strokeDasharray="4 7" />
      ))}
      {n.map(([x, y, r, c, t]) => (
        <g key={t}>
          <circle cx={x} cy={y} r={r} fill={`url(#rb${c.slice(1)})`} />
          <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="#FFFFFF" fontWeight="800" fontSize={r > 40 ? 20 : 17} fontFamily="var(--font)">{t}</text>
        </g>
      ))}
      <g transform="translate(275 90)">
        <rect x="-30" y="-15" width="60" height="30" rx="15" fill="#FFFFFF" />
        <text textAnchor="middle" dominantBaseline="central" fill="#371C9E" fontWeight="800" fontSize="14" fontFamily="var(--font)">92&#8239;%</text>
      </g>
    </svg>
  )
}

/**
 * Écran partagé des pages de compte : panneau en dégradé avec la
 * constellation à gauche, formulaire à droite ; une seule colonne sur mobile.
 */
export function AuthLayout({
  children,
  quote = 'Ta coloc idéale existe déjà.',
  sub = 'Le test de compatibilité compare tes habitudes à celles de chaque colocataire.',
}: {
  children: ReactNode
  quote?: string
  sub?: string
}) {
  return (
    <SiteRoot>
      <div className="auth">
        <aside className="auth-art">
          <Link className="plogo" href="/" aria-label="ISALY, accueil"><Logo />isaly</Link>
          <Orb />
          <div>
            <blockquote>{quote}</blockquote>
            <p>{sub}</p>
          </div>
        </aside>
        <main className="auth-form" id="contenu" tabIndex={-1}>
          <div className="auth-card">{children}</div>
        </main>
      </div>
    </SiteRoot>
  )
}

/** Bouton Google : logo officiel « G » en couleurs, sur fond neutre (règles de Google). */
export function GoogleButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button className="gbtn" type="button" onClick={onClick} disabled={disabled}>
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      {children}
    </button>
  )
}

/** Force du mot de passe sur 4 segments (longueur, chiffre, majuscule, caractère spécial). */
export function pwScore(pw: string): number {
  if (!pw) return 0
  let s = 0
  if (pw.length >= 8) s++
  if (/\d/.test(pw)) s++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++
  return s
}

/** Champ mot de passe avec bouton afficher/masquer et jauge de force (pwField de la maquette). */
export function PwField({
  id, label, value, onChange, autoComplete, meter, hint, invalid, minLength, required = true,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  meter?: boolean
  hint?: string
  invalid?: boolean
  minLength?: number
  required?: boolean
}) {
  const [show, setShow] = useState(false)
  const sc = pwScore(value)
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="pw">
        <input
          id={id}
          className="input"
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          aria-invalid={invalid || undefined}
          aria-describedby={meter ? `${id}-h` : undefined}
        />
        <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
          <Icon name={show ? 'eyeoff' : 'eye'} size={18} />
        </button>
      </div>
      {meter && (
        <>
          <div className="strength" aria-hidden="true">
            {[0, 1, 2, 3].map(i => <i key={i} className={i < sc ? 'on' : ''} />)}
          </div>
          <span className="hint" id={`${id}-h`}>{hint ?? '8 caractères minimum, avec au moins un chiffre.'}</span>
        </>
      )}
    </div>
  )
}
