import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, recalcCertLevel, DOC_TYPE_LABELS } from '@/lib/admin/serviceClient'

/** POST { documentId, approve } — valide ou rejette un document de vérification. */
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!adminProfile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let documentId: string, approve: boolean
  try {
    ;({ documentId, approve } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!documentId || typeof approve !== 'boolean') {
    return NextResponse.json({ error: 'Missing documentId or approve' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: doc } = await admin
    .from('user_documents')
    .select('id, user_id, type')
    .eq('id', documentId)
    .single()

  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

  const { error: updateError } = await admin
    .from('user_documents')
    .update({ status: approve ? 'verified' : 'rejected', updated_at: new Date().toISOString() })
    .eq('id', documentId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Recalcul du niveau de certification à partir des documents validés
  const certLevel = await recalcCertLevel(admin, doc.user_id)

  const label = DOC_TYPE_LABELS[doc.type] ?? 'document'

  // Notification in-app au user
  await admin.from('notifications').insert({
    user_id: doc.user_id,
    type: 'system',
    title: approve ? `Votre ${label} a été vérifié ✓` : `Votre ${label} a été refusé`,
    body: approve
      ? `Votre document est validé — vous êtes désormais certifié niveau ${certLevel}.`
      : 'Veuillez renvoyer un document lisible depuis votre profil.',
    link: '/app/profil',
  })

  // Log admin
  await admin.from('admin_actions').insert({
    admin_id: user.id,
    action: approve ? 'verify_document' : 'reject_document',
    target_type: 'user_document',
    target_id: documentId,
    details: { type: doc.type, user_id: doc.user_id, cert_level: certLevel },
  })

  return NextResponse.json({ success: true, certLevel })
}
