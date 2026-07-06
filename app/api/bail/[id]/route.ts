import { NextResponse } from 'next/server'
import { createApiClient } from '@/lib/supabase/api-auth'
import type { Lease } from '@/types/database'

export interface BailDetail {
  lease: Lease
  myRole: 'owner' | 'tenant'
  /** C'est mon tour de signer (le loueur signe d'abord, puis le locataire). */
  canSign: boolean
  owner: { id: string; name: string; avatarUrl: string | null } | null
  tenant: { id: string; name: string; avatarUrl: string | null } | null
  /** URL signée temporaire du PDF (bucket privé "leases"), si déposé. */
  documentSignedUrl: string | null
}

async function loadLease(req: Request, id: string) {
  const { supabase, user } = await createApiClient(req)
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: lease } = await supabase.from('leases').select('*').eq('id', id).maybeSingle()
  if (!lease) return { error: NextResponse.json({ error: 'Bail introuvable' }, { status: 404 }) }
  if (lease.owner_id !== user.id && lease.tenant_id !== user.id) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { supabase, user, lease: lease as Lease }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const res = await loadLease(req, params.id)
  if ('error' in res) return res.error
  const { supabase, user, lease } = res

  const ids = [lease.owner_id, lease.tenant_id].filter(Boolean) as string[]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, avatar_url')
    .in('id', ids)

  const profileOf = (pid: string | null) => {
    const p = (profiles ?? []).find(x => x.id === pid)
    return p ? { id: p.id as string, name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Utilisateur', avatarUrl: (p.avatar_url as string) ?? null } : null
  }

  let documentSignedUrl: string | null = null
  if (lease.document_url) {
    const { data: signed } = await supabase.storage.from('leases').createSignedUrl(lease.document_url, 3600)
    documentSignedUrl = signed?.signedUrl ?? null
  }

  const myRole: 'owner' | 'tenant' = lease.owner_id === user.id ? 'owner' : 'tenant'
  const canSign =
    lease.status === 'pending_signature' &&
    (myRole === 'owner' ? !lease.owner_signature : !!lease.owner_signature && !lease.tenant_signature)

  const detail: BailDetail = {
    lease,
    myRole,
    canSign,
    owner: profileOf(lease.owner_id),
    tenant: profileOf(lease.tenant_id),
    documentSignedUrl,
  }
  return NextResponse.json(detail)
}

/** Enregistre le chemin du PDF signé déposé dans le bucket "leases". */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const res = await loadLease(req, params.id)
  if ('error' in res) return res.error
  const { supabase, lease } = res

  const { document_url } = await req.json().catch(() => ({})) as { document_url?: string }
  if (!document_url || !document_url.startsWith(`${lease.id}/`)) {
    return NextResponse.json({ error: 'Chemin de document invalide' }, { status: 400 })
  }

  const { error } = await supabase.from('leases').update({ document_url }).eq('id', lease.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
