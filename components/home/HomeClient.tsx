'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { Heart, Lock, Search, KeyRound, ArrowRight } from 'lucide-react'
import { CookieSettingsLink } from '@/components/consent/CookieConsent'
import SwipeModal from '@/components/home/SwipeModal'
import InfoModal, { type InfoModalKey } from '@/components/home/InfoModal'
import type { HomeSearchResult, HomeSearchResponse } from '@/app/api/home-search/route'

/**
 * Page d'accueil publique — recherche, résultats en vue scindée, swipe.
 *
 * Suit la maquette isaly-home-preview.html (structure, copy, habillage). Trois
 * différences assumées, toutes dans le sens du vrai produit :
 *
 *   · les cards, les pins et la fenêtre swipe affichent de VRAIES annonces
 *     (/api/home-search), pas les tableaux en dur de la maquette ;
 *   · la carte est une vraie carte Leaflet, pas le SVG illustratif ;
 *   · la fenêtre swipe réutilise components/swipe/ListingSwipeCard, pas la
 *     fausse carte HTML de la maquette (qui portait le bug de chevauchement).
 */

// La carte ne doit jamais partir en rendu serveur : Leaflet touche `window`.
const HomeMap = dynamic(() => import('@/components/home/HomeMap'), {
  ssr: false,
  loading: () => (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, color: 'rgba(246,243,240,0.38)',
    }}>
      Chargement de la carte…
    </div>
  ),
})

// ── Jetons de la maquette ────────────────────────────────────────────────────
const BG = '#0A0A0A'
const BG_ELEV = '#131110'
const CARD = '#EFEAE6'
const CARD_INK = '#201B18'
const CARD_DIM = 'rgba(32,27,24,0.58)'
const INK = '#F6F3F0'
const INK_DIM = 'rgba(246,243,240,0.62)'
const INK_FAINT = 'rgba(246,243,240,0.38)'
const LINE = 'rgba(255,255,255,0.1)'
const ACCENT = '#4ADE80'
const ACCENT_INK = '#08170F'
const SERIF = "'Fraunces', serif"
const SANS = "'Outfit', sans-serif"

const WRAP: React.CSSProperties = {
  maxWidth: 1180, margin: '0 auto', padding: '0 clamp(16px, 4vw, 32px)',
}

/** Filtres rapides de la maquette. Ils trient/filtrent les résultats déjà chargés. */
type PillKey = 'all' | 'libre' | 'occupee' | 'meuble' | 'sous700'
const PILLS: { key: PillKey; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'libre', label: 'Studio libre' },
  { key: 'occupee', label: 'Coloc en place' },
  { key: 'meuble', label: 'Meublé' },
  { key: 'sous700', label: '< 700 €' },
]

interface Props {
  /** Résultats rendus côté serveur au premier affichage (SEO + pas de flash). */
  initialResults: HomeSearchResult[]
  initialTotal: number
}

export default function HomeClient({ initialResults, initialTotal }: Props) {
  const [city, setCity] = useState('')
  const [budget, setBudget] = useState('')
  const [from, setFrom] = useState('')

  const [results, setResults] = useState<HomeSearchResult[]>(initialResults)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const [searchedCity, setSearchedCity] = useState('')

  const [pill, setPill] = useState<PillKey>('all')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const [swipeOpen, setSwipeOpen] = useState(false)
  const [infoKey, setInfoKey] = useState<InfoModalKey | null>(null)

  const runSearch = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (city.trim()) p.set('city', city.trim())
    if (budget) p.set('budget_max', budget)
    if (from) p.set('from', from)
    try {
      const res = await fetch(`/api/home-search?${p.toString()}`)
      const data: HomeSearchResponse = await res.json()
      setResults(data.results)
      setTotal(data.total)
      setSearchedCity(data.city)
      setPill('all')
    } catch {
      /* on garde les résultats précédents plutôt que de vider l'écran */
    } finally {
      setLoading(false)
    }
  }, [city, budget, from])

  // ── Filtres rapides, appliqués aux résultats déjà chargés ──
  const shown = useMemo(() => {
    switch (pill) {
      case 'libre':    return results.filter(r => r.occupancy.current <= 1)
      case 'occupee':  return results.filter(r => r.occupancy.current > 1)
      case 'meuble':   return results.filter(r => r.meuble === true)
      case 'sous700':  return results.filter(r => r.rent > 0 && r.rent < 700)
      default:         return results
    }
  }, [results, pill])

  const mapItems = useMemo(
    () => shown
      .filter(r => r.coords !== null)
      .map(r => ({ id: r.id, rent: r.rent, coords: r.coords as [number, number], city: r.city })),
    [shown],
  )

  const headline = searchedCity
    ? `${total} logement${total > 1 ? 's' : ''} à ${searchedCity}`
    : `${total} logement${total > 1 ? 's' : ''} disponible${total > 1 ? 's' : ''}`

  return (
    <div style={{ background: BG, color: INK, minHeight: '100vh', overflowX: 'hidden' }}>
      {/* dangerouslySetInnerHTML et non un enfant texte : React échappe les
          apostrophes d'un enfant de <style> côté serveur (&#x27;) mais pas au
          rendu client, ce qui casse l'hydratation de toute la page. */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Le sélecteur global * { font-family: Outfit !important } de
           globals.css écrase tout : on rouvre une porte, uniquement pour les
           titres serif de cette page. */
        .home-serif { font-family: ${SERIF} !important; }
        .home-scroll::-webkit-scrollbar { width: 6px; }
        .home-scroll::-webkit-scrollbar-thumb { background: ${LINE}; border-radius: 10px; }
        .home-lcard { transition: transform 0.18s ease; }
        .home-lcard:hover { transform: translateY(-3px); }
        .home-pill { transition: background 0.15s ease, color 0.15s ease; }
        .leaflet-container { background: #1B1917; }
        @media (max-width: 900px) {
          .home-results-grid { grid-template-columns: 1fr !important; }
          .home-map-pane { height: 320px !important; position: relative !important; top: 0 !important; }
          .home-listing-scroll { max-height: none !important; overflow: visible !important; }
        }
        @media (max-width: 560px) {
          .home-listing-scroll { grid-template-columns: 1fr !important; }
          .home-searchbar { flex-direction: column !important; border-radius: 24px !important; }
          .home-sf-divider { display: none !important; }
          .home-sf { width: 100% !important; }
          .home-submit { width: 100% !important; justify-content: center !important; margin: 4px 0 0 !important; }
        }
      ` }} />

      {/* ══════════ NAV ══════════ */}
      <header style={{ borderBottom: `1px solid ${LINE}` }}>
        <div style={{ ...WRAP, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68, gap: 16 }}>
          <Link href="/" aria-label="ISALY — accueil" style={{ display: 'flex', alignItems: 'center' }}>
            <Image src="/LOGO_ISALY.png" alt="ISALY" height={26} width={82}
              style={{ width: 'auto', height: 26, objectFit: 'contain' }} priority />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/app/annonce" style={{
              color: INK_DIM, textDecoration: 'none', fontSize: 13.5, fontWeight: 500,
              padding: '8px 12px',
            }}>
              Mettre mon logement en location
            </Link>
            <Link href="/auth/login" style={{
              color: INK, textDecoration: 'none', fontSize: 13.5, fontWeight: 600,
              padding: '9px 16px', borderRadius: 100, border: `1px solid ${LINE}`,
            }}>
              Se connecter
            </Link>
            <Link href="/auth/register" style={{
              background: ACCENT, color: ACCENT_INK, textDecoration: 'none',
              fontSize: 13.5, fontWeight: 700, padding: '10px 18px', borderRadius: 100,
            }}>
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </header>

      {/* ══════════ HERO + RECHERCHE ══════════ */}
      <section style={{ padding: '54px 0 40px', textAlign: 'center' }}>
        <div style={WRAP}>
          <p className="home-serif" style={{
            fontStyle: 'italic', fontWeight: 500, fontSize: 17, color: ACCENT, margin: '0 0 10px',
          }}>
            Ta coloc idéale existe déjà
          </p>
          <h1 className="home-serif" style={{
            fontWeight: 500, fontSize: 'clamp(32px, 5vw, 52px)', lineHeight: 1.08,
            letterSpacing: '-0.01em', margin: '0 auto 34px', maxWidth: 700,
          }}>
            Trouve un logement, avec les bonnes personnes dedans.
          </h1>

          <form
            className="home-searchbar"
            role="search"
            onSubmit={e => { e.preventDefault(); runSearch() }}
            style={{
              display: 'inline-flex', alignItems: 'stretch', gap: 2,
              background: BG_ELEV, border: `1px solid ${LINE}`, borderRadius: 100,
              padding: 6, boxShadow: '0 24px 60px rgba(0,0,0,0.5)', maxWidth: '100%',
              textAlign: 'left',
            }}
          >
            <label className="home-sf" style={sfStyle}>
              <span style={sfLabel}>Où</span>
              <input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Lyon, Paris, Toulouse…"
                style={sfInput}
              />
            </label>

            <span className="home-sf-divider" style={{ width: 1, background: LINE, margin: '10px 0' }} />

            <label className="home-sf" style={sfStyle}>
              <span style={sfLabel}>Budget</span>
              <select value={budget} onChange={e => setBudget(e.target.value)} style={{ ...sfInput, cursor: 'pointer' }}>
                <option value="">Peu importe</option>
                <option value="500">Jusqu&apos;à 500 €/mois</option>
                <option value="600">Jusqu&apos;à 600 €/mois</option>
                <option value="700">Jusqu&apos;à 700 €/mois</option>
                <option value="800">Jusqu&apos;à 800 €/mois</option>
                <option value="1000">Jusqu&apos;à 1000 €/mois</option>
              </select>
            </label>

            <span className="home-sf-divider" style={{ width: 1, background: LINE, margin: '10px 0' }} />

            <label className="home-sf" style={sfStyle}>
              <span style={sfLabel}>Arrivée</span>
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                style={{ ...sfInput, cursor: 'pointer' }}
                aria-label="Date d'arrivée souhaitée"
              />
            </label>

            <button
              type="submit"
              className="home-submit"
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, background: ACCENT,
                color: ACCENT_INK, border: 'none', borderRadius: 100,
                padding: '0 24px 0 20px', fontWeight: 700, fontSize: 14,
                marginLeft: 4, cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.7 : 1, fontFamily: SANS,
              }}
            >
              <Search size={15} />
              {loading ? 'Recherche…' : 'Rechercher'}
            </button>
          </form>

          <p style={{ margin: '18px 0 0', fontSize: 13.5, color: INK_FAINT }}>
            Ou réponds au test de personnalité pour voir ton score de compatibilité sur chaque logement ↓
          </p>
        </div>
      </section>

      {/* ══════════ RÉSULTATS : logements + carte ══════════ */}
      <section style={{ padding: '46px 0 70px' }}>
        <div style={WRAP}>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            marginBottom: 20, gap: 16, flexWrap: 'wrap',
          }}>
            <div>
              <h2 className="home-serif" style={{ fontWeight: 500, fontSize: 24, margin: 0 }}>
                {headline}
              </h2>
              <p style={{ margin: '4px 0 0', color: INK_DIM, fontSize: 14 }}>
                Classés par compatibilité pour les logements déjà occupés
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PILLS.map(p => {
                const active = pill === p.key
                return (
                  <button
                    key={p.key}
                    className="home-pill"
                    onClick={() => setPill(p.key)}
                    style={{
                      fontSize: 13, fontWeight: 600, padding: '8px 15px', borderRadius: 100,
                      border: `1px solid ${active ? INK : LINE}`, whiteSpace: 'nowrap',
                      background: active ? INK : 'transparent',
                      color: active ? BG : INK_DIM, cursor: 'pointer', fontFamily: SANS,
                    }}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="home-results-grid" style={{
            display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 22, alignItems: 'start',
          }}>
            {/* ── Grille de logements réels ── */}
            <div className="home-listing-scroll home-scroll" style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
              maxHeight: 680, overflowY: 'auto', paddingRight: 6,
            }}>
              {shown.length === 0 && (
                <p style={{ gridColumn: '1 / -1', color: INK_FAINT, fontSize: 14, padding: '20px 0' }}>
                  Aucun logement ne correspond à cette recherche.
                </p>
              )}
              {shown.map(r => (
                <ListingCard
                  key={r.id}
                  listing={r}
                  onHover={setHoveredId}
                />
              ))}
            </div>

            {/* ── Vraie carte ── */}
            <div className="home-map-pane" style={{
              position: 'sticky', top: 20, height: 680, borderRadius: 20,
              overflow: 'hidden', background: '#1B1917', border: `1px solid ${LINE}`,
            }}>
              <HomeMap items={mapItems} hoveredId={hoveredId} onMarkerClick={setHoveredId} />
              <div style={{
                position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 500,
                background: 'rgba(19,17,16,0.9)', backdropFilter: 'blur(6px)',
                border: `1px solid ${LINE}`, borderRadius: 12, padding: '9px 12px',
                fontSize: 11.5, color: INK_FAINT, lineHeight: 1.4,
              }}>
                🗺️ Position approximative du quartier — l&apos;adresse exacte est partagée
                après validation de ton dossier.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ DIFFÉRENCIANT + LANCEMENT DU SWIPE ══════════ */}
      <section style={{ borderTop: `1px solid ${LINE}`, padding: '70px 0' }}>
        <div style={{
          ...WRAP, display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
          gap: 48, alignItems: 'center',
        }}>
          <div>
            <h2 className="home-serif" style={{
              fontWeight: 500, fontSize: 'clamp(26px, 3.4vw, 36px)', lineHeight: 1.15, margin: '0 0 14px',
            }}>
              Le logement, tout le monde sait le trouver. Les bonnes personnes, non.
            </h2>
            <p style={{ color: INK_DIM, fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>
              Chaque annonce occupée affiche ta compatibilité réelle avec les colocataires
              déjà en place — pas juste avec l&apos;annonce.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
              {[
                <><strong>Un vrai test de personnalité</strong> — rythme de vie, propreté, sociabilité, calme, partage.</>,
                <><strong>Un score par logement</strong>, calculé avec les colocataires déjà présents, pas un score générique.</>,
                <><strong>Aucun algorithme quand c&apos;est vide</strong> — un logement sans colocataire, c&apos;est juste un dossier à déposer.</>,
              ].map((node, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', background: ACCENT,
                    marginTop: 7, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 14.5, lineHeight: 1.55, color: INK_DIM }}>{node}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/onboarding" style={{
                background: ACCENT, color: ACCENT_INK, textDecoration: 'none',
                fontSize: 15, fontWeight: 700, padding: '14px 26px', borderRadius: 100,
              }}>
                Faire le test de personnalité
              </Link>
              <button
                onClick={() => setSwipeOpen(true)}
                style={{
                  background: 'transparent', color: INK, border: `1px solid ${LINE}`,
                  fontSize: 15, fontWeight: 600, padding: '14px 26px', borderRadius: 100,
                  cursor: 'pointer', fontFamily: SANS,
                }}
              >
                Essayer le swipe →
              </button>
            </div>
          </div>

          {/* Aperçu cliquable qui ouvre la fenêtre swipe (maquette : .swipe-launch) */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <SwipeLaunch listing={results[0] ?? null} onClick={() => setSwipeOpen(true)} />
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer style={{ borderTop: `1px solid ${LINE}`, padding: '34px 0 40px' }}>
        <div style={{
          ...WRAP, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '16px 28px', color: INK_FAINT, fontSize: 13,
        }}>
          <Link href="/" aria-label="ISALY — accueil" style={{ display: 'flex', alignItems: 'center' }}>
            <Image src="/LOGO_ISALY.png" alt="ISALY" height={24} width={76}
              style={{ width: 'auto', height: 24, objectFit: 'contain', opacity: 0.8 }} />
          </Link>

          {/* Les trois fenêtres de la maquette */}
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            {([
              ['steps', 'Comment ça marche'],
              ['trust', 'Notre communauté'],
              ['cta', 'Rejoindre ISALY'],
            ] as [InfoModalKey, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setInfoKey(key)}
                style={{
                  background: 'none', border: 'none', padding: 0, color: INK_FAINT,
                  fontSize: 13, fontFamily: SANS, fontWeight: 600, cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
                onMouseLeave={e => (e.currentTarget.style.color = INK_FAINT)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Liens légaux existants — conservés tels quels, RGPD inclus */}
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { label: 'Mentions légales', href: '/mentions-legales' },
              { label: 'CGU', href: '/cgu' },
              { label: 'Confidentialité', href: '/confidentialite' },
              { label: 'Contact', href: '/contact' },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{
                color: INK_FAINT, textDecoration: 'none', fontWeight: 400, fontSize: 13,
              }}>
                {l.label}
              </Link>
            ))}
            <CookieSettingsLink />
          </div>

          <span style={{
            width: '100%', textAlign: 'left', paddingTop: 4, borderTop: `1px solid ${LINE}`,
            marginTop: 4, fontSize: 12,
          }}>
            © ISALY
          </span>
        </div>
      </footer>

      <SwipeModal open={swipeOpen} onClose={() => setSwipeOpen(false)} listings={results} />
      <InfoModal openKey={infoKey} onClose={() => setInfoKey(null)} />
    </div>
  )
}

// ── Styles de champ de la barre de recherche ────────────────────────────────
const sfStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', justifyContent: 'center',
  padding: '8px 22px', borderRadius: 100, textAlign: 'left', minWidth: 150,
  border: 'none', background: 'transparent', color: INK, cursor: 'text',
}
const sfLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.02em', color: INK,
}
const sfInput: React.CSSProperties = {
  fontSize: 13, color: INK, marginTop: 1, background: 'transparent',
  border: 'none', outline: 'none', padding: 0, width: '100%', fontFamily: SANS,
  colorScheme: 'dark',
}

// ── Card de logement (maquette : .lcard) ────────────────────────────────────
function ListingCard({ listing, onHover }: {
  listing: HomeSearchResult
  onHover: (id: string | null) => void
}) {
  const photo = listing.photos.find(Boolean) ?? null
  const place = listing.neighborhood
    ? `${listing.city} · ${listing.neighborhood}`
    : listing.city
  const { current, total } = listing.occupancy
  // Règle déjà en place ailleurs : un logement vide n'a pas de score, on
  // candidate directement. Un logement occupé a un score, mais il est verrouillé
  // tant que le visiteur n'a pas de profil.
  const empty = current <= 1

  return (
    <Link
      href={`/annonce/${listing.id}`}
      className="home-lcard"
      onMouseEnter={() => onHover(listing.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        background: CARD, color: CARD_INK, borderRadius: 18, overflow: 'hidden',
        textDecoration: 'none', display: 'block',
      }}
    >
      <div style={{
        height: 132, position: 'relative',
        background: 'linear-gradient(135deg, #C9BEB4, #8D9C8A)',
      }}>
        {photo && (
          <Image src={photo} alt={listing.title} fill sizes="(max-width: 900px) 50vw, 280px"
            style={{ objectFit: 'cover' }} />
        )}
        <span style={{
          position: 'absolute', top: 9, right: 9, width: 26, height: 26, borderRadius: '50%',
          background: 'rgba(0,0,0,0.32)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#fff',
        }}>
          <Heart size={13} />
        </span>
      </div>
      <div style={{ padding: '12px 13px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{place}</div>
        <div style={{ fontSize: 11.5, color: CARD_DIM, marginTop: 2 }}>
          {listing.rooms > 0 ? `T${listing.rooms + 1} · ` : ''}{current}/{total}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10,
        }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>
            {listing.rent} € <span style={{ fontWeight: 500, color: CARD_DIM, fontSize: 11 }}>/mois</span>
          </div>
          {empty ? (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
              padding: '4px 9px', borderRadius: 100, background: 'rgba(32,27,24,0.08)',
            }}>
              <KeyRound size={11} /> Postuler
            </span>
          ) : (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
              padding: '4px 9px', borderRadius: 100, background: 'rgba(32,27,24,0.08)',
              color: CARD_DIM,
            }}>
              <Lock size={11} /> Connecte-toi
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ── Aperçu cliquable du swipe (maquette : .swipe-launch) ────────────────────
function SwipeLaunch({ listing, onClick }: { listing: HomeSearchResult | null; onClick: () => void }) {
  const photo = listing?.photos.find(Boolean) ?? null
  const place = listing
    ? (listing.neighborhood ? `${listing.city} · ${listing.neighborhood}` : listing.city)
    : 'Ta prochaine coloc'

  return (
    <button
      onClick={onClick}
      aria-label="Lancer le mode swipe"
      style={{
        all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 18,
      }}
    >
      <div style={{ position: 'relative', width: 250, height: 300 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 20, background: '#D8D2CD',
          transform: 'rotate(-6deg) translateY(6px)', opacity: 0.5,
        }} />
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 20, background: CARD,
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            height: '62%', position: 'relative',
            background: 'linear-gradient(135deg, #DED4C8, #9AA593)',
          }}>
            {photo && (
              <Image src={photo} alt="" fill sizes="250px" style={{ objectFit: 'cover' }} />
            )}
          </div>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 14px', color: CARD_INK, fontSize: 12.5, fontWeight: 600, gap: 8,
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {place}{listing ? ` · ${listing.rent} €/mois` : ''}
            </span>
          </div>
        </div>
      </div>
      <span style={{
        display: 'flex', alignItems: 'center', gap: 8, background: ACCENT, color: ACCENT_INK,
        fontWeight: 700, fontSize: 14, padding: '12px 22px', borderRadius: 100, fontFamily: SANS,
      }}>
        <ArrowRight size={16} />
        Lancer le mode swipe
      </span>
    </button>
  )
}
