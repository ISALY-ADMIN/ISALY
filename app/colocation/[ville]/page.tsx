import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

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

export function generateStaticParams() {
  return Object.keys(CITIES).map(ville => ({ ville }))
}

interface Props {
  params: { ville: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cityName = CITIES[params.ville] ?? params.ville
  return {
    title: `Colocation à ${cityName} : annonces et colocataires compatibles | ISALY`,
    description: `Trouvez votre colocation idéale à ${cityName} grâce au matching intelligent d'ISALY. Annonces de colocation vérifiées et colocataires compatibles à ${cityName}.`,
    openGraph: {
      title: `Colocation à ${cityName} | ISALY`,
      description: `Matching intelligent pour trouver la coloc parfaite à ${cityName}.`,
      url: `https://isaly.fr/colocation/${params.ville}`,
      siteName: 'ISALY',
    },
  }
}

export default async function ColocationVillePage({ params }: Props) {
  const cityName = CITIES[params.ville]
  if (!cityName) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: "'Outfit', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏙️</div>
          <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>Ville non trouvée</h1>
          <Link href="/" style={{ color: '#10B981', textDecoration: 'none' }}>Retour à l'accueil</Link>
        </div>
      </div>
    )
  }

  const supabase = createClient()
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, city, neighborhood, rent, surface, rooms_available, photos, description')
    .eq('is_active', true)
    .ilike('city', `%${cityName.split('-')[0]}%`)
    .order('created_at', { ascending: false })
    .limit(30)

  const results = listings ?? []

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', fontFamily: "'Outfit', sans-serif", color: '#fff' }}>

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: '18px', fontWeight: 700, color: '#10B981', textDecoration: 'none', letterSpacing: '-0.5px' }}>
          ISALY
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

        {/* SEO header */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '3px', color: '#10B981', marginBottom: '16px' }}>
            COLOCATION · {cityName.toUpperCase()}
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 400, color: '#fff', margin: '0 0 16px', lineHeight: 1.1, letterSpacing: '-1px' }}>
            Colocation à {cityName}
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: '680px', margin: 0 }}>
            Trouvez votre colocation idéale à {cityName} avec ISALY, la plateforme de matching intelligent.
            Notre algorithme analyse la compatibilité de mode de vie, de personnalité et de budget pour vous mettre
            en relation avec des colocataires vraiment compatibles à {cityName}.
            {results.length > 0 && ` ${results.length} annonce${results.length > 1 ? 's' : ''} disponible${results.length > 1 ? 's' : ''} en ce moment.`}
          </p>
        </div>

        {/* Listings */}
        {results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <h2 style={{ fontSize: '22px', color: '#fff', marginBottom: '12px' }}>Pas encore d'annonces à {cityName}</h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', marginBottom: '28px' }}>
              Sois le premier à publier ou crée ton profil pour être alerté dès qu'une annonce apparaît.
            </p>
            <Link href="/auth/register" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 600, padding: '13px 28px', borderRadius: '12px' }}>
              Créer mon profil — gratuit →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '48px' }}>
            {results.map(l => (
              <Link key={l.id} href={`/annonce/${l.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', overflow: 'hidden', transition: 'transform 0.15s, border-color 0.15s', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(16,185,129,0.3)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
                >
                  <div style={{ height: '160px', background: 'linear-gradient(135deg, #6EE7B7, #047857)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                    {(l.photos as string[] | null)?.[0] ? (
                      <Image src={(l.photos as string[])[0]} alt={l.title ?? ''} fill sizes="280px" style={{ objectFit: 'cover' }} />
                    ) : '🏠'}
                  </div>
                  <div style={{ padding: '16px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.title || `Colocation à ${l.city}`}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '10px' }}>
                      📍 {l.city}{l.neighborhood ? ` · ${l.neighborhood}` : ''}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#10B981' }}>{l.rent}€<span style={{ fontSize: '11px', fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>/mois</span></div>
                      {l.surface && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{l.surface}m²</div>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '20px' }}>
          <h2 style={{ fontSize: '24px', color: '#fff', marginBottom: '12px' }}>
            Trouvez votre colocataire idéal à {cityName}
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px', maxWidth: '480px', margin: '0 auto 24px' }}>
            Inscription gratuite · Matching sur 40+ critères · Résultats en 3 jours
          </p>
          <Link href="/auth/register" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', textDecoration: 'none', fontSize: '15px', fontWeight: 700, padding: '14px 32px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(16,185,129,0.35)' }}>
            Commencer gratuitement →
          </Link>
        </div>

        {/* Maillage interne villes */}
        <div style={{ marginTop: '64px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
            Colocation dans d'autres villes
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.entries(CITIES)
              .filter(([slug]) => slug !== params.ville)
              .slice(0, 12)
              .map(([slug, name]) => (
                <Link key={slug} href={`/colocation/${slug}`} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#10B981')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                >
                  {name}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
