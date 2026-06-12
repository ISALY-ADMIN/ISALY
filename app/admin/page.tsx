import { createClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import { StatCard, QuickLink } from './HoverCards'

async function getStats() {
  const supabase = createClient()

  const [usersRes, listingsRes, matchesRes, dossiersRes, reportsRes] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('matches').select('*', { count: 'exact', head: true }),
    supabase
      .from('dossiers')
      .select('*', { count: 'exact', head: true })
      .not('identity_doc_url', 'is', null)
      .eq('identity_verified', false),
    supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')
      .then(r => r),
  ])

  return {
    users: usersRes.count ?? 0,
    listings: listingsRes.count ?? 0,
    matches: matchesRes.count ?? 0,
    pendingVerifications: dossiersRes.count ?? 0,
    openReports: reportsRes.count ?? 0,
  }
}

async function getRecentActions() {
  const supabase = createClient()
  const { data } = await supabase
    .from('admin_actions')
    .select('id, action, target_type, target_id, created_at, admin_id, profiles:admin_id(first_name, last_name)')
    .order('created_at', { ascending: false })
    .limit(8)
  return data ?? []
}

const ACTION_LABELS: Record<string, string> = {
  suspend_user:   'Compte suspendu',
  unsuspend_user: 'Compte réactivé',
  verify_identity: 'Identité vérifiée',
  reject_identity: 'Identité rejetée',
  disable_listing: 'Annonce désactivée',
  enable_listing:  'Annonce réactivée',
  resolve_report:  'Signalement résolu',
  dismiss_report:  'Signalement ignoré',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default async function AdminDashboard() {
  await getAdminUser()
  const [stats, actions] = await Promise.all([getStats(), getRecentActions()])

  const cards = [
    { label: 'Utilisateurs',            value: stats.users,               href: '/admin/utilisateurs', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  icon: '👥' },
    { label: 'Annonces actives',         value: stats.listings,            href: '/admin/annonces',     color: '#4ECBA0', bg: 'rgba(78,203,160,0.1)',  icon: '🏠' },
    { label: 'Matchs total',             value: stats.matches,             href: '/admin',              color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', icon: '❤️' },
    { label: 'Vérifications en attente', value: stats.pendingVerifications, href: '/admin/verifications', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: '📋', alert: stats.pendingVerifications > 0 },
    { label: 'Signalements ouverts',     value: stats.openReports,         href: '/admin/signalements', color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   icon: '🚩', alert: stats.openReports > 0 },
  ]

  const quickLinks = [
    { href: '/admin/utilisateurs',  label: 'Gérer les utilisateurs',  icon: '👥', desc: 'Voir, suspendre, modifier les comptes' },
    { href: '/admin/verifications', label: 'Vérifier les dossiers',   icon: '✅', desc: "Valider les pièces d'identité" },
    { href: '/admin/annonces',      label: 'Modérer les annonces',    icon: '🏠', desc: 'Désactiver les annonces problématiques' },
    { href: '/admin/signalements',  label: 'Traiter les signalements', icon: '🚩', desc: 'Répondre aux signalements ouverts' },
  ]

  return (
    <div style={{ padding: '32px 40px', fontFamily: "'Outfit', sans-serif" }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
          Tableau de bord
        </h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>
          Vue d&apos;ensemble de la plateforme ISALY
        </p>
      </div>

      {/* Stats grid — client components (hover effects) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
        {cards.map(card => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Recent activity */}
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '16px' }}>
          Activité récente
        </h2>

        {actions.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '40px', textAlign: 'center', color: '#4B5563' }}>
            Aucune action admin enregistrée
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', overflow: 'hidden' }}>
            {actions.map((action, i) => {
              const adminProfile = Array.isArray(action.profiles) ? action.profiles[0] : action.profiles
              const adminName = adminProfile
                ? `${adminProfile.first_name ?? ''} ${adminProfile.last_name ?? ''}`.trim()
                : 'Admin'
              const label = ACTION_LABELS[action.action] ?? action.action
              return (
                <div
                  key={action.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '14px 20px',
                    borderBottom: i < actions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ECBA0', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB' }}>{label}</span>
                    {action.target_type && (
                      <span style={{ fontSize: '12px', color: '#6B7280', marginLeft: '8px' }}>
                        · {action.target_type}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#4B5563' }}>{adminName}</div>
                  <div style={{ fontSize: '12px', color: '#4B5563', flexShrink: 0 }}>
                    {formatDate(action.created_at)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick links — client components (hover effects) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '32px' }}>
        {quickLinks.map(link => (
          <QuickLink key={link.href} {...link} />
        ))}
      </div>

    </div>
  )
}
