'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'

interface Listing {
  id: string
  title: string
  city: string
  neighborhood: string
  rent: number
  surface: number
  rooms_available: number
  photos: string[]
  is_active: boolean
  boost_type: string
  boost_level: string
  created_at: string
  description: string
}

export default function MesAnnoncesPage() {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMyListings() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
      setListings(data ?? [])
      setLoading(false)
    }
    fetchMyListings()
  }, [router])

  async function toggleActive(id: string, current: boolean) {
    const supabase = createClient()
    await supabase.from('listings').update({ is_active: !current }).eq('id', id)
    setListings(prev => prev.map(l => l.id === id ? { ...l, is_active: !current } : l))
  }

  async function deleteListing(id: string) {
    if (!confirm('Supprimer définitivement cette annonce ? Cette action est irréversible.')) return
    const supabase = createClient()
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id)
    if (error) {
      alert('Erreur lors de la suppression : ' + error.message)
      console.error(error)
      return
    }
    setListings(prev => prev.filter(l => l.id !== id))
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'transparent' }}>
      <Topbar title="Mes annonces" />
      <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '28px', color: '#fff', margin: 0 }}>
              Mes annonces
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
              {listings.length} annonce{listings.length > 1 ? 's' : ''} publiée{listings.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => router.push('/app/annonce')}
            style={{
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
            }}
          >
            + Nouvelle annonce
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9CA3AF' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            <div>Chargement...</div>
          </div>
        ) : listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '52px', marginBottom: '16px' }}>🏠</div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '22px', color: '#111827', marginBottom: '8px' }}>
              Aucune annonce pour l&apos;instant
            </div>
            <div style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '24px' }}>
              Publie ta première annonce pour trouver des colocataires
            </div>
            <button
              onClick={() => router.push('/app/annonce')}
              style={{
                background: 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Publier une annonce
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {listings.map(listing => (
              <div key={listing.id} style={{
                background: '#fff',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                display: 'flex',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = ''
                  ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'
                }}
              >
                {/* Photo */}
                <div style={{ width: '180px', minHeight: '140px', flexShrink: 0, position: 'relative', overflow: 'hidden', borderRadius: '0' }}>
                  {listing.photos?.[0] ? (
                    <img
                      src={listing.photos[0]}
                      alt={listing.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%', minHeight: '140px',
                      background: 'linear-gradient(135deg, #6EE7B7, #047857)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '36px'
                    }}>🏠</div>
                  )}
                </div>

                {/* Infos */}
                <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                          {listing.title || `Colocation à ${listing.city}`}
                        </div>
                        <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>
                          📍 {listing.city}{listing.neighborhood ? ` · ${listing.neighborhood}` : ''}
                        </div>
                      </div>
                      {/* Badge statut */}
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '20px',
                        background: listing.is_active ? '#ECFDF5' : '#F3F4F6',
                        color: listing.is_active ? '#059669' : '#9CA3AF',
                        flexShrink: 0,
                        marginLeft: '12px',
                      }}>
                        {listing.is_active ? '● En ligne' : '○ Désactivée'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#374151', marginTop: '8px' }}>
                      <span>💰 <strong>{listing.rent}€</strong>/mois</span>
                      {listing.surface > 0 && <span>📐 {listing.surface}m²</span>}
                      {listing.rooms_available > 0 && <span>🚪 {listing.rooms_available} chambre{listing.rooms_available > 1 ? 's' : ''}</span>}
                    </div>

                    {/* Badge boost */}
                    {(listing.boost_type === 'featured' || listing.boost_level === 'featured') && (
                      <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: '#FFF7ED', color: '#C2410C' }}>
                        🚀 Mis en avant
                      </span>
                    )}
                    {(listing.boost_type === 'priority' || listing.boost_level === 'priority') && (
                      <span style={{ display: 'inline-block', marginTop: '8px', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: '#EEF2FF', color: '#3730A3' }}>
                        ⭐ Prioritaire
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      onClick={() => toggleActive(listing.id, listing.is_active)}
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        background: '#fff',
                        color: '#374151',
                        cursor: 'pointer',
                      }}
                    >
                      {listing.is_active ? '⏸ Désactiver' : '▶ Réactiver'}
                    </button>
                    <button
                      onClick={() => router.push(`/app/annonce?edit=${listing.id}`)}
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        background: '#fff',
                        color: '#374151',
                        cursor: 'pointer',
                      }}
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => deleteListing(listing.id)}
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid #FECACA',
                        background: '#fff',
                        color: '#EF4444',
                        cursor: 'pointer',
                      }}
                    >
                      🗑 Supprimer
                    </button>
                  </div>
                </div>

                {/* Stats côté droit */}
                <div style={{
                  width: '120px',
                  flexShrink: 0,
                  borderLeft: '1px solid #F3F4F6',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  background: '#FAFAFA',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>0</div>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>vues</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#10B981' }}>0</div>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>contacts</div>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '10px', color: '#9CA3AF' }}>
                    {new Date(listing.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
