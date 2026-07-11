import { NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-auth'

export interface SearchAlert {
  id: string
  name: string | null
  city: string | null
  budget_max: number | null
  rooms: number | null
  surface_min: number | null
  meuble: boolean | null
  animaux_ok: boolean | null
  non_fumeur: boolean | null
  notify_push: boolean
  notify_email: boolean
  is_active: boolean
  last_triggered_at: string | null
  created_at: string
}

export async function GET(req: Request) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('search_alerts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ alerts: data ?? [] })
}

export async function POST(req: Request) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as Partial<SearchAlert>

  const { data, error } = await supabase
    .from('search_alerts')
    .insert({
      user_id: user.id,
      name: body.name?.trim() || null,
      city: body.city?.trim() || null,
      budget_max: body.budget_max || null,
      rooms: body.rooms || null,
      surface_min: body.surface_min || null,
      meuble: body.meuble ?? null,
      animaux_ok: body.animaux_ok ?? null,
      non_fumeur: body.non_fumeur ?? null,
      notify_push: body.notify_push ?? true,
      notify_email: body.notify_email ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ alert: data })
}
