'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { MapPin, MessageCircle, Home, Star, ChevronRight, Users } from 'lucide-react'
import Topbar from '@/components/layout/Topbar'
import CertificationBadge, { CertLevel } from '@/components/ui/CertificationBadge'
import { createClient } from '@/lib/supabase/client'

interface PublicProfile {
  id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  city: string | null
  bio: string | null
  cert_level: number | null
  role: string | null
}

interface Listing { id: string; title: string | null; city: string | null; rent: number | null; photos: string[] | null }
interface Review { id: string; rating: number; comment: string | null; created_at: string; reviewer?: { first_name?: string } }

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 20,
}

function Card({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className="p-5 mb-4"
      style={CARD}
    >
      {children}
    </motion.div>
  )
}

export default function ProfilPublicPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const userId = params.id

  const [loaded, setLoaded] = useState(false)
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [inColoc, setInColoc] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [hasConversation, setHasConversation] = useState(false)
  const [isMe, setIsMe] = useState(false)

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id === userId) setIsMe(true)

      const [{ data: p }, { data: ls }, leaseRes, reviewsRes, convRes] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name, avatar_url, city, bio, cert_level, role').eq('id', userId).single(),
        supabase.from('listings').select('id, title, city, rent, photos').eq('owner_id', userId).eq('is_active', true).limit(6),
        // Booléen via SECURITY DEFINER — les RLS leases restent owner/tenant-only
        supabase.rpc('has_active_lease', { uid: userId }).then(r => r, () => ({ data: null, error: true })),
        fetch(`/api/reviews?user_id=${userId}`).then(r => r.json()).catch(() => null),
        user
          ? supabase.from('conversations').select('id')
              .or(`and(user1_id.eq.${user.id},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${user.id})`)
              .limit(1)
          : Promise.resolve({ data: null }),
      ])

      if (p) setProfile(p as PublicProfile)
      setListings((ls ?? []) as Listing[])
      setInColoc(leaseRes?.data === true)
      if (reviewsRes) {
        setReviews((reviewsRes.reviews ?? []) as Review[])
        setAvgRating(typeof reviewsRes.average === 'number' ? reviewsRes.average : null)
      }
      setHasConversation(!!(convRes?.data && convRes.data.length > 0))
      setLoaded(true)
    }
    load()
  }, [userId])

  if (!loaded) {
    return (
      <>
        <Topbar title="Profil" />
        <div className="flex-1 overflow-y-auto p-6 md:p-8 w-full" style={{ maxWidth: 640 }}>
          {[120, 90, 140].map((h, i) => (
            <div key={i} className="rounded-[20px] mb-4 animate-pulse" style={{ background: 'rgba(255,255,255,0.05)', height: h }} />
          ))}
        </div>
      </>
    )
  }

  if (!profile) {
    return (
      <>
        <Topbar title="Profil" />
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <div className="text-[44px]">🫥</div>
          <p className="text-[14px]" style={{ color: 'rgba(255,255,255,0.45)' }}>Ce profil n&apos;existe pas ou n&apos;est plus disponible.</p>
        </div>
      </>
    )
  }

  const firstName = profile.first_name ?? 'Utilisateur'
  const displayName = `${firstName} ${profile.last_name ? profile.last_name[0] + '.' : ''}`.trim()
  const initials = `${(profile.first_name?.[0] ?? 'U')}${(profile.last_name?.[0] ?? '')}`.toUpperCase()
  const certLevel = (profile.cert_level ?? 0) as CertLevel

  return (
    <>
      <Topbar title={displayName} />
      <div className="flex-1 overflow-y-auto p-6 md:p-8 w-full" style={{ maxWidth: 640 }}>

        {/* ── Header profil ── */}
        <Card>
          <div className="flex items-center gap-5">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={initials} width={84} height={84} className="w-[84px] h-[84px] rounded-full object-cover flex-shrink-0" style={{ border: '2px solid rgba(16,185,129,0.5)' }} />
            ) : (
              <div className="w-[84px] h-[84px] rounded-full flex items-center justify-center text-[26px] font-extrabold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] leading-tight mb-1 truncate" style={{ fontFamily: "'DM Serif Display', serif", color: '#fff' }}>{displayName}</h1>
              {profile.city && (
                <div className="flex items-center gap-1.5 text-[13px] mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  <MapPin size={13} /> {profile.city}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {certLevel > 0 && <CertificationBadge level={certLevel} size="md" />}
                {inColoc && (
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', border: '1px solid rgba(16,185,129,0.35)' }}>
                    <Users size={12} /> Actuellement en colocation
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isMe && (
            <button
              onClick={() => router.push(hasConversation ? '/app/messages' : `/app/messages?owner=${profile.id}`)}
              className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-full text-[14px] font-bold text-white border-none cursor-pointer transition-transform active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
            >
              <MessageCircle size={17} /> {hasConversation ? 'Voir la conversation' : 'Envoyer un message'}
            </button>
          )}
        </Card>

        {/* ── Bio ── */}
        {profile.bio && (
          <Card delay={0.05}>
            <h2 className="text-[13px] font-bold mb-2 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>À propos</h2>
            <p className="text-[13.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)', whiteSpace: 'pre-wrap' }}>{profile.bio}</p>
          </Card>
        )}

        {/* ── Annonces actives ── */}
        {listings.length > 0 && (
          <Card delay={0.1}>
            <h2 className="flex items-center gap-2 text-[13px] font-bold mb-3 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <Home size={14} /> Ses annonces
            </h2>
            <div className="flex flex-col gap-2">
              {listings.map(l => (
                <button
                  key={l.id}
                  onClick={() => router.push(`/app/annonce/${l.id}`)}
                  className="flex items-center gap-3 p-2.5 rounded-[14px] text-left cursor-pointer border-none transition-colors w-full"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                >
                  <div className="w-12 h-12 rounded-[10px] flex-shrink-0" style={{ background: l.photos?.[0] ? `url(${l.photos[0]}) center/cover` : 'rgba(255,255,255,0.08)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold truncate" style={{ color: '#fff' }}>{l.title ?? 'Logement'}</div>
                    <div className="text-[11.5px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {l.city ? `${l.city} · ` : ''}{l.rent ? `${l.rent} €/mois` : ''}
                    </div>
                  </div>
                  <ChevronRight size={16} color="rgba(255,255,255,0.3)" className="flex-shrink-0" />
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* ── Avis reçus ── */}
        <Card delay={0.15}>
          <h2 className="flex items-center gap-2 text-[13px] font-bold mb-3 uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Star size={14} /> Avis reçus
          </h2>
          {reviews.length === 0 ? (
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Aucun avis pour le moment.</p>
          ) : (
            <>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} size={16} fill={avgRating !== null && i <= Math.round(avgRating) ? '#F59E0B' : 'none'} color={avgRating !== null && i <= Math.round(avgRating) ? '#F59E0B' : 'rgba(255,255,255,0.2)'} />
                  ))}
                </div>
                {avgRating !== null && <span className="text-[15px] font-extrabold" style={{ color: '#fff' }}>{avgRating.toFixed(1)}</span>}
                <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>· {reviews.length} avis</span>
              </div>
              <div className="flex flex-col gap-3">
                {reviews.slice(0, 5).map(r => (
                  <div key={r.id} className="p-3 rounded-[14px]" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12.5px] font-bold" style={{ color: '#fff' }}>{r.reviewer?.first_name ?? 'Colocataire'}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} size={11} fill={i <= r.rating ? '#F59E0B' : 'none'} color={i <= r.rating ? '#F59E0B' : 'rgba(255,255,255,0.15)'} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-[12.5px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{r.comment}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  )
}
