import { NextResponse } from 'next/server'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { createApiClient } from '@/lib/supabase/api-auth'

/**
 * PIN du coffre-fort — UX de sécurité côté client, la vraie protection vient
 * des RLS owner-only (table documents + bucket vault).
 * Hash scrypt natif Node (format "salt:hash") — bcrypt n'est pas dans les dépendances.
 */

function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(pin, salt, 32).toString('hex')}`
}

function checkPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), scryptSync(pin, salt, 32))
  } catch {
    return false
  }
}

const PIN_RE = /^\d{4}$/

export async function GET(req: Request) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabase.from('profiles').select('vault_pin_hash').eq('id', user.id).maybeSingle()
  return NextResponse.json({ configured: !!data?.vault_pin_hash })
}

export async function POST(req: Request) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { action?: string; pin?: string; newPin?: string }
  const { action, pin, newPin } = body

  const { data: profile } = await supabase.from('profiles').select('vault_pin_hash').eq('id', user.id).maybeSingle()
  const stored = profile?.vault_pin_hash as string | null

  if (action === 'set') {
    if (stored) return NextResponse.json({ error: 'Un PIN existe déjà' }, { status: 400 })
    if (!pin || !PIN_RE.test(pin)) return NextResponse.json({ error: 'PIN invalide (4 chiffres)' }, { status: 400 })
    const { error } = await supabase.from('profiles').update({ vault_pin_hash: hashPin(pin) }).eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'verify') {
    if (!stored) return NextResponse.json({ error: 'Aucun PIN configuré' }, { status: 400 })
    return NextResponse.json({ ok: !!pin && checkPin(pin, stored) })
  }

  if (action === 'change') {
    if (!stored) return NextResponse.json({ error: 'Aucun PIN configuré' }, { status: 400 })
    if (!pin || !checkPin(pin, stored)) return NextResponse.json({ error: 'PIN actuel incorrect' }, { status: 403 })
    if (!newPin || !PIN_RE.test(newPin)) return NextResponse.json({ error: 'Nouveau PIN invalide (4 chiffres)' }, { status: 400 })
    const { error } = await supabase.from('profiles').update({ vault_pin_hash: hashPin(newPin) }).eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'disable') {
    if (!stored) return NextResponse.json({ error: 'Aucun PIN configuré' }, { status: 400 })
    if (!pin || !checkPin(pin, stored)) return NextResponse.json({ error: 'PIN actuel incorrect' }, { status: 403 })
    const { error } = await supabase.from('profiles').update({ vault_pin_hash: null }).eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
}
