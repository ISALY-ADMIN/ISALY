import { createClient } from '@/lib/supabase/server'
import { getAdminUser } from '@/lib/admin/getAdminUser'

async function getPayments() {
  const supabase = createClient()
  const { data } = await supabase
    .from('payments')
    .select(`
      id, amount, plan_type, status, stripe_payment_intent_id, created_at,
      profiles:user_id (first_name, last_name, email)
    `)
    .order('created_at', { ascending: false })
  return data ?? []
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  succeeded: { bg: 'rgba(78,203,160,0.12)',  color: '#4ECBA0', label: 'Réussi' },
  pending:   { bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B', label: 'En attente' },
  failed:    { bg: 'rgba(239,68,68,0.12)',   color: '#EF4444', label: 'Échoué' },
}

const PLAN_LABELS: Record<string, string> = {
  assurance: 'Assurance',
  featured:  'Boost Featured',
  priority:  'Boost Priority',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatAmount(cents: number | null) {
  if (!cents) return '—'
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`
}

export default async function AdminPaiements() {
  await getAdminUser()
  const payments = await getPayments()

  const totalRevenue = payments
    .filter(p => p.status === 'succeeded')
    .reduce((sum, p) => sum + (p.amount ?? 0), 0)

  return (
    <div style={{ padding: '32px 40px', fontFamily: "'Outfit', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
            Paiements
          </h1>
          <p style={{ color: '#6B7280', fontSize: '14px', marginTop: '4px' }}>
            {payments.length} transaction{payments.length !== 1 ? 's' : ''} · lecture seule
          </p>
        </div>
        <div style={{ background: 'rgba(78,203,160,0.1)', border: '1px solid rgba(78,203,160,0.2)', borderRadius: '12px', padding: '14px 20px', textAlign: 'right' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#4ECBA0' }}>{formatAmount(totalRevenue)}</div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>Revenus confirmés</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
        {/* Head */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px' }}>
          {['Utilisateur', 'Plan', 'Montant', 'Statut', 'Date'].map(h => (
            <div key={h} style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '1px' }}>{h}</div>
          ))}
        </div>

        {payments.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#4B5563' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>💳</div>
            <p style={{ margin: 0 }}>Aucun paiement enregistré</p>
          </div>
        ) : (
          payments.map((payment, i) => {
            const profileRaw = payment.profiles
            const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as { first_name: string | null; last_name: string | null; email: string | null } | null
            const userName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || profile?.email || '—'
            const s = STATUS_STYLE[payment.status ?? 'pending'] ?? STATUS_STYLE.pending

            return (
              <div
                key={payment.id}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr', padding: '13px 20px', borderBottom: i < payments.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#E5E7EB', marginBottom: '2px' }}>{userName}</div>
                  {payment.stripe_payment_intent_id && (
                    <div style={{ fontSize: '11px', color: '#4B5563', fontFamily: 'monospace' }}>
                      {payment.stripe_payment_intent_id.slice(0, 20)}…
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                  {PLAN_LABELS[payment.plan_type ?? ''] ?? payment.plan_type ?? '—'}
                </div>

                <div style={{ fontSize: '13px', fontWeight: 600, color: payment.status === 'succeeded' ? '#4ECBA0' : '#9CA3AF' }}>
                  {formatAmount(payment.amount)}
                </div>

                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: s.bg, color: s.color }}>
                    {s.label}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  {formatDate(payment.created_at)}
                </div>
              </div>
            )
          })
        )}
      </div>

    </div>
  )
}
