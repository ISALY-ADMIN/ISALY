import { createClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import { notFound } from 'next/navigation'
import SuspendButton from './SuspendButton'

interface Props { params: { id: string } }

async function getUserDetail(id: string) {
  const supabase = createClient()

  const [profileRes, dossierRes, listingsRes, matchesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, created_at, is_admin, suspended, avatar_url, bio, city, onboarding_completed')
      .eq('id', id)
      .single(),
    supabase.from('dossiers').select('identity_verified, identity_doc_url, income_monthly, completion_percent').eq('user_id', id).maybeSingle(),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('owner_id', id),
    supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .or(`user1_id.eq.${id},user2_id.eq.${id}`),
  ])

  return {
    profile: profileRes.data,
    dossier: dossierRes.data,
    listingsCount: listingsRes.count ?? 0,
    matchesCount: matchesRes.count ?? 0,
  }
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function AdminUserDetail({ params }: Props) {
  await getAdminUser()
  const { profile, dossier, listingsCount, matchesCount } = await getUserDetail(params.id)
  if (!profile) notFound()

  const initials = ((profile.first_name?.[0] ?? '') + (profile.last_name?.[0] ?? '')).toUpperCase() || '?'
  const fullName = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || '—'

  return (
    <div style={{ padding: '32px 40px', fontFamily: "'Outfit', sans-serif", maxWidth: '800px' }}>

      {/* Back */}
      <a href="/admin/utilisateurs" style={{ fontSize: '13px', color: '#6B7280', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}>
        ← Retour aux utilisateurs
      </a>

      {/* Profile header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '32px' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #4ECBA0, #2AA87C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={initials} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', margin: 0 }}>{fullName}</h1>
            {profile.is_admin && (
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>ADMIN</span>
            )}
            {profile.suspended && (
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>SUSPENDU</span>
            )}
          </div>
          <div style={{ fontSize: '13px', color: '#6B7280' }}>{profile.email ?? '—'}</div>
          <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '4px' }}>
            Inscrit le {formatDate(profile.created_at)} · {profile.role ?? 'rôle non défini'}
            {profile.city ? ` · ${profile.city}` : ''}
          </div>
        </div>

        {/* Suspend button — client component */}
        {!profile.is_admin && (
          <SuspendButton userId={profile.id} suspended={profile.suspended ?? false} />
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
        {[
          { label: 'Annonces', value: listingsCount, color: '#4ECBA0' },
          { label: 'Matchs', value: matchesCount, color: '#A78BFA' },
          { label: 'Dossier', value: dossier?.completion_percent ? `${dossier.completion_percent}%` : '—', color: '#60A5FA' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '18px 20px' }}>
            <div style={{ fontSize: '26px', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Dossier section */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '22px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 16px' }}>Dossier locataire</h2>
        {dossier ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
            {[
              { label: 'Pièce d\'identité', value: dossier.identity_doc_url ? 'Uploadée' : 'Manquante', ok: !!dossier.identity_doc_url },
              { label: 'Identité vérifiée', value: dossier.identity_verified ? 'Oui' : 'Non', ok: dossier.identity_verified },
              { label: 'Revenus mensuels', value: dossier.income_monthly ? `${dossier.income_monthly.toLocaleString('fr-FR')} €` : '—', ok: !!dossier.income_monthly },
              { label: 'Complétude', value: `${dossier.completion_percent}%`, ok: (dossier.completion_percent ?? 0) >= 80 },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                <span style={{ color: '#9CA3AF' }}>{row.label}</span>
                <span style={{ fontWeight: 600, color: row.ok ? '#4ECBA0' : '#EF4444' }}>{row.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#4B5563', fontSize: '13px', margin: 0 }}>Aucun dossier créé</p>
        )}
      </div>

      {/* Bio */}
      {profile.bio && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '22px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 10px' }}>Bio</h2>
          <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.7, margin: 0 }}>{profile.bio}</p>
        </div>
      )}

    </div>
  )
}
