import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resend, FROM_EMAIL } from '@/lib/resend'
import { identityVerifiedTemplate, identityRejectedTemplate } from '@/lib/email-templates'

export async function POST(request: Request) {
  const supabase = createClient()

  // Verify caller is admin
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

  let userId: string, approve: boolean
  try {
    ;({ userId, approve } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Fetch target user profile for email
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('first_name, email')
    .eq('id', userId)
    .single()

  // Update dossier.identity_verified
  const { error: updateError } = await supabase
    .from('dossiers')
    .update({ identity_verified: approve })
    .eq('user_id', userId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Log admin action
  await supabase.from('admin_actions').insert({
    admin_id: user.id,
    action: approve ? 'verify_identity' : 'reject_identity',
    target_type: 'profile',
    target_id: userId,
    details: { approve },
  })

  // Send email notification
  if (targetProfile?.email) {
    const firstName = targetProfile.first_name ?? ''
    await resend.emails.send({
      from: FROM_EMAIL,
      to: targetProfile.email,
      subject: approve
        ? 'Ton identité a été vérifiée — ISALY'
        : 'Action requise sur ton dossier — ISALY',
      html: approve
        ? identityVerifiedTemplate(firstName)
        : identityRejectedTemplate(firstName),
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
