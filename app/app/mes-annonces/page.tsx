'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'
import { listingOccupancy } from '@/lib/utils'
import BoostSelector, { type BoostOption } from '@/components/listings/BoostSelector'

interface Listing {
  id: string
  title: string
  city: string
  neighborhood: string
  rent: number
  surface: number
  rooms_available: number
  occupants_current: number | null
  capacity_total: number | null
  photos: string[]
  is_active: boolean
  boost_type: string
  boost_level: string
  boost_tier: string | null
  boost_expires_at: string | null
  boost_stripe_subscription_id: string | null
  created_at: string
  description: string
}

function MesAnnoncesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [boostExpanded, setBoostExpanded] = useState<Record<string, boolean>>({})
  const [boostPanels, setBoostPanels] = useState<Record<string, BoostOption>>({})
  const [loadingBoost, setLoadingBoost] = useState<Record<string, boolean>>({})

  const initMsg = searchParams.get('boost_success') === 'true'
    ? '🚀 Boost activé ! Votre annonce sera mise en avant sous peu.'
    : searchParams.get('updated') === '1'
    ? 'Annonce mise à jour avec succès !'
    : ''
  const [successMsg, setSuccessMsg] = useState(initMsg)

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
    const { error } = await supabase.from('listings').delete().eq('id', id)
    if (error) { alert('Erreur lors de la suppression : ' + error.message); return }
    setListings(prev => prev.filter(l => l.id !== id))
  }

  async function boostListing(listingId: string, tier: BoostOption) {
    if (tier === 'standard') return
    setLoadingBoost(prev => ({ ...prev, [listingId]: true }))
    try {
      const res = await fetch('/api/listings/boost-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, boost_tier: tier }),
      })
      const json = await res.json()
      if (res.ok && json.url) {
        window.location.href = json.url
      } else {
        alert(json.error ?? 'Erreur lors du boost. Veuillez réessayer.')
      }
    } catch {
      alert('Erreur réseau.')
    } finally {
      setLoadingBoost(prev => ({ ...prev, [listingId]: false }))
    }
  }

  async function openPortal() {
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ return_url: window.location.href }),
      })
      const json = await res.json()
      if (res.ok && json.url) window.location.href = json.url
      else alert(json.error ?? 'Portail de facturation indisponible.')
    } catch {
      alert('Erreur réseau.')
    }
  }

  function getBoostStatus(listing: Listing) {
    const tier = (listing.boost_tier || listing.boost_type || 'standard') as BoostOption
    const expiresAt = listing.boost_expires_at ? new Date(listing.boost_expires_at) : null
    const isActive = expiresAt ? expiresAt > new Date() : false
    return { tier, expiresAt, isActive }
  }

  const btnBase: React.CSSProperties = {
    fontSize: '12px', fontWeight: 500, padding: '6px 12px',
    borderRadius: '8px', border: '1px solid #E5E7EB',
    background: '#fff', color: '#374151', cursor: 'pointer',
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'transparent' }}>
      <Topbar title="Mes annonces" />

      {/* Toast succès */}
      {successMsg && (
        <div style={{
          position: 'fixed', top: '72px', left: '50%', transform: 'translateX(-50%)',
          background: '#0E2B1E', color: '#4ECBA0', border: '1px solid #1a4a33',
          borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 600,
          zIndex: 999, boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
        }}>
          {successMsg}
          <button
            onClick={() => setSuccessMsg('')}
            style={{ background: 'none', border: 'none', color: '#4ECBA0', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
          >×</button>
        </div>
      )}

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
              color: '#fff', border: 'none', borderRadius: '10px',
              padding: '10px 18px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
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
                color: '#fff', border: 'none', borderRadius: '10px',
                padding: '12px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Publier une annonce
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {listings.map(listing => {
              const { tier, expiresAt, isActive } = getBoostStatus(listing)
              const hasActivePaidBoost = tier !== 'standard' && isActive
              const hasExpiredBoost = tier !== 'standard' && !isActive
              const isExpanded = boostExpanded[listing.id] ?? false
              const selectedBoost = boostPanels[listing.id] ?? 'featured'
              const isBoosting = loadingBoost[listing.id] ?? false

              return (
                <div key={listing.id}>
                  {/* Listing card */}
                  <div style={{
                    background: '#fff', borderRadius: '16px', overflow: 'hidden',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex',
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
                    <div style={{ width: '180px', minHeight: '140px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
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
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px',
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
                          <span style={{
                            fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                            background: listing.is_active ? '#ECFDF5' : '#F3F4F6',
                            color: listing.is_active ? '#059669' : '#9CA3AF',
                            flexShrink: 0, marginLeft: '12px',
                          }}>
                            {listing.is_active ? '● En ligne' : '○ Désactivée'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#374151', marginTop: '8px' }}>
                          <span>💰 <strong>{listing.rent}€</strong>/mois</span>
                          {listing.surface > 0 && <span>📐 {listing.surface}m²</span>}
                          {listing.rooms_available > 0 && <span>🚪 {listing.rooms_available} chambre{listing.rooms_available > 1 ? 's' : ''}</span>}
                          <span>👥 {listingOccupancy(listing).current}/{listingOccupancy(listing).total} places</span>
                        </div>

                        {/* Badge boost actif */}
                        {hasActivePaidBoost && (
                          <span style={{
                            display: 'inline-block', marginTop: '8px', fontSize: '11px', fontWeight: 600,
                            padding: '2px 8px', borderRadius: '20px',
                            background: tier === 'featured' ? '#ECFDF5' : '#FFFBEB',
                            color: tier === 'featured' ? '#059669' : '#D97706',
                          }}>
                            {tier === 'featured' ? '🚀 Mis en avant' : '⭐ Prioritaire'}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button onClick={() => toggleActive(listing.id, listing.is_active)} style={btnBase}>
                          {listing.is_active ? '⏸ Désactiver' : '▶ Réactiver'}
                        </button>
                        <button onClick={() => router.push(`/app/annonce?edit=${listing.id}`)} style={btnBase}>
                          ✏️ Modifier
                        </button>
                        <button
                          onClick={() => deleteListing(listing.id)}
                          style={{ ...btnBase, border: '1px solid #FECACA', color: '#EF4444' }}
                        >
                          🗑 Supprimer
                        </button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{
                      width: '120px', flexShrink: 0, borderLeft: '1px solid #F3F4F6',
                      padding: '16px', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: '12px', background: '#FAFAFA',
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

                  {/* ── Bloc boost sous la card ─────────────────────────── */}
                  {hasActivePaidBoost ? (
                    // Boost actif
                    <div style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px', padding: '12px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{tier === 'featured' ? '🚀' : '⭐'}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: tier === 'featured' ? '#4ECBA0' : '#F59E0B' }}>
                          {tier === 'featured' ? 'Mis en avant' : 'Prioritaire'} jusqu&apos;au{' '}
                          {expiresAt?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <button
                        onClick={openPortal}
                        style={{
                          fontSize: '12px', fontWeight: 600, padding: '6px 14px',
                          borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)',
                          background: 'rgba(255,255,255,0.06)', color: '#E5E7EB',
                          cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                        }}
                      >
                        Gérer l&apos;abonnement →
                      </button>
                    </div>
                  ) : hasExpiredBoost ? (
                    // Boost expiré
                    <div style={{
                      background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: '12px', padding: '12px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                    }}>
                      <span style={{ fontSize: '13px', color: '#EF4444', fontWeight: 500 }}>
                        ⚠️ Boost expiré le {expiresAt?.toLocaleDateString('fr-FR')}
                      </span>
                      <button
                        onClick={() => setBoostExpanded(prev => ({ ...prev, [listing.id]: true }))}
                        style={{
                          fontSize: '12px', fontWeight: 600, padding: '6px 14px',
                          borderRadius: '8px', border: 'none',
                          background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)', color: '#0A0A0A',
                          cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                        }}
                      >
                        Renouveler →
                      </button>
                    </div>
                  ) : !isExpanded ? (
                    // Standard — bouton discret pour booster
                    <button
                      onClick={() => setBoostExpanded(prev => ({ ...prev, [listing.id]: true }))}
                      style={{
                        width: '100%', padding: '10px 16px', borderRadius: '12px',
                        border: '1px dashed rgba(78,203,160,0.3)',
                        background: 'rgba(78,203,160,0.04)', color: 'rgba(78,203,160,0.8)',
                        fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                        transition: 'all 0.2s', textAlign: 'center',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(78,203,160,0.6)'
                        e.currentTarget.style.background = 'rgba(78,203,160,0.08)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(78,203,160,0.3)'
                        e.currentTarget.style.background = 'rgba(78,203,160,0.04)'
                      }}
                    >
                      ✨ Booster cette annonce pour plus de visibilité
                    </button>
                  ) : (
                    // Panel de sélection boost
                    <div style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '16px', padding: '20px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#E5E7EB' }}>
                          🚀 Choisissez votre boost
                        </div>
                        <button
                          onClick={() => setBoostExpanded(prev => ({ ...prev, [listing.id]: false }))}
                          style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
                        >
                          ×
                        </button>
                      </div>

                      <BoostSelector
                        selected={selectedBoost}
                        onSelect={opt => setBoostPanels(prev => ({ ...prev, [listing.id]: opt }))}
                        disabled={isBoosting}
                      />

                      {selectedBoost !== 'standard' && (
                        <button
                          onClick={() => boostListing(listing.id, selectedBoost)}
                          disabled={isBoosting}
                          style={{
                            width: '100%', marginTop: '16px', padding: '12px',
                            borderRadius: '10px', border: 'none',
                            background: selectedBoost === 'featured'
                              ? 'linear-gradient(135deg, #4ECBA0, #2AA87C)'
                              : 'linear-gradient(135deg, #F59E0B, #D97706)',
                            color: '#0A0A0A', fontSize: '14px', fontWeight: 700,
                            cursor: isBoosting ? 'not-allowed' : 'pointer',
                            opacity: isBoosting ? 0.7 : 1,
                          }}
                        >
                          {isBoosting ? 'Redirection…' : `Booster pour ${selectedBoost === 'featured' ? '9,99€' : '24,99€'}/mois →`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MesAnnoncesPage() {
  return (
    <Suspense fallback={null}>
      <MesAnnoncesContent />
    </Suspense>
  )
}
