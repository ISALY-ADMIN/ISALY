import { createClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import { createAdminClient } from '@/lib/admin/serviceClient'
import { stripe } from '@/lib/stripe'
import { StatCard, QuickLink } from './HoverCards'

export const dynamic = 'force-dynamic'

async function getStripeRevenueThisMonth(): Promise<number | null> {
  try {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const intents = await stripe.paymentIntents.list({
      created: { gte: Math.floor(startOfMonth.getTime() / 1000) },
      limit: 100,
    })
    const cents = intents.data
      .filter(pi => pi.status === 'succeeded')
      .reduce((sum, pi) => sum + (pi.amount_received ?? pi.amount ?? 0), 0)
    return Math.round(cents / 100)
  } catch {
    return null
  }
}

async function getStats() {
  const admin = createAdminClient()

  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const weekAgo = new Date(now.getTime() - 7 * 86400_000)

  const [
    usersRes, activeUsersRes, newUsersTodayRes,
    listingsRes, listingsWeekRes,
    matchesRes, matchesTodayRes, matchesWeekRes,
    activeLeasesRes,
    dossiersRes, reportsRes, pendingDocsRes, reportedReviewsRes, maintenanceRes,
    stripeRevenue,
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('last_seen', weekAgo.toISOString()),
    admin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
    admin.from('listings').select('*', { count: 'exact', head: true }).eq('is_active', true),
    admin.from('listings').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
    admin.from('matches').select('*', { count: 'exact', head: true }),
    admin.from('matches').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
    admin.from('matches').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
    admin.from('leases').select('monthly_rent').eq('status', 'active'),
    admin
      .from('dossiers')
      .select('*', { count: 'exact', head: true })
      .not('identity_doc_url', 'is', null)
      .eq('identity_verified', false),
    admin.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    admin.from('user_documents').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('user_reviews').select('*', { count: 'exact', head: true }).eq('reported', true),
    admin.from('maintenance_requests').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
    getStripeRevenueThisMonth(),
  ])

  const activeLeases = (activeLeasesRes.data ?? []) as { monthly_rent: number | null }[]
  const totalRent = activeLeases.reduce((s, l) => s + (l.monthly_rent ?? 0), 0)

  return {
    users: usersRes.count ?? 0,
    activeUsers7d: activeUsersRes.count ?? 0,
    newUsersToday: newUsersTodayRes.count ?? 0,
    listings: listingsRes.count ?? 0,
    listingsWeek: listingsWeekRes.count ?? 0,
    matches: matchesRes.count ?? 0,
    matchesToday: matchesTodayRes.count ?? 0,
    matchesWeek: matchesWeekRes.count ?? 0,
    activeLeases: activeLeases.length,
    estimatedRevenue: Math.round(totalRent * 0.025),
    stripeRevenue,
    pendingVerifications: dossiersRes.count ?? 0,
    openReports: reportsRes.count ?? 0,
    pendingDocuments: pendingDocsRes.count ?? 0,
    reportedReviews: reportedReviewsRes.count ?? 0,
    pendingMaintenance: maintenanceRes.count ?? 0,
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

  const sections: { title: string; cards: Parameters<typeof StatCard>[0][] }[] = [
    {
      title: 'Utilisateurs',
      cards: [
        { label: 'Utilisateurs total',   value: stats.users,          href: '/admin/utilisateurs', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', icon: '👥' },
        { label: 'Actifs sur 7 jours',   value: stats.activeUsers7d,  href: '/admin/utilisateurs', color: '#4ECBA0', bg: 'rgba(78,203,160,0.1)', icon: '🟢' },
        { label: "Inscrits aujourd'hui", value: stats.newUsersToday,  href: '/admin/utilisateurs', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', icon: '✨' },
      ],
    },
    {
      title: 'Activité',
      cards: [
        { label: 'Annonces actives',       value: stats.listings,      href: '/admin/annonces', color: '#4ECBA0', bg: 'rgba(78,203,160,0.1)',  icon: '🏠', sub: `+${stats.listingsWeek} cette semaine` },
        { label: "Matchs aujourd'hui",     value: stats.matchesToday,  href: '/admin',          color: '#F472B6', bg: 'rgba(244,114,182,0.1)', icon: '❤️', sub: `${stats.matchesWeek} cette semaine` },
        { label: 'Matchs total',           value: stats.matches,       href: '/admin',          color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', icon: '💜' },
      ],
    },
    {
      title: 'Revenus',
      cards: [
        { label: 'Baux actifs',                 value: stats.activeLeases,     href: '/admin/paiements', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', icon: '📄' },
        { label: 'CA estimé / mois (2,5 %)',    value: stats.estimatedRevenue, href: '/admin/paiements', color: '#4ECBA0', bg: 'rgba(78,203,160,0.1)', icon: '💶', suffix: '€' },
        ...(stats.stripeRevenue !== null
          ? [{ label: 'Revenus Stripe ce mois', value: stats.stripeRevenue,    href: '/admin/paiements', color: '#818CF8', bg: 'rgba(129,140,248,0.1)', icon: '💳', suffix: '€' as const }]
          : []),
      ],
    },
    {
      title: 'Modération',
      cards: [
        { label: 'Documents en attente',     value: stats.pendingDocuments,     href: '/admin/documents',     color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: '📎', alert: stats.pendingDocuments > 0 },
        { label: 'Vérifications en attente', value: stats.pendingVerifications, href: '/admin/verifications', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: '📋', alert: stats.pendingVerifications > 0 },
        { label: 'Avis signalés',            value: stats.reportedReviews,      href: '/admin/reviews',       color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  icon: '⭐', alert: stats.reportedReviews > 0 },
        { label: 'Signalements ouverts',     value: stats.openReports,          href: '/admin/signalements',  color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  icon: '🚩', alert: stats.openReports > 0 },
        { label: 'Maintenance en attente',   value: stats.pendingMaintenance,   href: '/admin/signalements',  color: '#FB923C', bg: 'rgba(251,146,60,0.1)', icon: '🔧', alert: stats.pendingMaintenance > 0 },
      ],
    },
  ]

  const quickLinks = [
    { href: '/admin/utilisateurs',  label: 'Gérer les utilisateurs',  icon: '👥', desc: 'Voir, suspendre, modifier les comptes' },
    { href: '/admin/documents',     label: 'Valider les documents',   icon: '📎', desc: 'Vérifier les pièces envoyées par les users' },
    { href: '/admin/reviews',       label: 'Modérer les avis',        icon: '⭐', desc: 'Traiter les avis signalés' },
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

      {/* Stats — sections (client components, hover effects) */}
      {sections.map(section => (
        <div key={section.title} style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
            {section.title}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {section.cards.map(card => (
              <StatCard key={card.label} {...card} />
            ))}
          </div>
        </div>
      ))}
      <div style={{ marginBottom: '12px' }} />

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
