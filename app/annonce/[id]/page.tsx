import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { cache } from 'react'
import { listingOccupancy, ownerDisplayName, formatAvailability } from '@/lib/utils'
import ShareButtons from './ShareButtons'
import Gallery from './Gallery'
import ListingMiniMap from '@/components/home/ListingMiniMap'
import { getCoordsForCity, jitterCoords } from '@/lib/geo'
import { slugifyCity } from '@/lib/cities'
import { Bubble, Icon, Pill, COL, eur, m2, plural, NNBSP, type IconName } from '@/components/ui-v2'
import { PublicLayout, PublicListingCard, type PublicCardListing } from '@/components/ui-v2/public'

interface Props {
  params: { id: string }
}

const getListing = cache(async (id: string) => {
  const supabase = createClient()
  const { data } = await supabase
    .from('listings')
    // `*` volontaire plutôt qu'une liste de colonnes : nommer available_from
    // ferait échouer la requête — et donc renvoyer un 404 sur toutes les
    // annonces — tant que la migration 41 n'est pas exécutée.
    .select(`
      *,
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
    title: `${title} — ${listing.rent}€/mois`,
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

/** Autres annonces actives de la même ville (bloc « Autres colocations à … »). */
async function getNearby(id: string, city: string | null): Promise<PublicCardListing[]> {
  if (!city) return []
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('listings')
      .select('id, title, city, neighborhood, rent, charges, surface, photos')
      .eq('is_active', true)
      .ilike('city', `%${city.split('-')[0]}%`)
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(3)
    return (data ?? []) as PublicCardListing[]
  } catch {
    return []
  }
}

export default async function AnnoncePubliquePage({ params }: Props) {
  const listing = await getListing(params.id)
  if (!listing) notFound()

  const supabase = createClient()
  const [{ data: { user } }, nearby] = await Promise.all([
    supabase.auth.getUser().catch(() => ({ data: { user: null } })),
    getNearby(listing.id, listing.city),
  ])

  const photos = (listing.photos as string[] | null) ?? []
  const ownerRaw = listing.profiles
  const owner = (Array.isArray(ownerRaw) ? ownerRaw[0] : ownerRaw) as { first_name: string | null; avatar_url: string | null } | null
  // Un prénom vide ou égal au nom de marque ne doit jamais s'afficher tel quel
  const ownerName = ownerDisplayName(owner?.first_name)
  const publicUrl = `https://isaly.fr/annonce/${listing.id}`
  // null si le loueur n'a pas renseigné de date : la puce n'est alors pas rendue.
  const availability = formatAvailability(listing.available_from)
  // Position BRUITÉE ici, côté serveur (jitterCoords, ~±500 m, déterministe par
  // annonce) : c'est la seule qui part au navigateur. Même règle que
  // /api/home-search et /app/annonce/[id] ; à défaut de coordonnées, le centre
  // de la ville, bruité lui aussi.
  const exactCoords = listing.latitude != null && listing.longitude != null
    ? [Number(listing.latitude), Number(listing.longitude)] as [number, number]
    : getCoordsForCity(listing.city ?? '')
  const approxCoords = exactCoords ? jitterCoords(exactCoords, listing.id) : null

  const title = listing.title || `Colocation à ${listing.city}`
  const place = [listing.neighborhood, listing.city].filter(Boolean).join(', ')
  const occupancy = listingOccupancy(listing)
  const rent = Number(listing.rent ?? 0)
  const charges = Number(listing.charges ?? 0)
  const citySlug = listing.city ? slugifyCity(listing.city) : null
  // Postuler : parcours d'inscription existant. Voir ma compatibilité : la fiche
  // de l'espace connecté, qui affiche les vrais scores une fois le test fait.
  const applyHref = '/auth/register?redirect=/app/recherche'
  const compatHref = user ? `/app/annonce/${listing.id}` : `/auth/register?redirect=/app/annonce/${listing.id}`
  // Les colocataires ne sont pas nommés publiquement : une pastille par
  // personne déjà en place, score verrouillé.
  const colocColors = [COL.azure, COL.sun, COL.mint, COL.coral, COL.violet]

  const amenities: [IconName, string][] = [
    ...(listing.surface ? [['house', `${m2(listing.surface)} au total`] as [IconName, string]] : []),
    ...(listing.rooms_available ? [['door', `${listing.rooms_available} ${plural(listing.rooms_available, 'chambre disponible', 'chambres disponibles')}`] as [IconName, string]] : []),
    ['users', `${occupancy.current} sur ${occupancy.total} places occupées`],
    ...(listing.meuble === true ? [['desk', 'Meublé'] as [IconName, string]] : []),
    ...(listing.animaux_ok === true ? [['heart', 'Animaux acceptés'] as [IconName, string]] : []),
    ...(listing.non_fumeur === true ? [['info', 'Logement non-fumeur'] as [IconName, string]] : []),
  ]

  return (
    <PublicLayout>
      <div className="wrap">
        <nav className="crumbs" aria-label="Fil d’Ariane">
          <Link href={citySlug ? `/colocation/${citySlug}` : '/'}>Colocation</Link>
          <Icon name="chevron" />
          {citySlug ? <Link href={`/colocation/${citySlug}`}>{listing.city}</Link> : <span>{listing.city}</span>}
          {listing.neighborhood && (
            <>
              <Icon name="chevron" />
              <span>{listing.neighborhood}</span>
            </>
          )}
        </nav>

        <Gallery id={listing.id} photos={photos} title={title} />

        <div className="lay">
          <div>
            <h1>{title}</h1>
            <div className="facts">
              {place && <Pill icon="pin">{place}</Pill>}
              {listing.meuble != null && <Pill>{listing.meuble ? 'Meublé' : 'Non meublé'}</Pill>}
              {availability && <Pill tone="info" icon="calendar">{availability}</Pill>}
              {listing.surface ? <Pill>{`${m2(listing.surface)} au total`}</Pill> : null}
              {listing.boost_type === 'featured' && <Pill tone="brand" icon="bolt">Annonce mise en avant</Pill>}
              {listing.boost_type === 'priority' && <Pill tone="brand" icon="bolt">Annonce prioritaire</Pill>}
            </div>

            {occupancy.current > 0 && (
              <section className="sec">
                <h2>Les colocataires</h2>
                <p className="soft" style={{ marginBottom: 14 }}>Fais le test de compatibilité pour découvrir ton score avec chacun d’eux.</p>
                <div className="locked">
                  {Array.from({ length: occupancy.current }, (_, i) => (
                    <span className="lockp" key={i}>
                      <Bubble name={String(i + 1)} color={colocColors[i % colocColors.length]} size={38} />
                      <span>
                        <span className="t">{`Colocataire ${i + 1}`}</span>
                        <span className="s">Compatibilité <b aria-hidden="true">{`00${NNBSP}%`}</b></span>
                      </span>
                      <Icon name="lock" size={16} />
                    </span>
                  ))}
                </div>
                <Link className="btn btn-main mt" href={compatHref}><Icon name="spark" size={18} />Voir ma compatibilité</Link>
              </section>
            )}

            <section className="sec">
              <h2>Le logement</h2>
              {listing.description && (
                <p className="prose" style={{ fontSize: 16, whiteSpace: 'pre-wrap' }}>{listing.description}</p>
              )}
              <div className="amen mt">
                {amenities.map(([ic, t]) => (
                  <div key={t}><Icon name={ic} />{t}</div>
                ))}
              </div>
            </section>

            {approxCoords && (
              <section className="sec">
                <h2>Le quartier</h2>
                <div className="minimap">
                  <ListingMiniMap coords={approxCoords} height={240} interactive />
                </div>
                <p className="s mt">L’adresse exacte est communiquée quand la coloc accepte ta demande.</p>
              </section>
            )}

            {owner && (
              <section className="sec">
                <h2>Le bailleur</h2>
                <div className="panel host">
                  <Bubble name={ownerName} color={COL.violet} size={56} avatar={owner.avatar_url} />
                  <div className="grow">
                    <span className="t" style={{ fontSize: 18 }}>{ownerName}</span>
                    <span className="s">Bailleur particulier sur ISALY</span>
                  </div>
                </div>
              </section>
            )}
          </div>

          <aside className="buy" aria-label="Loyer et candidature">
            <div className="p num">{eur(rent + charges)} <small>par mois</small></div>
            <div className="kv">
              <div><span>Loyer</span><b>{eur(rent)}</b></div>
              <div><span>Charges</span><b>{eur(charges)}</b></div>
              {availability && <div><span>Disponible</span><b>{availability.replace(/^Disponible (à partir du )?/, '')}</b></div>}
            </div>
            <Link className="btn btn-main btn-block" href={applyHref}>Postuler à cette annonce</Link>
            <p className="hint" style={{ textAlign: 'center' }}>Gratuit pour les locataires.</p>
            <div className="hr" style={{ margin: '2px 0' }} />
            <ShareButtons url={publicUrl} title={title} />
          </aside>
        </div>

        {nearby.length > 0 && (
          <section className="sec">
            <div className="hrow" style={{ marginBottom: 16 }}>
              <h2 className="h2" style={{ margin: 0 }}>{`Autres colocations à ${listing.city}`}</h2>
              {citySlug && <Link className="link" href={`/colocation/${citySlug}`}>Tout voir</Link>}
            </div>
            <div className="gridcards">
              {nearby.map(l => <PublicListingCard key={l.id} l={l} />)}
            </div>
          </section>
        )}
      </div>

      <div className="buybar">
        <span>
          <b className="num">{eur(rent + charges)}</b>
          <span className="s">par mois, charges comprises</span>
        </span>
        <Link className="btn btn-main" href={applyHref}>Postuler</Link>
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
            // Date de disponibilité : `availabilityStarts` n'existe pas sur
            // RealEstateListing (qui dérive de WebPage et ne porte que
            // datePosted / leaseLength). Schema.org la définit sur Offer, et
            // RealEstateListing est justement décrite comme « a listing that
            // describes one or more real-estate Offers » : elle doit donc être
            // portée par un nœud Offer imbriqué. businessFunction LeaseOut
            // précise qu'il s'agit d'une location, pas d'une vente.
            // Le nœud n'est émis que si la date existe — sinon aucun balisage.
            ...(listing.available_from
              ? {
                  offers: {
                    '@type': 'Offer',
                    businessFunction: 'https://purl.org/goodrelations/v1#LeaseOut',
                    availabilityStarts: listing.available_from,
                    ...(listing.rent ? { price: listing.rent, priceCurrency: 'EUR' } : {}),
                  },
                }
              : {}),
          }).replace(/</g, '\\u003c'), // « < » échappé : une description contenant </script> ne ferme pas la balise JSON-LD.
        }}
      />
    </PublicLayout>
  )
}

/* [HIDDEN] Ancienne version (avant le site v2), conservée pour référence :
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { cache } from 'react'
import { listingOccupancy, ownerDisplayName, formatAvailability } from '@/lib/utils'
import ShareButtons from './ShareButtons'
import Emoji from '@/components/ui/Emoji'
import ListingMiniMap from '@/components/home/ListingMiniMap'
import { getCoordsForCity, jitterCoords } from '@/lib/geo'

interface Props {
  params: { id: string }
}

const getListing = cache(async (id: string) => {
  const supabase = createClient()
  const { data } = await supabase
    .from('listings')
    // `*` volontaire plutôt qu'une liste de colonnes : nommer available_from
    // ferait échouer la requête — et donc renvoyer un 404 sur toutes les
    // annonces — tant que la migration 41 n'est pas exécutée.
    .select(`
      *,
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
    title: `${title} — ${listing.rent}€/mois`,
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
  // Un prénom vide ou égal au nom de marque ne doit jamais s'afficher tel quel
  const ownerName = ownerDisplayName(owner?.first_name)
  const publicUrl = `https://isaly.fr/annonce/${listing.id}`
  // null si le loueur n'a pas renseigné de date : la puce n'est alors pas rendue.
  const availability = formatAvailability(listing.available_from)
  // Position BRUITÉE ici, côté serveur (jitterCoords, ~±500 m, déterministe par
  // annonce) : c'est la seule qui part au navigateur. Même règle que
  // /api/home-search et /app/annonce/[id] ; à défaut de coordonnées, le centre
  // de la ville, bruité lui aussi.
  const exactCoords = listing.latitude != null && listing.longitude != null
    ? [Number(listing.latitude), Number(listing.longitude)] as [number, number]
    : getCoordsForCity(listing.city ?? '')
  const approxCoords = exactCoords ? jitterCoords(exactCoords, listing.id) : null

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0A', fontFamily: "'Outfit', sans-serif", color: '#fff' }}>

      {/* Navbar * /}
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

        {/* Photos * /}
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

          {/* Colonne gauche * /}
          <div>
            {/* Badge boost * /}
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

            {/* Stats * /}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
              {[
                { icon: '💰', label: `${listing.rent}€/mois` },
                ...(listing.charges ? [{ icon: '⚡', label: `${listing.charges}€ charges` }] : []),
                ...(listing.surface ? [{ icon: '📐', label: `${listing.surface}m²` }] : []),
                ...(listing.rooms_available ? [{ icon: '🚪', label: `${listing.rooms_available} chambre${listing.rooms_available > 1 ? 's' : ''} dispo` }] : []),
                { icon: '👥', label: `${listingOccupancy(listing).current}/${listingOccupancy(listing).total} places` },
                ...(availability ? [{ icon: '📅', label: availability }] : []),
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px 16px', fontSize: '14px', fontWeight: 600 }}>
                  <span><Emoji native={s.icon} /></span>
                  <span style={{ color: '#fff' }}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* Localisation — sous les caractéristiques, pleine largeur de la colonne * /}
            {approxCoords && (
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Localisation</h2>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: '0 0 12px' }}>
                  Zone approximative — l&apos;adresse exacte est partagée après validation de ton dossier.
                </p>
                <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <ListingMiniMap coords={approxCoords} height={260} interactive />
                </div>
              </div>
            )}

            {/* Description * /}
            {listing.description && (
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Description</h2>
                <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {listing.description}
                </p>
              </div>
            )}

            {/* Loueur * /}
            {owner && (
              <div style={{ padding: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                  {owner.avatar_url
                    ? <Image src={owner.avatar_url} alt={ownerName} width={48} height={48} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : ownerName[0].toUpperCase()
                  }
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>
                    Proposé par {ownerName}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    Membre ISALY · Profil certifié
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Colonne droite — sticky * /}
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

            {/* Share * /}
            <ShareButtons url={publicUrl} title={listing.title || `Colocation à ${listing.city}`} />
          </div>

        </div>
      </div>

      {/* JSON-LD * /}
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
            // Date de disponibilité : `availabilityStarts` n'existe pas sur
            // RealEstateListing (qui dérive de WebPage et ne porte que
            // datePosted / leaseLength). Schema.org la définit sur Offer, et
            // RealEstateListing est justement décrite comme « a listing that
            // describes one or more real-estate Offers » : elle doit donc être
            // portée par un nœud Offer imbriqué. businessFunction LeaseOut
            // précise qu'il s'agit d'une location, pas d'une vente.
            // Le nœud n'est émis que si la date existe — sinon aucun balisage.
            ...(listing.available_from
              ? {
                  offers: {
                    '@type': 'Offer',
                    businessFunction: 'https://purl.org/goodrelations/v1#LeaseOut',
                    availabilityStarts: listing.available_from,
                    ...(listing.rent ? { price: listing.rent, priceCurrency: 'EUR' } : {}),
                  },
                }
              : {}),
          }),
        }}
      />
    </div>
  )
}
*/
