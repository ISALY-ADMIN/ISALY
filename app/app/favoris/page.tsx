'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/client'

export default function FavorisPage() {
  const router = useRouter()
  const [listings, setListings] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/favorites')
      const { favorites } = await res.json()
      if (!favorites?.length) { setLoading(false); return }
      const supabase = createClient()
      const listingIds = favorites.filter((f: any) => f.target_type === 'listing').map((f: any) => f.target_id)
      const profileIds = favorites.filter((f: any) => f.target_type === 'profile').map((f: any) => f.target_id)
      if (listingIds.length) {
        const { data } = await supabase.from('listings').select('*').in('id', listingIds)
        setListings(data ?? [])
      }
      if (profileIds.length) {
        const { data } = await supabase.from('profiles').select('id, first_name, last_name, city, budget_max, avatar_url').in('id', profileIds)
        setProfiles(data ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F0' }}>
      <Topbar title="Mes favoris" />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 700, color: '#111827', marginBottom: '24px' }}>Mes favoris</h1>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#9CA3AF' }}>Chargement...</div>
        ) : listings.length === 0 && profiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: '#fff', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔖</div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Aucun favori pour l&apos;instant</div>
            <div style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '24px' }}>Sauvegarde des profils et annonces pour les retrouver ici.</div>
            <button onClick={() => router.push('/app/swipe')} style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Aller swiper</button>
          </div>
        ) : (
          <>
            {listings.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#9CA3AF', marginBottom: '12px' }}>ANNONCES SAUVEGARDÉES</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {listings.map(l => (
                    <div key={l.id} style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '10px', background: l.photos?.[0] ? `url(${l.photos[0]}) center/cover` : 'linear-gradient(135deg, #6EE7B7, #047857)', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>{l.title || `Colocation à ${l.city}`}</div>
                        <div style={{ fontSize: '13px', color: '#6B7280' }}>📍 {l.city} · {l.rent}€/mois</div>
                      </div>
                      <button onClick={() => router.push(`/app/messages?owner=${l.owner_id}`)} style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                        Contacter
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {profiles.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#9CA3AF', marginBottom: '12px' }}>PROFILS SAUVEGARDÉS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {profiles.map(p => (
                    <div key={p.id} style={{ background: '#fff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>
                        {!p.avatar_url && `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>{p.first_name} {p.last_name?.[0]}.</div>
                        <div style={{ fontSize: '13px', color: '#6B7280' }}>📍 {p.city ?? 'Ville non renseignée'} · {p.budget_max ?? 0}€/mois</div>
                      </div>
                      <button onClick={() => router.push(`/app/messages?with=${p.first_name}`)} style={{ background: '#fff', color: '#10B981', border: '2px solid #10B981', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                        Écrire
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
