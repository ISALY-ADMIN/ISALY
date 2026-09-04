'use client'

import { useCallback, useEffect, useState } from 'react'
import Script from 'next/script'
import Link from 'next/link'
import {
  CONSENT_OPEN_EVENT,
  openCookieSettings,
  readConsent,
  writeConsent,
  type ConsentChoice,
} from '@/lib/consent'

const GA_MEASUREMENT_ID = 'G-JXZRTY71Y4'

type Panel = 'hidden' | 'banner' | 'preferences'

/**
 * Bandeau de consentement + chargement conditionnel des scripts non essentiels.
 *
 * Google Analytics n'est monté que lorsque `consent.analytics === true` : tant
 * que l'utilisateur n'a pas accepté, aucune requête ne part vers Google.
 * Le refus est stocké au même titre que l'acceptation, pour ne pas redemander
 * à chaque visite.
 */
export default function CookieConsent() {
  const [consent, setConsent] = useState<ConsentChoice | null>(null)
  const [panel, setPanel] = useState<Panel>('hidden')
  const [analyticsOn, setAnalyticsOn] = useState(false)

  // Le rendu initial doit être identique côté serveur et client (pas d'accès
  // à localStorage pendant l'hydratation) : on lit le choix après le montage.
  useEffect(() => {
    const stored = readConsent()
    setConsent(stored)
    setAnalyticsOn(stored?.analytics ?? false)
    setPanel(stored ? 'hidden' : 'banner')
  }, [])

  useEffect(() => {
    const reopen = () => {
      setAnalyticsOn(readConsent()?.analytics ?? false)
      setPanel('preferences')
    }
    window.addEventListener(CONSENT_OPEN_EVENT, reopen)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen)
  }, [])

  const decide = useCallback((analytics: boolean) => {
    setConsent(writeConsent(analytics))
    setPanel('hidden')
  }, [])

  const analyticsGranted = consent?.analytics === true

  return (
    <>
      {analyticsGranted && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });
            `}
          </Script>
        </>
      )}

      {panel !== 'hidden' && (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookie-consent-title"
          style={{
            position: 'fixed', left: '16px', right: '16px', bottom: '16px', zIndex: 9999,
            maxWidth: '560px', margin: '0 auto',
            background: '#111614',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
            padding: '22px',
            fontFamily: "'Outfit', system-ui, sans-serif",
            color: '#fff',
          }}
        >
          <h2 id="cookie-consent-title" style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px' }}>
            {panel === 'banner' ? 'Cookies et mesure d’audience' : 'Gérer mes cookies'}
          </h2>

          <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'rgba(255,255,255,0.6)', margin: '0 0 16px' }}>
            ISALY dépose des cookies strictement nécessaires au fonctionnement du service
            (connexion, préférences) : ils ne demandent pas de consentement. Nous souhaitons
            aussi mesurer l’audience du site avec Google Analytics — ce dépôt-là est facultatif
            et n’a lieu que si vous l’acceptez.{' '}
            <Link href="/confidentialite" style={{ color: '#4ECBA0' }}>En savoir plus</Link>
          </p>

          {panel === 'preferences' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '0 0 18px' }}>
              <div style={{ padding: '13px 15px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Cookies nécessaires</span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Toujours actifs</span>
                </div>
                <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', margin: '5px 0 0', lineHeight: 1.55 }}>
                  Session de connexion, sécurité, préférences d’affichage. Sans eux le site ne fonctionne pas.
                </p>
              </div>

              <label
                style={{ padding: '13px 15px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', cursor: 'pointer', display: 'block' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Mesure d’audience</span>
                  <input
                    type="checkbox"
                    checked={analyticsOn}
                    onChange={e => setAnalyticsOn(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#10B981', cursor: 'pointer', flexShrink: 0 }}
                  />
                </div>
                <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', margin: '5px 0 0', lineHeight: 1.55 }}>
                  Google Analytics — pages consultées et parcours, pour comprendre ce qui est utile
                  et corriger ce qui bloque. Données transmises à Google.
                </p>
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {panel === 'banner' ? (
              <>
                <button onClick={() => decide(true)} style={btnPrimary}>Tout accepter</button>
                <button onClick={() => decide(false)} style={btnGhost}>Tout refuser</button>
                <button onClick={() => setPanel('preferences')} style={btnLink}>Gérer mes choix</button>
              </>
            ) : (
              <>
                <button onClick={() => decide(analyticsOn)} style={btnPrimary}>Enregistrer mes choix</button>
                <button onClick={() => decide(true)} style={btnGhost}>Tout accepter</button>
                <button onClick={() => decide(false)} style={btnGhost}>Tout refuser</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const btnBase: React.CSSProperties = {
  fontFamily: "'Outfit', system-ui, sans-serif",
  fontSize: '13.5px',
  fontWeight: 600,
  padding: '11px 18px',
  borderRadius: '10px',
  cursor: 'pointer',
  border: '1px solid transparent',
}

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: 'linear-gradient(135deg, #10B981, #059669)',
  color: '#fff',
}

const btnGhost: React.CSSProperties = {
  ...btnBase,
  background: 'rgba(255,255,255,0.06)',
  borderColor: 'rgba(255,255,255,0.14)',
  color: '#fff',
}

const btnLink: React.CSSProperties = {
  ...btnBase,
  background: 'transparent',
  color: 'rgba(255,255,255,0.55)',
  padding: '11px 8px',
}

/** Lien « Gérer mes cookies » à placer dans les pieds de page. */
export function CookieSettingsLink({ style }: { style?: React.CSSProperties }) {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      style={{
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        fontFamily: 'inherit', fontSize: '13px', color: 'rgba(255,255,255,0.3)',
        transition: 'color 0.2s',
        ...style,
      }}
      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
    >
      Gérer mes cookies
    </button>
  )
}
