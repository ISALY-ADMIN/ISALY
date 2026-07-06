'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import Emoji from '@/components/ui/Emoji'

interface Listing {
  id: string
  title: string | null
  city: string | null
  rent: number | null
  photos: string[] | null
  surface: number | null
  rooms_available: number | null
}

export default function AnnoncesPreview() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    createClient()
      .from('listings')
      .select('id, title, city, rent, photos, surface, rooms_available')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => {
        setListings(data ?? [])
        setLoaded(true)
      })
  }, [])

  if (!loaded || listings.length === 0) return null

  return (
    <section style={{ padding: '80px 40px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 600, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
            Annonces récentes
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            Des logements vérifiés, des colocataires compatibles
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginBottom: '48px' }}>
          {listings.map(l => {
            const meta = [
              l.surface ? `${l.surface}m²` : null,
              l.rooms_available ? `${l.rooms_available} pièce${l.rooms_available > 1 ? 's' : ''}` : null,
            ].filter(Boolean).join(' · ')

            return (
              <Link key={l.id} href={`/annonce/${l.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                <div
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(78,203,160,0.15)'
                    e.currentTarget.style.borderColor = 'rgba(78,203,160,0.25)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = ''
                    e.currentTarget.style.boxShadow = ''
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                  }}
                >
                  <div style={{ position: 'relative', paddingBottom: '75%', background: 'linear-gradient(135deg, rgba(78,203,160,0.15), rgba(5,150,105,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {l.photos?.[0] ? (
                      <Image
                        src={l.photos[0]}
                        alt={l.title ?? 'Annonce'}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1100px) 50vw, 33vw"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}><Emoji native="🏠" /></span>
                    )}
                  </div>
                  <div style={{ padding: '16px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.title || `Colocation à ${l.city}`}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '12px' }}>
                      <Emoji native="📍" /> {l.city}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#4ECBA0' }}>
                        {l.rent}€<span style={{ fontSize: '12px', fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>/mois</span>
                      </div>
                      {meta && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{meta}</div>}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link
            href="/auth/register"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', textDecoration: 'none', fontSize: '15px', fontWeight: 600, padding: '13px 28px', borderRadius: '12px', boxShadow: '0 0 30px rgba(16,185,129,0.3)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(16,185,129,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 30px rgba(16,185,129,0.3)' }}
          >
            Voir toutes les annonces →
          </Link>
        </div>
      </div>
    </section>
  )
}
