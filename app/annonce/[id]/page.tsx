import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { cache } from 'react'
import { listingOccupancy } from '@/lib/utils'
import ShareButtons from './ShareButtons'
import Emoji from '@/components/ui/Emoji'

interface Props {
  params: { id: string }
}

const getListing = cache(async (id: string) => {
  const supabase = createClient()
  const { data } = await supabase
    .from('listings')
    .select(`
      id, title, description, city, neighborhood, rent, charges, surface,
      rooms_available, occupants_current, capacity_total, photos, boost_type, is_active, created_at,
      owner_id,
      profiles:owner_id (
        first_name, avatar_url
      )
    `)
    .eq('id', id)
    .eq('is_active', true)
    .single()
  return data
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getListing(params.id)
  if (!listing) return { title: 'Annonce introuvable | ISALY' }

  const title = listing.title || `Colocation à ${listing.city}`
  const desc = listing.description?.slice(0, 160) || `Chambre en colocation à ${listing.city} pour ${listing.rent}€/mois.`
  const image = (listing.photos as string[] | null)?.[0]

  return {
    title: `${title} — ${listing.rent}€/mois | ISALY`,
    description: desc,
    openGraph: {
      title: `${title} — ${listing.rent}€/mois | ISALY`,
      description: desc,
      url: `https://isaly.fr/annonce/${listing.id}`,
      siteName: 'ISALY',
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: title }] } : {}),
      locale: 'fr_FR',
      type: 'website',
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: `${title} — ${listing.rent}€/mois`,
      description: desc,
      ...(image ? { images: [image] } : {}),
    },
  }
}

export default async function AnnoncePubliquePage({ params }: Props) {
  const listing = await getListing(params.id)
  if (!listing) notFound()

  const photos = (listing.photos as string[] | null) ?? []
  const ownerRaw = listing.profiles
  const owner = (Array.isArray(ownerRaw) ? ownerRaw[0] : ownerRaw) as { first_name: string | null; avatar_url: string | null } | null
  const publicUrl = `https://isaly.fr/annonce/${listing.id}`

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', fontFamily: "'Outfit', sans-serif", color: '#fff' }}>

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 700, color: '#10B981', textDecoration: 'none', letterSpacing: '-0.5px' }}>
          ISALY
        </Link>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/auth/login" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
            Se connecter
          </Link>
          <Link href={`/auth/register?redirect=/app/recherche`} style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#fff', textDecoration: 'none', background: 'linear-gradient(135deg, #10B981, #059669)' }}>
            Postuler
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Photos */}
        {photos.length > 0 ? (
          <div style={{ borderRadius: '20px', overflow: 'hidden', marginBottom: '32px', height: '380px', position: 'relative', background: 'linear-gradient(135deg, #6EE7B7, #047857)' }}>
            <Image
              src={photos[0]}
              alt={listing.title ?? 'Photo annonce'}
              fill
              priority
              sizes="(max-width: 900px) 100vw, 900px"
              style={{ objectFit: 'cover' }}
            />
            {photos.length > 1 && (
              <div style={{ position: 'absolute', bottom: '16px', right: '16px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '20px' }}>
                +{photos.length - 1} photos
              </div>
            )}
          </div>
        ) : (
          <div style={{ borderRadius: '20px', height: '240px', background: 'linear-gradient(135deg, #6EE7B7, #047857)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px', marginBottom: '32px' }}>
            <Emoji native="🏠" />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '32px', alignItems: 'start' }}>

          {/* Colonne gauche */}
          <div>
            {/* Badge boost */}
            {listing.boost_type === 'featured' && (
              <div style={{ display: 'inline-block', marginBottom: '12px', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
                <Emoji native="🚀" /> Annonce mise en avant
              </div>
            )}
            {listing.boost_type === 'priority' && (
              <div style={{ display: 'inline-block', marginBottom: '12px', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }}>
                <Emoji native="⭐" /> Annonce prioritaire
              </div>
            )}

            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', margin: '0 0 8px', lineHeight: 1.2 }}>
              {listing.title || `Colocation à ${listing.city}`}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.5)', fontSize: '15px', marginBottom: '24px' }}>
              <span><Emoji native="📍" /></span>
              <span>{listing.city}{listing.neighborhood ? ` · ${listing.neighborhood}` : ''}</span>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
              {[
                { icon: '💰', label: `${listing.rent}€/mois` },
                ...(listing.charges ? [{ icon: '⚡', label: `${listing.charges}€ charges` }] : []),
                ...(listing.surface ? [{ icon: '📐', label: `${listing.surface}m²` }] : []),
                ...(listing.rooms_available ? [{ icon: '🚪', label: `${listing.rooms_available} chambre${listing.rooms_available > 1 ? 's' : ''} dispo` }] : []),
                { icon: '👥', label: `${listingOccupancy(listing).current}/${listingOccupancy(listing).total} places` },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 16px', fontSize: '14px', fontWeight: 600 }}>
                  <span><Emoji native={s.icon} /></span>
                  <span style={{ color: '#fff' }}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            {listing.description && (
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Description</h2>
                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {listing.description}
                </p>
              </div>
            )}

            {/* Loueur */}
            {owner?.first_name && (
              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                  {owner.avatar_url
                    ? <Image src={owner.avatar_url} alt={owner.first_name ?? ''} width={48} height={48} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : owner.first_name[0].toUpperCase()
                  }
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>
                    Proposé par {owner.first_name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    Membre ISALY · Profil certifié
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Colonne droite — sticky */}
          <div style={{ position: 'sticky', top: '80px' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', marginBottom: '16px' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#10B981', marginBottom: '4px' }}>
                {listing.rent}€
                <span style={{ fontSize: '16px', fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>/mois</span>
              </div>
              {listing.charges && (
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>
                  + {listing.charges}€ de charges
                </div>
              )}

              <Link
                href={`/auth/register?redirect=/app/recherche`}
                style={{
                  display: 'block', textAlign: 'center',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  color: '#fff', textDecoration: 'none',
                  fontSize: '15px', fontWeight: 700,
                  padding: '14px', borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
                  marginBottom: '12px',
                }}
              >
                Postuler à cette annonce →
              </Link>
              <p style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', margin: 0 }}>
                Inscription gratuite · Sans engagement
              </p>
            </div>

            {/* Share */}
            <ShareButtons url={publicUrl} title={listing.title || `Colocation à ${listing.city}`} />
          </div>

        </div>
      </div>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'RealEstateListing',
            name: listing.title || `Colocation à ${listing.city}`,
            description: listing.description ?? undefined,
            url: publicUrl,
            address: { '@type': 'PostalAddress', addressLocality: listing.city ?? undefined, addressCountry: 'FR' },
            ...(photos[0] ? { image: photos[0] } : {}),
          }),
        }}
      />
    </div>
  )
}
