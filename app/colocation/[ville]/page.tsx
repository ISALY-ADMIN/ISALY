import { createClient } from '@/lib/supabase/server'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, FileCheck, ShieldCheck } from 'lucide-react'
import Emoji from '@/components/ui/Emoji'
import { getArticlesByCity } from '@/content/blog/articles'

export const revalidate = 3600

const CITIES: Record<string, string> = {
  paris: 'Paris',
  marseille: 'Marseille',
  lyon: 'Lyon',
  toulouse: 'Toulouse',
  nice: 'Nice',
  nantes: 'Nantes',
  montpellier: 'Montpellier',
  strasbourg: 'Strasbourg',
  bordeaux: 'Bordeaux',
  lille: 'Lille',
  rennes: 'Rennes',
  reims: 'Reims',
  toulon: 'Toulon',
  'saint-etienne': 'Saint-Étienne',
  'le-havre': 'Le Havre',
  grenoble: 'Grenoble',
  dijon: 'Dijon',
  angers: 'Angers',
  nimes: 'Nîmes',
  'clermont-ferrand': 'Clermont-Ferrand',
}

const MAIN_CITIES = ['paris', 'lyon', 'marseille', 'bordeaux', 'toulouse', 'nantes', 'lille', 'strasbourg']

function slugify(city: string): string {
  return city.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function unslugify(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')
}

export async function generateStaticParams() {
  const slugs = new Set(Object.keys(CITIES))
  // Villes réellement présentes dans les annonces actives (generateStaticParams
  // tourne au build sans contexte de requête → client anon direct)
  try {
    const supabase = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    const { data } = await supabase.from('listings').select('city').eq('is_active', true).limit(1000)
    for (const l of data ?? []) {
      if (l.city) slugs.add(slugify(l.city))
    }
  } catch { /* build sans DB : villes statiques uniquement */ }
  return Array.from(slugs).map(ville => ({ ville }))
}

interface Props {
  params: { ville: string }
}

function cityNameOf(slug: string): string {
  return CITIES[slug] ?? unslugify(slug)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cityName = cityNameOf(params.ville)

  let count = 0
  let ogPhoto: string | null = null
  try {
    const supabase = createClient()
    const { data, count: c } = await supabase
      .from('listings')
      .select('photos', { count: 'exact' })
      .eq('is_active', true)
      .ilike('city', `%${cityName.split('-')[0]}%`)
      .limit(5)
    count = c ?? 0
    ogPhoto = (data ?? []).map(l => (l.photos as string[] | null)?.[0]).find(Boolean) ?? null
  } catch {}

  return {
    title: `Colocation à ${cityName} — ISALY`,
    description: `Trouvez votre colocation à ${cityName} avec ISALY. ${count > 0 ? `${count} annonce${count > 1 ? 's' : ''} disponible${count > 1 ? 's' : ''}, ` : ''}matching intelligent, bail en ligne.`,
    alternates: { canonical: `https://isaly.fr/colocation/${params.ville}` },
    openGraph: {
      title: `Colocation à ${cityName} — ISALY`,
      description: `Matching intelligent pour trouver la coloc parfaite à ${cityName}.`,
      url: `https://isaly.fr/colocation/${params.ville}`,
      siteName: 'ISALY',
      images: [{ url: ogPhoto ?? '/og-image.png', width: 1200, height: 630 }],
      locale: 'fr_FR',
      type: 'website',
    },
  }
}

const BOOST_RANK: Record<string, number> = { priority: 0, featured: 1, standard: 2 }

export default async function ColocationVillePage({ params }: Props) {
  const cityName = cityNameOf(params.ville)

  const supabase = createClient()
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, city, neighborhood, rent, surface, rooms_available, occupants_current, capacity_total, photos, boost_tier, boost_type, created_at')
    .eq('is_active', true)
    .ilike('city', `%${cityName.split('-')[0]}%`)
    .order('created_at', { ascending: false })
    .limit(60)

  const all = listings ?? []

  // Les mieux mises en avant d'abord, 12 max
  const results = [...all]
    .sort((a, b) => {
      const ra = BOOST_RANK[(a.boost_tier ?? a.boost_type ?? 'standard') as string] ?? 2
      const rb = BOOST_RANK[(b.boost_tier ?? b.boost_type ?? 'standard') as string] ?? 2
      return ra - rb || String(b.created_at).localeCompare(String(a.created_at))
    })
    .slice(0, 12)

  // Stats locales
  const rents = all.map(l => l.rent as number).filter(r => r > 0)
  const surfaces = all.map(l => l.surface as number | null).filter((s): s is number => s != null && s > 0)
  const avgRent = rents.length ? Math.round(rents.reduce((a, b) => a + b, 0) / rents.length) : null
  const minRent = rents.length ? Math.min(...rents) : null
  const maxRent = rents.length ? Math.max(...rents) : null
  const avgSurface = surfaces.length ? Math.round(surfaces.reduce((a, b) => a + b, 0) / surfaces.length) : null

  const cityGuides = getArticlesByCity(cityName)

  const ADVANTAGES = [
    { icon: Heart, title: 'Matching compatible', desc: `Notre algorithme analyse 40+ critères de mode de vie pour vous proposer uniquement des colocataires compatibles à ${cityName}.` },
    { icon: FileCheck, title: 'Bail en ligne', desc: 'Rédaction conforme loi 89, signature électronique, quittances automatiques — zéro paperasse, tout est dans l’app.' },
    { icon: ShieldCheck, title: 'Dossiers vérifiés', desc: 'Identité et revenus certifiés en 3 niveaux. Locataires comme loueurs savent à qui ils parlent.' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', fontFamily: "'Outfit', sans-serif", color: '#fff' }}>

      {/* Navbar simple */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" aria-label="ISALY — accueil">
          <Image src="/LOGO_ISALY.png" alt="ISALY" height={24} width={76} style={{ width: 'auto', height: '24px', objectFit: 'contain' }} />
        </Link>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/auth/login" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
            Se connecter
          </Link>
          <Link href="/auth/register" style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#fff', textDecoration: 'none', background: 'linear-gradient(135deg, #10B981, #059669)' }}>
            Inscription gratuite
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* ── Header SEO ── */}
        <div style={{ marginBottom: '36px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px', color: '#10B981', marginBottom: '16px' }}>
            COLOCATION · {cityName.toUpperCase()}
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, color: '#fff', margin: '0 0 12px', lineHeight: 1.1, letterSpacing: '-1px' }}>
            Colocation à {cityName}
          </h1>
          <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.55)', margin: '0 0 20px' }}>
            {all.length > 0
              ? <>{all.length} annonce{all.length > 1 ? 's' : ''} disponible{all.length > 1 ? 's' : ''}{avgRent ? <> · Loyer moyen : <strong style={{ color: '#10B981' }}>{avgRent}€/mois</strong></> : null}</>
              : `Trouvez votre colocation idéale à ${cityName} avec le matching intelligent ISALY.`}
          </p>

          {/* Stats locales */}
          {all.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {[
                `${all.length} annonce${all.length > 1 ? 's' : ''} active${all.length > 1 ? 's' : ''}`,
                minRent != null && maxRent != null ? `Loyers de ${minRent}€ à ${maxRent}€` : null,
                avgSurface ? `Surface moyenne ${avgSurface} m²` : null,
              ].filter(Boolean).map(s => (
                <span key={s as string} style={{
                  fontSize: '12.5px', fontWeight: 600, padding: '7px 14px', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)',
                }}>{s}</span>
              ))}
            </div>
          )}
        </div>

        {/* ── Grille d'annonces ── */}
        {results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}><Emoji native="🔍" /></div>
            <h2 style={{ fontSize: '22px', color: '#fff', marginBottom: '12px' }}>Pas encore d&apos;annonces à {cityName}</h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', marginBottom: '28px' }}>
              Soyez le premier à publier ou créez votre profil pour être alerté dès qu&apos;une annonce apparaît.
            </p>
            <Link href="/auth/register" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600, padding: '13px 28px', borderRadius: '12px' }}>
              Créer mon profil — gratuit →
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '28px' }}>
              {results.map(l => {
                const total = (l.capacity_total as number | null) ?? ((l.occupants_current as number | null) ?? 0) + ((l.rooms_available as number | null) ?? 0)
                const current = (l.occupants_current as number | null) ?? 0
                const boosted = ((l.boost_tier ?? l.boost_type ?? 'standard') as string) !== 'standard'
                return (
                  <Link key={l.id} href={`/annonce/${l.id}`} style={{ textDecoration: 'none' }}>
                    <div className="listing-card" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', height: '100%' }}>
                      <div style={{ height: '160px', background: 'linear-gradient(135deg, #0f2e24, #04160f)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                        {(l.photos as string[] | null)?.[0] ? (
                          <Image src={(l.photos as string[])[0]} alt={(l.title as string) ?? `Colocation à ${cityName}`} fill sizes="280px" style={{ objectFit: 'cover' }} />
                        ) : <Emoji native="🏠" size="40px" />}
                        {boosted && (
                          <span style={{ position: 'absolute', top: 10, right: 10, fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '12px', background: 'rgba(245,158,11,0.92)', color: '#fff' }}>
                            ★ MIS EN AVANT
                          </span>
                        )}
                      </div>
                      <div style={{ padding: '16px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.title || `Colocation à ${l.city}`}
                        </div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '10px' }}>
                          <Emoji native="📍" /> {l.city}{l.neighborhood ? ` · ${l.neighborhood}` : ''}
                          {l.rooms_available ? ` · ${l.rooms_available} ch.` : ''}
                          {total > 0 ? ` · ${current}/${total} places` : ''}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10B981' }}>{l.rent}€<span style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>/mois</span></div>
                          {l.surface != null && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{l.surface}m²</div>}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <Link href="/auth/register" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', textDecoration: 'none', fontSize: '15px', fontWeight: 700, padding: '14px 32px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(16,185,129,0.35)' }}>
                Voir toutes les annonces à {cityName} →
              </Link>
            </div>
          </>
        )}

        {/* ── Pourquoi ISALY ── */}
        <div style={{ marginTop: '48px', marginBottom: '48px' }}>
          <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 34px)', fontWeight: 700, color: '#fff', textAlign: 'center', margin: '0 0 40px', letterSpacing: '-0.5px' }}>
            Pourquoi choisir ISALY à {cityName} ?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {ADVANTAGES.map(a => {
              const Icon = a.icon
              return (
                <div key={a.title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '28px', textAlign: 'center' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '16px', margin: '0 auto 16px',
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={22} color="#10B981" strokeWidth={1.8} />
                  </div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>{a.title}</h3>
                  <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0 }}>{a.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Guide blog ── */}
        {cityGuides.length > 0 ? (
          <Link href={`/blog/${cityGuides[0].slug}`} style={{
            display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none',
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '16px', padding: '18px 20px', marginBottom: '48px',
          }}>
            <span style={{ fontSize: '24px' }}><Emoji native="📖" size="24px" /></span>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#fff' }}>Lire notre guide de la colocation à {cityName}</div>
              <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{cityGuides[0].title}</div>
            </div>
            <span style={{ marginLeft: 'auto', color: '#10B981', fontWeight: 700 }}>→</span>
          </Link>
        ) : (
          <Link href="/blog" style={{
            display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none',
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: '16px', padding: '18px 20px', marginBottom: '48px',
          }}>
            <span style={{ fontSize: '24px' }}><Emoji native="📖" size="24px" /></span>
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#fff' }}>Nos guides de la colocation</div>
              <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Droits, conseils et bonnes pratiques sur ISALY Immo</div>
            </div>
            <span style={{ marginLeft: 'auto', color: '#10B981', fontWeight: 700 }}>→</span>
          </Link>
        )}

        {/* ── CTA final ── */}
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '20px' }}>
          <h2 style={{ fontSize: '24px', color: '#fff', marginBottom: '12px' }}>
            Trouvez votre colocataire idéal à {cityName}
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', maxWidth: '480px', margin: '0 auto 24px' }}>
            Inscription gratuite · Matching sur 40+ critères · Résultats en 3 jours
          </p>
          <Link href="/auth/register" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', textDecoration: 'none', fontSize: '15px', fontWeight: 700, padding: '14px 32px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(16,185,129,0.35)' }}>
            Commencer gratuitement →
          </Link>
        </div>

        {/* ── Footer SEO ── */}
        <footer style={{ marginTop: '64px', paddingTop: '32px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '14px' }}>
            Colocation dans les grandes villes
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '28px' }}>
            {MAIN_CITIES.filter(slug => slug !== params.ville).map(slug => (
              <Link key={slug} href={`/colocation/${slug}`} className="other-city-link" style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', transition: 'color 0.15s' }}>
                Colocation {CITIES[slug]}
              </Link>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', fontSize: '12.5px' }}>
            {[
              { label: 'Accueil', href: '/' },
              { label: 'Blog', href: '/blog' },
              { label: 'CGU', href: '/cgu' },
              { label: 'Confidentialité', href: '/confidentialite' },
              { label: 'Contact', href: '/contact' },
            ].map(link => (
              <Link key={link.href} href={link.href} style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
                {link.label}
              </Link>
            ))}
          </div>
        </footer>
      </div>

      <style>{`
        .listing-card { transition: transform 0.15s, border-color 0.15s; }
        .listing-card:hover { transform: translateY(-3px); border-color: rgba(16,185,129,0.3) !important; }
        .other-city-link:hover { color: #10B981 !important; }
      `}</style>
    </div>
  )
}
