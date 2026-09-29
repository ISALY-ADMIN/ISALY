import { createClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import { createAdminClient } from '@/lib/admin/serviceClient'
import { stripe } from '@/lib/stripe'
import Link from 'next/link'
import { Icon, eur, plural, type IconName, type Tone } from '@/components/ui-v2'
// [HIDDEN] cartes de l'ancien tableau de bord : import { StatCard, QuickLink } from './HoverCards'

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
    commissionsRes,
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
    // Parts de commission encore actives (migration 39) — une ligne par locataire.
    admin.from('lease_commissions').select('share_rent, rate').eq('commission_active', true),
    getStripeRevenueThisMonth(),
  ])

  const activeLeases = (activeLeasesRes.data ?? []) as { monthly_rent: number | null }[]
  const totalRent = activeLeases.reduce((s, l) => s + (l.monthly_rent ?? 0), 0)

  // CA estimé : somme des parts de commission ENCORE actives, pour que l'arrêt
  // d'un colocataire (préavis ou fin de bail) se voie immédiatement ici.
  // Repli sur 2,5 % du loyer des baux actifs tant qu'aucune part n'est
  // enregistrée — la facturation n'a jamais tourné (BILLING_ENABLED = false),
  // la table peut donc être vide alors que des baux sont bien actifs.
  const commissions = (commissionsRes.data ?? []) as { share_rent: number | null; rate: number | null }[]
  const estimatedRevenue = commissions.length > 0
    ? Math.round(commissions.reduce((s, c) => s + (c.share_rent ?? 0) * (c.rate ?? 0.025), 0))
    : Math.round(totalRent * 0.025)

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
    estimatedRevenue,
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

/** Inscriptions par jour sur 30 jours (données réelles, profils créés). */
async function getSignups30d(): Promise<number[]> {
  const admin = createAdminClient()
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 29)
  const { data } = await admin.from('profiles').select('created_at').gte('created_at', start.toISOString()).limit(10000)
  const days = Array.from({ length: 30 }, () => 0)
  for (const p of (data ?? []) as { created_at: string }[]) {
    const i = Math.floor((new Date(p.created_at).getTime() - start.getTime()) / 86400_000)
    if (i >= 0 && i < 30) days[i]++
  }
  return days
}

/** Retours bêta non traités (statut « nouveau »). */
async function getNewBugs(): Promise<number> {
  const admin = createAdminClient()
  const { count } = await admin.from('bug_reports').select('*', { count: 'exact', head: true }).eq('status', 'nouveau')
  return count ?? 0
}

/** Courbe des inscriptions (spark de la maquette). */
function SignupChart({ days }: { days: number[] }) {
  const W = 600, H = 170
  const max = Math.max(1, ...days)
  const pts = days.map((v, i) => [10 + (i * (W - 20)) / 29, H - 14 - (v / max) * (H - 34)])
  const area = `M${pts[0][0]} ${H - 14} ` + pts.map(p => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ` L${pts[29][0]} ${H - 14}Z`
  const total = days.reduce((a, b) => a + b, 0)
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Inscriptions sur 30 jours : ${total} au total`}>
      <defs>
        <linearGradient id="spk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6C4DFF" stopOpacity=".3" />
          <stop offset="1" stopColor="#6C4DFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spk)" />
      <polyline points={pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')} fill="none" stroke="#6C4DFF" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

const nf = (n: number) => n.toLocaleString('fr-FR')

export default async function AdminDashboard() {
  await getAdminUser()
  const [stats, actions, signups, newBugs] = await Promise.all([getStats(), getRecentActions(), getSignups30d(), getNewBugs()])

  const kpis: [string, string, string][] = [
    ['Utilisateurs', nf(stats.users), `${nf(stats.activeUsers7d)} actifs sur 7 jours`],
    ['Annonces actives', nf(stats.listings), `+${nf(stats.listingsWeek)} cette semaine`],
    ['Matchs cette semaine', nf(stats.matchesWeek), `${nf(stats.matchesToday)} aujourd’hui`],
    stats.stripeRevenue !== null
      ? ['Revenus Stripe ce mois', eur(stats.stripeRevenue), `${nf(stats.activeLeases)} baux actifs`]
      : ['Baux actifs', nf(stats.activeLeases), 'en cours'],
  ]

  const todo: [IconName, Tone, number, string, string, string][] = [
    ['shield', 'ok', stats.pendingVerifications, plural(stats.pendingVerifications, 'vérification d’identité en attente', 'vérifications d’identité en attente'), 'Pièces d’identité envoyées', '/admin/verifications'],
    ['doc', 'info', stats.pendingDocuments, plural(stats.pendingDocuments, 'document en attente', 'documents en attente'), 'Pièces envoyées par les utilisateurs', '/admin/documents'],
    ['flag', 'bad', stats.openReports, plural(stats.openReports, 'signalement ouvert', 'signalements ouverts'), 'Signalements à traiter', '/admin/signalements'],
    ['chat', 'bad', stats.reportedReviews, plural(stats.reportedReviews, 'avis signalé', 'avis signalés'), 'Avis à modérer', '/admin/reviews'],
    ['wrench', 'warn', stats.pendingMaintenance, plural(stats.pendingMaintenance, 'demande de maintenance en attente', 'demandes de maintenance en attente'), 'Envoyées, sans réponse', '/admin/signalements'],
    ['bug', 'warn', newBugs, plural(newBugs, 'retour bêta non traité', 'retours bêta non traités'), 'Nouveaux tickets', '/admin/bug-reports'],
  ]
  const open = todo.filter(t => t[2] > 0)

  return (
    <>
      <section className="panel kpis">
        {kpis.map(([l, v, d]) => (
          <div className="kpi" key={l}>
            <div className="l">{l}</div>
            <div className="v num">{v}</div>
            <div className="d">{d}</div>
          </div>
        ))}
      </section>

      <div className="v-grid wide-l mt">
        <section className="panel">
          <div className="phead"><h2>Inscriptions</h2><span className="s">30 derniers jours</span></div>
          <SignupChart days={signups} />
        </section>
        <section className="panel">
          <div className="phead"><h2>À traiter</h2></div>
          {open.length === 0 ? (
            <p className="soft">Rien en attente pour le moment.</p>
          ) : (
            <div className="rows">
              {open.map(([ic, tone, n, t, s, href]) => (
                <div className="row" key={href + t}>
                  <span className={`ico ${tone}`}><Icon name={ic} size={18} /></span>
                  <span className="grow"><span className="t">{`${n} ${t}`}</span><span className="s">{s}</span></span>
                  <Link className="btn btn-glass btn-sm" href={href}>Voir</Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel mt">
        <div className="phead"><h2>Activité récente</h2></div>
        {actions.length === 0 ? (
          <p className="soft">Aucune action admin enregistrée</p>
        ) : (
          <div className="rows">
            {actions.map(action => {
              const adminProfile = Array.isArray(action.profiles) ? action.profiles[0] : action.profiles
              const adminName = adminProfile
                ? `${adminProfile.first_name ?? ''} ${adminProfile.last_name ?? ''}`.trim()
                : 'Admin'
              const label = ACTION_LABELS[action.action] ?? action.action
              return (
                <div className="row" key={action.id}>
                  <span className="ico"><Icon name="check" size={18} /></span>
                  <span className="grow">
                    <span className="t">{label}</span>
                    <span className="s">{[action.target_type, adminName].filter(Boolean).join(', ')}</span>
                  </span>
                  <span className="s">{formatDate(action.created_at)}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

/* [HIDDEN] Ancienne version (avant le site v2), conservée pour référence :
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
    commissionsRes,
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
    // Parts de commission encore actives (migration 39) — une ligne par locataire.
    admin.from('lease_commissions').select('share_rent, rate').eq('commission_active', true),
    getStripeRevenueThisMonth(),
  ])

  const activeLeases = (activeLeasesRes.data ?? []) as { monthly_rent: number | null }[]
  const totalRent = activeLeases.reduce((s, l) => s + (l.monthly_rent ?? 0), 0)

  // CA estimé : somme des parts de commission ENCORE actives, pour que l'arrêt
  // d'un colocataire (préavis ou fin de bail) se voie immédiatement ici.
  // Repli sur 2,5 % du loyer des baux actifs tant qu'aucune part n'est
  // enregistrée — la facturation n'a jamais tourné (BILLING_ENABLED = false),
  // la table peut donc être vide alors que des baux sont bien actifs.
  const commissions = (commissionsRes.data ?? []) as { share_rent: number | null; rate: number | null }[]
  const estimatedRevenue = commissions.length > 0
    ? Math.round(commissions.reduce((s, c) => s + (c.share_rent ?? 0) * (c.rate ?? 0.025), 0))
    : Math.round(totalRent * 0.025)

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
    estimatedRevenue,
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
        // [HIDDEN] commission de 2,5 % supprimée (dashboard v2) :
        // { label: 'CA estimé / mois (2,5 %)',    value: stats.estimatedRevenue, href: '/admin/paiements', color: '#4ECBA0', bg: 'rgba(78,203,160,0.1)', icon: '💶', suffix: '€' },
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

      {/* Header * /}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
          Tableau de bord
        </h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>
          Vue d&apos;ensemble de la plateforme ISALY
        </p>
      </div>

      {/* Stats — sections (client components, hover effects) * /}
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

      {/* Recent activity * /}
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

      {/* Quick links — client components (hover effects) * /}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '32px' }}>
        {quickLinks.map(link => (
          <QuickLink key={link.href} {...link} />
        ))}
      </div>

    </div>
  )
}
*/
