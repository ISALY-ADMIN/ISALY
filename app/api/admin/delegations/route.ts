import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import { createAdminClient } from '@/lib/admin/serviceClient'

export const dynamic = 'force-dynamic'

const STATUSES = ['a_facturer', 'facturee', 'payee'] as const

/**
 * POST — change le statut de la commission d'une délégation (« Marquer
 * facturée »). Garde : getAdminUser. Écriture service-role, tracée dans
 * admin_actions.
 */
export async function POST(request: Request) {
  const adminUser = await getAdminUser()
  const body = (await request.json().catch(() => null)) as { delegationId?: string; status?: string } | null
  const id = body?.delegationId
  const status = body?.status as (typeof STATUSES)[number] | undefined
  if (!id || !status || !STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('delegations').update({ commission_status: status }).eq('id', id)
  if (error) return NextResponse.json({ error: 'Impossible de mettre à jour la commission.' }, { status: 500 })

  await admin.from('admin_actions').insert({
    admin_id: adminUser.id,
    action: 'update_delegation_commission',
    target_type: 'delegation',
    target_id: id,
    details: { commission_status: status },
  })

  return NextResponse.json({ success: true })
}
