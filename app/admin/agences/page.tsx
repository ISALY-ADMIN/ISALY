import { getAdminUser } from '@/lib/admin/getAdminUser'
import { createAdminClient } from '@/lib/admin/serviceClient'
import { EmptyState, Icon, Pill, type Tone } from '@/components/ui-v2'
import { Tbl, Who, shortDate } from '@/components/ui-v2/admin/parts'
import AgencyForm from './AgencyForm'
import MarkBilled from './MarkBilled'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Agences partenaires — ISALY' }

interface Agency { id: string; name: string; city: string; phone: string | null; email: string | null; active: boolean }
interface Delegation {
  id: string
  transmitted_at: string
  commission_status: 'a_facturer' | 'facturee' | 'payee'
  listing: { title: string | null; neighborhood: string | null; city: string | null } | null
  tenant: { first_name: string | null } | null
  agency: { name: string } | null
}

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

const COMMISSION: Record<Delegation['commission_status'], [string, Tone, 'warn' | '' | 'ok']> = {
  a_facturer: ['À facturer', 'warn', 'warn'],
  facturee: ['Facturée', 'info', ''],
  payee: ['Payée', 'ok', 'ok'],
}

/** Tables de la migration dashboard v2 : null si elles n'existent pas encore. */
async function getData() {
  const admin = createAdminClient()
  const agRes = await admin.from('partner_agencies').select('id, name, city, phone, email, active').order('created_at', { ascending: false })
  if (agRes.error) return null
  const [delRes, lstRes] = await Promise.all([
    admin
      .from('delegations')
      .select('id, transmitted_at, commission_status, listing:listing_id (title, neighborhood, city), tenant:tenant_id (first_name), agency:agency_id (name)')
      .order('transmitted_at', { ascending: false })
      .limit(100),
    admin.from('listings').select('partner_agency_id').not('partner_agency_id', 'is', null),
  ])
  const counts: Record<string, number> = {}
  for (const l of (lstRes.data ?? []) as { partner_agency_id: string }[]) counts[l.partner_agency_id] = (counts[l.partner_agency_id] ?? 0) + 1
  const delegations: Delegation[] = ((delRes.data ?? []) as Record<string, unknown>[]).map(d => ({
    id: d.id as string,
    transmitted_at: d.transmitted_at as string,
    commission_status: d.commission_status as Delegation['commission_status'],
    listing: one(d.listing as Delegation['listing']),
    tenant: one(d.tenant as Delegation['tenant']),
    agency: one(d.agency as Delegation['agency']),
  }))
  return { agencies: (agRes.data ?? []) as Agency[], delegations, counts }
}

/** Agences partenaires (vAdmAgencies, nouvel écran). */
export default async function AdminAgences() {
  await getAdminUser()
  const data = await getData()

  if (!data) {
    return (
      <EmptyState
        icon="globe"
        tone="warn"
        title="Les tables des agences partenaires n’existent pas encore"
        text="Exécute la migration du dashboard v2 (sql-migrations/42_dashboard_v2.sql) dans Supabase : cet écran s’activera ensuite."
      />
    )
  }

  const { agencies, delegations, counts } = data

  return (
    <div className="v-grid wide-l">
      <div className="stackv" style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
        <Tbl head={['Agence', 'Ville', 'Statut', 'Logements confiés']} empty={agencies.length === 0 ? 'Aucune agence pour le moment' : undefined}>
          {agencies.map(a => (
            <tr key={a.id}>
              <td><Who id={a.id} name={a.name} sub={a.email ?? a.phone ?? '-'} /></td>
              <td>{a.city}</td>
              <td>{a.active ? <Pill tone="ok">Active</Pill> : <Pill>Inactive</Pill>}</td>
              <td className="num">{counts[a.id] ?? 0}</td>
            </tr>
          ))}
        </Tbl>

        <section className="panel">
          <div className="phead"><h2>Délégations et commissions</h2></div>
          {delegations.length === 0 ? (
            <p className="soft">Aucun dossier transmis à une agence pour le moment.</p>
          ) : (
            <div className="rows">
              {delegations.map(d => {
                const [label, tone, ico] = COMMISSION[d.commission_status] ?? COMMISSION.a_facturer
                const place = [d.listing?.title, [d.listing?.neighborhood, d.listing?.city].filter(Boolean).join(', ')].filter(Boolean).join(', ') || 'Logement'
                const who = d.tenant?.first_name ? `Dossier de ${d.tenant.first_name}` : 'Dossier'
                return (
                  <div className="row" key={d.id}>
                    <span className={ico ? `ico ${ico}` : 'ico'}><Icon name="building" size={18} /></span>
                    <span className="grow">
                      <span className="t">{place}</span>
                      <span className="s">{`${who} transmis le ${shortDate(d.transmitted_at)}${d.agency ? `, ${d.agency.name}` : ''}`}</span>
                    </span>
                    <Pill tone={tone}>{label}</Pill>
                    {d.commission_status === 'a_facturer' && <MarkBilled delegationId={d.id} />}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
      <AgencyForm />
    </div>
  )
}
