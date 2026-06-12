import { createClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import Link from 'next/link'

async function getUsers() {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role, created_at, is_admin, suspended, avatar_url, onboarding_completed')
    .order('created_at', { ascending: false })
  return data ?? []
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminUtilisateurs() {
  await getAdminUser()
  const users = await getUsers()

  return (
    <div style={{ padding: '32px 40px', fontFamily: "'Outfit', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
            Utilisateurs
          </h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>
            {users.length} compte{users.length !== 1 ? 's' : ''} enregistré{users.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
        {/* Head */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 120px', gap: '0', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px' }}>
          {['Utilisateur', 'Rôle', 'Inscrit le', 'Statut', 'Action'].map(h => (
            <div key={h} style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</div>
          ))}
        </div>

        {users.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#4B5563' }}>Aucun utilisateur</div>
        ) : (
          users.map((user, i) => (
            <div
              key={user.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.2fr 1fr 1fr 120px',
                gap: '0',
                padding: '14px 20px',
                borderBottom: i < users.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                alignItems: 'center',
              }}
            >
              {/* User */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                  {user.avatar_url
                    ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : ((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')).toUpperCase() || '?'}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB' }}>
                    {user.first_name || user.last_name
                      ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()
                      : '—'}
                    {user.is_admin && (
                      <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                        ADMIN
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280' }}>{user.email ?? '—'}</div>
                </div>
              </div>

              {/* Role */}
              <div style={{ fontSize: '12px', color: '#9CA3AF', textTransform: 'capitalize' }}>
                {user.role ?? '—'}
              </div>

              {/* Date */}
              <div style={{ fontSize: '12px', color: '#6B7280' }}>
                {formatDate(user.created_at)}
              </div>

              {/* Status */}
              <div>
                {user.suspended ? (
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                    Suspendu
                  </span>
                ) : user.onboarding_completed ? (
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(78,203,160,0.12)', color: '#4ECBA0' }}>
                    Actif
                  </span>
                ) : (
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
                    Incomplet
                  </span>
                )}
              </div>

              {/* Action */}
              <Link
                href={`/admin/utilisateurs/${user.id}`}
                style={{ fontSize: '12px', fontWeight: 600, color: '#4ECBA0', textDecoration: 'none', padding: '6px 12px', border: '1px solid rgba(78,203,160,0.3)', borderRadius: '8px', display: 'inline-block', textAlign: 'center' }}
              >
                Voir →
              </Link>
            </div>
          ))
        )}
      </div>

    </div>
  )
}
