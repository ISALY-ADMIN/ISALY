import { getAdminUser } from '@/lib/admin/getAdminUser'
import { createAdminClient } from '@/lib/admin/serviceClient'
import ConversionFunnel, { type FunnelStep } from '@/components/analytics/ConversionFunnel'

export const dynamic = 'force-dynamic'

/**
 * Mission 18 — analytics plateforme (données réelles Supabase, pas GA4).
 * Funnel de conversion, inscriptions 30 jours, top villes, ratio des rôles.
 */

const CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '14px',
  padding: '24px',
}

function distinctCount(rows: Array<Record<string, string | null>> | null, ...keys: string[]): number {
  const set = new Set<string>()
  for (const row of rows ?? []) {
    for (const key of keys) {
      const v = row[key]
      if (v) set.add(v)
    }
  }
  return set.size
}

async function getAnalytics() {
  const admin = createAdminClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000)

  const [
    usersRes, quizRes,
    swipersRes, matchesRes, messagesRes, signedLeasesRes,
    signupsRes, citiesRes, locatairesRes, loueursRes,
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).not('matching_data->completed_at', 'is', null),
    admin.from('swipes').select('swiper_id').limit(20000),
    admin.from('matches').select('user1_id, user2_id').limit(20000),
    admin.from('messages').select('sender_id').limit(20000),
    admin.from('leases').select('tenant_id').eq('status', 'active').limit(5000),
    admin.from('profiles').select('created_at').gte('created_at', thirtyDaysAgo.toISOString()).limit(20000),
    admin.from('listings').select('city').eq('is_active', true).not('city', 'is', null).limit(10000),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'locataire'),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'loueur'),
  ])

  // Funnel : chaque étape = nb d'utilisateurs distincts ayant franchi le cap
  const funnel: FunnelStep[] = [
    { label: 'Inscrits', count: usersRes.count ?? 0 },
    { label: 'Quiz complété', count: quizRes.count ?? 0 },
    { label: 'Premier swipe', count: distinctCount(swipersRes.data, 'swiper_id') },
    { label: 'Premier match', count: distinctCount(matchesRes.data, 'user1_id', 'user2_id') },
    { label: 'Premier message', count: distinctCount(messagesRes.data, 'sender_id') },
    { label: 'Bail signé', count: distinctCount(signedLeasesRes.data, 'tenant_id') },
  ]

  // Inscriptions par jour sur 30 jours
  const perDay = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000)
    perDay.set(d.toISOString().slice(0, 10), 0)
  }
  for (const row of signupsRes.data ?? []) {
    const day = (row.created_at as string).slice(0, 10)
    if (perDay.has(day)) perDay.set(day, (perDay.get(day) ?? 0) + 1)
  }
  const signups = Array.from(perDay.entries()).map(([day, count]) => ({ day, count }))

  // Top 10 villes par annonces actives
  const cityCount = new Map<string, number>()
  for (const row of citiesRes.data ?? []) {
    const c = (row.city as string).trim()
    if (c) cityCount.set(c, (cityCount.get(c) ?? 0) + 1)
  }
  const topCities = Array.from(cityCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  return {
    funnel,
    signups,
    topCities,
    locataires: locatairesRes.count ?? 0,
    loueurs: loueursRes.count ?? 0,
  }
}

/** Graphe d'inscriptions 30 jours — SVG pur, barres mint. */
function SignupsChart({ signups }: { signups: { day: string; count: number }[] }) {
  const W = 900
  const H = 180
  const PAD = 24
  const max = Math.max(...signups.map(s => s.count), 1)
  const barW = (W - PAD * 2) / signups.length

  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Inscriptions sur 30 jours">
      {/* lignes de repère */}
      {[0.5, 1].map(f => (
        <line key={f} x1={PAD} x2={W - PAD} y1={H - H * f * 0.85} y2={H - H * f * 0.85} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      ))}
      <text x={PAD - 4} y={H - H * 0.85 + 4} textAnchor="end" fontSize={10} fill="#6B7280" fontFamily="Outfit, sans-serif">{max}</text>
      {signups.map((s, i) => {
        const h = Math.max(s.count > 0 ? 3 : 1, (s.count / max) * H * 0.85)
        const isMonday = new Date(s.day).getDay() === 1
        return (
          <g key={s.day}>
            <rect
              x={PAD + i * barW + barW * 0.15}
              y={H - h}
              width={barW * 0.7}
              height={h}
              rx={2}
              fill={s.count > 0 ? '#10B981' : 'rgba(255,255,255,0.08)'}
            >
              <title>{`${new Date(s.day).toLocaleDateString('fr-FR')} : ${s.count} inscription${s.count > 1 ? 's' : ''}`}</title>
            </rect>
            {isMonday && (
              <text x={PAD + i * barW + barW / 2} y={H + 16} textAnchor="middle" fontSize={9.5} fill="#6B7280" fontFamily="Outfit, sans-serif">
                {new Date(s.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default async function AdminAnalyticsPage() {
  await getAdminUser()
  const { funnel, signups, topCities, locataires, loueurs } = await getAnalytics()

  const totalRoles = locataires + loueurs
  const locatairesPct = totalRoles > 0 ? Math.round((locataires / totalRoles) * 100) : 0
  const maxCity = Math.max(...topCities.map(([, n]) => n), 1)
  const signups30d = signups.reduce((s, d) => s + d.count, 0)

  const sectionTitle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase',
    letterSpacing: '1.5px', marginBottom: '12px', fontFamily: "'Outfit', sans-serif",
  }

  return (
    <div style={{ padding: '32px 40px', fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>Analytics</h1>
        <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>
          Données réelles de la plateforme (Supabase) — le trafic landing reste visible dans GA4
        </p>
      </div>

      {/* Funnel de conversion */}
      <div style={{ marginBottom: '28px' }}>
        <div style={sectionTitle}>Funnel de conversion</div>
        <div style={CARD}>
          <ConversionFunnel steps={funnel} />
        </div>
      </div>

      {/* Inscriptions 30 jours */}
      <div style={{ marginBottom: '28px' }}>
        <div style={sectionTitle}>Inscriptions — 30 derniers jours ({signups30d})</div>
        <div style={CARD}>
          <SignupsChart signups={signups} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        {/* Top villes */}
        <div>
          <div style={sectionTitle}>Top 10 villes (annonces actives)</div>
          <div style={CARD}>
            {topCities.length === 0 ? (
              <p style={{ color: '#4B5563', fontSize: '13px', margin: 0 }}>Aucune annonce active</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {topCities.map(([city, count], i) => (
                  <div key={city}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ fontSize: '12.5px', color: '#E5E7EB', fontWeight: 600 }}>
                        <span style={{ color: '#6B7280', marginRight: '8px' }}>{i + 1}.</span>{city}
                      </span>
                      <span style={{ fontSize: '12.5px', color: '#10B981', fontWeight: 700 }}>{count}</span>
                    </div>
                    <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round((count / maxCity) * 100)}%`, background: '#10B981', borderRadius: '3px', opacity: 0.8 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ratio locataires / loueurs */}
        <div>
          <div style={sectionTitle}>Ratio locataires / loueurs</div>
          <div style={CARD}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981' }}>{locataires.toLocaleString('fr-FR')}</div>
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Locataires ({locatairesPct} %)</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#60A5FA' }}>{loueurs.toLocaleString('fr-FR')}</div>
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Loueurs ({totalRoles > 0 ? 100 - locatairesPct : 0} %)</div>
              </div>
            </div>
            <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ width: `${locatairesPct}%`, background: 'linear-gradient(90deg, #10B981, #059669)' }} />
              <div style={{ width: `${totalRoles > 0 ? 100 - locatairesPct : 0}%`, background: '#60A5FA' }} />
            </div>
            <p style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '12px', marginBottom: 0 }}>
              {totalRoles === 0
                ? 'Aucun rôle renseigné pour le moment.'
                : locatairesPct >= 70
                ? 'Beaucoup plus de locataires que de loueurs — priorité à l\'acquisition d\'annonces.'
                : locatairesPct <= 30
                ? 'Beaucoup plus de loueurs que de locataires — priorité à l\'acquisition locataires.'
                : 'Équilibre sain entre l\'offre et la demande.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
