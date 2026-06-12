import { createClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import ToggleListingButton from './ToggleListingButton'

async function getListings() {
  const supabase = createClient()
  const { data } = await supabase
    .from('listings')
    .select(`
      id, title, city, rent, is_active, boost_type, created_at,
      profiles:owner_id (first_name, last_name, email)
    `)
    .order('created_at', { ascending: false })
  return data ?? []
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminAnnonces() {
  await getAdminUser()
  const listings = await getListings()

  const active = listings.filter(l => l.is_active)
  const inactive = listings.filter(l => !l.is_active)

  return (
    <div style={{ padding: '32px 40px', fontFamily: "'Outfit', sans-serif" }}>

      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
          Annonces
        </h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>
          {active.length} active{active.length !== 1 ? 's' : ''} · {inactive.length} désactivée{inactive.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
        {/* Head */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 130px', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px' }}>
          {['Annonce', 'Ville', 'Loyer', 'Propriétaire', 'Statut', 'Action'].map(h => (
            <div key={h} style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</div>
          ))}
        </div>

        {listings.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#4B5563' }}>Aucune annonce</div>
        ) : (
          listings.map((listing, i) => {
            const profileRaw = listing.profiles
            const owner = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as { first_name: string | null; last_name: string | null; email: string | null } | null
            const ownerName = `${owner?.first_name ?? ''} ${owner?.last_name ?? ''}`.trim() || owner?.email || '—'

            return (
              <div
                key={listing.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 130px',
                  padding: '13px 20px',
                  borderBottom: i < listings.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  alignItems: 'center',
                }}
              >
                {/* Title */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB', marginBottom: '2px' }}>
                    {listing.title || `Colocation à ${listing.city}`}
                    {listing.boost_type !== 'standard' && (
                      <span style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                        {listing.boost_type}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#4B5563' }}>{formatDate(listing.created_at)}</div>
                </div>

                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{listing.city ?? '—'}</div>
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{listing.rent ? `${listing.rent}€/mois` : '—'}</div>
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{ownerName}</div>

                {/* Status */}
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', ...(listing.is_active ? { background: 'rgba(78,203,160,0.12)', color: '#4ECBA0' } : { background: 'rgba(239,68,68,0.12)', color: '#EF4444' }) }}>
                    {listing.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <ToggleListingButton listingId={listing.id} isActive={listing.is_active} />
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}
