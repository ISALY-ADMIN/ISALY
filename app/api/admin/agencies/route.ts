import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin/getAdminUser'
import { createAdminClient } from '@/lib/admin/serviceClient'

export const dynamic = 'force-dynamic'

const clean = (v: unknown, max = 200): string | null => {
  if (typeof v !== 'string') return null
  const s = v.trim().slice(0, max)
  return s || null
}

/**
 * POST — ajoute une agence partenaire (écran Agences partenaires de l'admin).
 * Garde : getAdminUser (profiles.is_admin côté serveur). Écriture avec le
 * client serveur service-role, tracée dans admin_actions.
 */
export async function POST(request: Request) {
  const adminUser = await getAdminUser()
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const name = clean(body?.name)
  const city = clean(body?.city, 120)
  if (!name || !city) return NextResponse.json({ error: 'Le nom et la ville sont obligatoires.' }, { status: 400 })

  const row = {
    name,
    city,
    phone: clean(body?.phone, 40),
    email: clean(body?.email, 200),
    address: clean(body?.address, 300),
    opening_hours: clean(body?.opening_hours, 200),
    active: body?.active === true,
  }

  const admin = createAdminClient()
  const { data, error } = await admin.from('partner_agencies').insert(row).select('id').single()
  if (error) {
    const missing = error.code === '42P01' || /does not exist/i.test(error.message)
    return NextResponse.json(
      { error: missing ? 'La table partner_agencies n’existe pas encore : exécute sql-migrations/42_dashboard_v2.sql.' : 'Impossible d’ajouter l’agence.' },
      { status: missing ? 503 : 500 },
    )
  }

  await admin.from('admin_actions').insert({
    admin_id: adminUser.id,
    action: 'create_partner_agency',
    target_type: 'partner_agency',
    target_id: data.id,
    details: { name, city, active: row.active },
  })

  return NextResponse.json({ success: true, id: data.id })
}
