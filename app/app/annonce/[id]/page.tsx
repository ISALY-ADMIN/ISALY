'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { motion } from 'framer-motion'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import { profilesCompatibility, type ProfileCompatibility } from '@/lib/matching'
import { listingOccupancy } from '@/lib/utils'
import { getCoordsForCity, jitterCoords } from '@/lib/geo'

const SearchMap = dynamic(() => import('@/components/map/SearchMap'), { ssr: false })

interface ListingRow {
  id: string
  owner_id: string | null
  title: string | null
  description: string | null
  city: string | null
  neighborhood: string | null
  rent: number | null
  charges: number | null
  surface: number | null
  rooms_available: number | null
  occupants_current?: number | null
  capacity_total?: number | null
  meuble?: boolean | null
  animaux_ok?: boolean | null
  non_fumeur?: boolean | null
  latitude?: number | null
  longitude?: number | null
  photos: string[] | null
  boost_tier?: string | null
  boost_type?: string | null
  is_active: boolean
}

interface OwnerInfo {
  firstName: string
  avatarUrl: string | null
  verified: boolean
  rating: number | null
  reviewCount: number
}

const SUB_SCORES: { key: 'modeDeVie' | 'budget' | 'personnalite' | 'interets'; label: string; color: string }[] = [
  { key: 'modeDeVie', label: 'Mode de vie', color: '#10B981' },
  { key: 'budget', label: 'Budget', color: '#6366F1' },
  { key: 'personnalite', label: 'Personnalité', color: '#F59E0B' },
  { key: 'interets', label: 'Intérêts', color: '#EC4899' },
]

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
  padding: '22px',
}

export default function AnnonceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [listing, setListing] = useState<ListingRow | null>(null)
  const [owner, setOwner] = useState<OwnerInfo | null>(null)
  const [compat, setCompat] = useState<ProfileCompatibility | null>(null)
  const [similar, setSimilar] = useState<ListingRow[]>([])
  const [isFav, setIsFav] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    async function load() {
      const supabase = createClient()
      const { data: l } = await supabase.from('listings').select('*').eq('id', id).single()
      if (!l || !l.is_active) { setNotFound(true); return }
      setListing(l as ListingRow)

      const { data: { user } } = await supabase.auth.getUser()

      const [ownerRes, certRes, reviewsRes, meRes, favRes, similarRes] = await Promise.all([
        l.owner_id
          ? supabase.from('profiles').select('first_name, avatar_url, budget_max, matching_data').eq('id', l.owner_id).single()
          : Promise.resolve({ data: null }),
        l.owner_id
          ? supabase.from('user_certifications').select('level').eq('user_id', l.owner_id).eq('status', 'verified')
          : Promise.resolve({ data: [] }),
        l.owner_id
          ? supabase.from('user_reviews').select('rating').eq('reviewed_id', l.owner_id)
          : Promise.resolve({ data: [] }),
        user
          ? supabase.from('profiles').select('budget_max, matching_data').eq('id', user.id).single()
          : Promise.resolve({ data: null }),
        user
          ? supabase.from('favorites').select('id').eq('user_id', user.id).eq('target_id', l.id).limit(1)
          : Promise.resolve({ data: [] }),
        supabase.from('listings').select('*')
          .eq('is_active', true).eq('city', l.city).neq('id', l.id)
          .gte('rent', Math.round((l.rent ?? 0) * 0.75)).lte('rent', Math.round((l.rent ?? 0) * 1.25))
          .limit(4),
      ])

      const o = ownerRes.data
      if (o) {
        const ratings = (reviewsRes.data ?? []).map(r => r.rating as number)
        setOwner({
          firstName: (o.first_name as string) ?? 'Loueur',
          avatarUrl: (o.avatar_url as string) ?? null,
          verified: (certRes.data ?? []).some(c => (c.level as number) >= 2),
          rating: ratings.length > 0 ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
          reviewCount: ratings.length,
        })
        if (meRes.data) setCompat(profilesCompatibility(meRes.data, o))
      }
      setIsFav((favRes.data ?? []).length > 0)
      setSimilar((similarRes.data ?? []) as ListingRow[])
    }
    load()
  }, [id])

  async function toggleFav() {
    setIsFav(v => !v)
    try {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_id: id, target_type: 'listing' }),
      })
    } catch {}
  }

  if (notFound) {
    return (
      <div className="min-h-screen" style={{ background: 'transparent' }}>
        <Topbar title="Annonce" />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div style={{ fontSize: '44px', marginBottom: '12px' }}>🏚</div>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '19px', fontWeight: 700, color: '#fff', marginBottom: '18px' }}>
            Cette annonce n&apos;existe plus
          </h2>
          <button onClick={() => router.push('/app/recherche')}
            className="px-6 py-2.5 rounded-full text-[13px] font-bold text-white border-none cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
            Retour à la recherche
          </button>
        </div>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen" style={{ background: 'transparent' }}>
        <Topbar title="Annonce" />
        <div className="max-w-[980px] mx-auto px-5 py-8">
          <div className="detail-shimmer rounded-[20px]" style={{ aspectRatio: '16/9', background: 'rgba(255,255,255,0.05)' }} />
          <div className="detail-shimmer rounded-md mt-6" style={{ height: 22, width: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div className="detail-shimmer rounded-md mt-3" style={{ height: 14, width: '30%', background: 'rgba(255,255,255,0.05)' }} />
        </div>
        <style>{`.detail-shimmer { animation: ds 1.4s ease-in-out infinite; } @keyframes ds { 0%,100% { opacity:.5 } 50% { opacity:1 } }`}</style>
      </div>
    )
  }

  const photos = listing.photos ?? []
  const occ = listingOccupancy(listing)
  const remaining = occ.total - occ.current
  const title = listing.title || `Colocation à ${listing.city}`
  const boostTier = listing.boost_tier ?? listing.boost_type ?? 'standard'
  const exactCoords = listing.latitude != null && listing.longitude != null
    ? [Number(listing.latitude), Number(listing.longitude)] as [number, number]
    : getCoordsForCity(listing.city ?? '')
  const approxCoords = exactCoords ? jitterCoords(exactCoords, listing.id) : null

  const amenities = [
    listing.meuble === true ? '🛋 Meublé' : listing.meuble === false ? 'Non meublé' : null,
    listing.animaux_ok === true ? '🐾 Animaux OK' : null,
    listing.non_fumeur === true ? '🚭 Non-fumeur' : null,
  ].filter(Boolean) as string[]

  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>
      <Topbar title="Annonce" />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-[980px] mx-auto px-5 py-7 pb-20"
      >
        {/* ── Galerie ── */}
        <div style={{ position: 'relative', borderRadius: '22px', overflow: 'hidden', aspectRatio: '16/9', background: 'linear-gradient(135deg, #0f2e24, #04160f)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {photos[photoIdx] ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={photos[photoIdx]} alt={title}
              onError={e => { e.currentTarget.style.display = 'none' }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '56px' }}>🏠</div>
          )}
          {boostTier !== 'standard' && (
            <span style={{
              position: 'absolute', top: 14, right: 14, fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em',
              padding: '5px 12px', borderRadius: '14px', color: '#fff',
              background: boostTier === 'priority' ? 'rgba(245,158,11,0.92)' : 'rgba(99,102,241,0.92)',
            }}>
              {boostTier === 'priority' ? '⚡ PRIORITAIRE' : '✨ ESSENTIEL'}
            </span>
          )}
          {photos.length > 1 && (
            <>
              <button aria-label="Photo précédente"
                onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(10,10,10,0.65)', color: '#fff', fontSize: '16px', backdropFilter: 'blur(4px)' }}>‹</button>
              <button aria-label="Photo suivante"
                onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(10,10,10,0.65)', color: '#fff', fontSize: '16px', backdropFilter: 'blur(4px)' }}>›</button>
            </>
          )}
        </div>
        {photos.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {photos.map((p, i) => (
              <button key={i} onClick={() => setPhotoIdx(i)} aria-label={`Photo ${i + 1}`}
                style={{
                  width: 76, height: 56, borderRadius: '10px', overflow: 'hidden', flexShrink: 0, padding: 0, cursor: 'pointer',
                  border: i === photoIdx ? '2px solid #10B981' : '2px solid transparent', opacity: i === photoIdx ? 1 : 0.55,
                }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
        )}

        {/* ── Titre + prix + actions ── */}
        <div className="flex flex-wrap items-start justify-between gap-4 mt-6 mb-2">
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '26px', fontWeight: 800, color: '#fff', margin: 0 }}>{title}</h1>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
              📍 {listing.city}{listing.neighborhood ? ` · ${listing.neighborhood}` : ''}
            </div>
          </div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 800, color: '#10B981', whiteSpace: 'nowrap' }}>
            {listing.rent}€<span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>/mois</span>
          </div>
        </div>

        {/* Stats chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            listing.surface ? `📐 ${listing.surface} m²` : null,
            listing.rooms_available ? `🚪 ${listing.rooms_available} chambre${listing.rooms_available > 1 ? 's' : ''} dispo` : null,
            `👥 ${occ.current}/${occ.total} places${remaining <= 0 ? ' · Complet' : ''}`,
            listing.charges ? `⚡ ${listing.charges}€ charges` : null,
            ...amenities,
          ].filter(Boolean).map(s => (
            <span key={s as string} style={{
              fontSize: '12.5px', fontWeight: 600, padding: '7px 13px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)',
            }}>{s}</span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => listing.owner_id && router.push(`/app/messages?owner=${listing.owner_id}`)}
            className="flex-1 sm:flex-none sm:px-10 py-3 rounded-full text-[14px] font-extrabold text-white border-none cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 6px 20px rgba(16,185,129,0.35)', fontFamily: "'Outfit', sans-serif" }}
          >
            💬 Contacter le loueur
          </button>
          <button
            onClick={toggleFav}
            aria-label={isFav ? 'Retirer des favoris' : 'Sauvegarder'}
            className="px-6 py-3 rounded-full text-[13.5px] font-bold cursor-pointer transition-all"
            style={isFav
              ? { background: 'rgba(16,185,129,0.12)', border: '1.5px solid #10B981', color: '#10B981' }
              : { background: 'transparent', border: '1.5px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.7)' }}
          >
            {isFav ? '💚 Sauvegardé' : '🤍 Sauvegarder'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Compatibilité */}
          <div style={card}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
              🎯 Compatibilité avec le loueur
            </div>
            {compat ? (
              <>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '34px', fontWeight: 800, color: '#10B981', marginBottom: '14px' }}>
                  {compat.score}%
                </div>
                <div className="flex flex-col gap-3">
                  {SUB_SCORES.map(({ key, label, color }) => {
                    const v = compat.breakdown[key]
                    return (
                      <div key={key}>
                        <div className="flex justify-between mb-1">
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>{label}</span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color }}>{v === null ? '—' : `${v}%`}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${v ?? 0}%`, borderRadius: 3, background: color, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                Le score s&apos;affichera quand toi et le loueur aurez complété le test de compatibilité.
                <button onClick={() => router.push('/app/quiz')}
                  className="block mt-3 text-[13px] font-bold cursor-pointer border-none bg-transparent p-0"
                  style={{ color: '#10B981' }}>
                  Faire mon test →
                </button>
              </div>
            )}
          </div>

          {/* Loueur */}
          <div style={card}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
              🏠 Le loueur
            </div>
            {owner ? (
              <div className="flex items-center gap-4">
                <div style={{
                  width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', fontWeight: 800, color: '#fff',
                }}>
                  {owner.avatarUrl
                    ? <Image src={owner.avatarUrl} alt={owner.firstName} width={60} height={60} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (owner.firstName[0] ?? '?').toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '17px', fontWeight: 700, color: '#fff' }}>{owner.firstName}</span>
                    {owner.verified && (
                      <span title="Identité vérifiée" style={{
                        fontSize: '10.5px', fontWeight: 800, padding: '3px 9px', borderRadius: '12px',
                        background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)',
                      }}>✓ Vérifié</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
                    {owner.rating !== null
                      ? <>⭐ <strong style={{ color: '#fff' }}>{owner.rating}</strong> · {owner.reviewCount} avis</>
                      : 'Pas encore d’avis'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>Profil du loueur indisponible.</div>
            )}
          </div>
        </div>

        {/* Description */}
        {listing.description && (
          <div style={{ ...card, marginBottom: '20px' }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Description</div>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>
              {listing.description}
            </p>
          </div>
        )}

        {/* Localisation approximative */}
        {approxCoords && (
          <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ padding: '18px 22px 12px' }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '15px', fontWeight: 700, color: '#fff' }}>📍 Localisation</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Zone approximative — l&apos;adresse exacte est partagée après le match.</div>
            </div>
            <div style={{ height: '280px' }}>
              <SearchMap
                items={[{ id: listing.id, title, rent: listing.rent ?? 0, photo: photos[0] ?? null, coords: approxCoords }]}
                hoveredId={null}
                onMarkerClick={() => {}}
              />
            </div>
          </div>
        )}

        {/* Annonces similaires */}
        {similar.length > 0 && (
          <div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '17px', fontWeight: 700, color: '#fff', margin: '28px 0 14px' }}>
              Annonces similaires à {listing.city}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {similar.map(s => {
                const so = listingOccupancy(s)
                return (
                  <div key={s.id}
                    onClick={() => { router.push(`/app/annonce/${s.id}`); setPhotoIdx(0) }}
                    role="link" tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && router.push(`/app/annonce/${s.id}`)}
                    className="rounded-[16px] overflow-hidden cursor-pointer transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'none' }}
                  >
                    <div style={{ aspectRatio: '4/3', position: 'relative', background: 'linear-gradient(135deg, #0f2e24, #04160f)' }}>
                      {s.photos?.[0] ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={s.photos[0]} alt={s.title ?? ''} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>🏠</div>
                      )}
                    </div>
                    <div className="p-3">
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.title || `Colocation à ${s.city}`}
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#10B981' }}>{s.rent}€</span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>👥 {so.current}/{so.total}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
