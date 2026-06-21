import { createClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import Image from 'next/image'
import VerifyActions from './VerifyActions'

async function getPendingDossiers() {
  const supabase = createClient()
  const { data } = await supabase
    .from('dossiers')
    .select(`
      id, user_id, identity_doc_url, identity_verified, income_monthly, completion_percent, updated_at,
      profiles:user_id (first_name, last_name, email, avatar_url)
    `)
    .not('identity_doc_url', 'is', null)
    .order('updated_at', { ascending: true })
  return data ?? []
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminVerifications() {
  await getAdminUser()
  const dossiers = await getPendingDossiers()

  const pending = dossiers.filter(d => !d.identity_verified)
  const verified = dossiers.filter(d => d.identity_verified)

  return (
    <div style={{ padding: '32px 40px', fontFamily: "'Outfit', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
          Vérifications d'identité
        </h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>
          {pending.length} en attente · {verified.length} vérifiée{verified.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
            En attente de vérification ({pending.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pending.map(d => {
              const profileRaw = d.profiles
              const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as { first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null } | null
              const fullName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || '—'
              const initials = ((profile?.first_name?.[0] ?? '') + (profile?.last_name?.[0] ?? '')).toUpperCase() || '?'

              return (
                <div
                  key={d.id}
                  style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '14px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}
                >
                  {/* Avatar */}
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                    {profile?.avatar_url
                      ? <Image src={profile.avatar_url} alt={initials} width={44} height={44} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : initials}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#E5E7EB', marginBottom: '2px' }}>{fullName}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>{profile?.email ?? '—'} · soumis le {formatDate(d.updated_at)}</div>
                  </div>

                  {/* Doc link */}
                  {d.identity_doc_url && (
                    <a
                      href={d.identity_doc_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '12px', fontWeight: 600, color: '#60A5FA', textDecoration: 'none', padding: '7px 14px', border: '1px solid rgba(96,165,250,0.3)', borderRadius: '8px', flexShrink: 0 }}
                    >
                      Voir le doc →
                    </a>
                  )}

                  {/* Actions */}
                  {d.user_id && <VerifyActions userId={d.user_id} alreadyVerified={false} />}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div style={{ background: 'rgba(78,203,160,0.05)', border: '1px solid rgba(78,203,160,0.15)', borderRadius: '14px', padding: '40px', textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
          <p style={{ color: '#4ECBA0', fontSize: '14px', fontWeight: 600, margin: 0 }}>Aucune vérification en attente</p>
        </div>
      )}

      {/* Already verified */}
      {verified.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
            Vérifiées ({verified.length})
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
            {verified.map((d, i) => {
              const profileRaw = d.profiles
              const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as { first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null } | null
              const fullName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || '—'

              return (
                <div
                  key={d.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 20px', borderBottom: i < verified.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(78,203,160,0.12)', color: '#4ECBA0' }}>✓ Vérifiée</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB' }}>{fullName}</span>
                    <span style={{ fontSize: '12px', color: '#6B7280', marginLeft: '8px' }}>{profile?.email ?? '—'}</span>
                  </div>
                  {d.user_id && <VerifyActions userId={d.user_id} alreadyVerified={true} />}
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}
