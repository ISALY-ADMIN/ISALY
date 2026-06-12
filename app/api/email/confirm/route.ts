import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resend, FROM_EMAIL, APP_URL } from '@/lib/resend'
import { confirmEmailTemplate } from '@/lib/email-templates'

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[confirm] Supabase env vars not set')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let email: string
  try {
    ;({ email } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

  console.log('[confirm] ── start for', email)
  console.log('[confirm] SUPABASE_URL present:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('[confirm] SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
  console.log('[confirm] RESEND_API_KEY present:', !!process.env.RESEND_API_KEY)
  console.log('[confirm] APP_URL:', APP_URL)
  console.log('[confirm] FROM_EMAIL:', FROM_EMAIL)

  try {
    // Generate a magic link — logs the user in directly (bypasses email confirmation)
    console.log('[confirm] calling generateLink...')
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${APP_URL}/auth/callback` },
    })

    if (error) {
      console.error('[confirm] generateLink ERROR:', JSON.stringify(error))
      return NextResponse.json({ error: `generateLink failed: ${error.message}` }, { status: 500 })
    }
    if (!data?.properties?.action_link) {
      console.error('[confirm] generateLink returned no action_link. data:', JSON.stringify(data))
      return NextResponse.json({ error: 'Lien vide retourné par Supabase' }, { status: 500 })
    }

    console.log('[confirm] generateLink OK — action_link starts with:', data.properties.action_link.slice(0, 60))

    // Send via Resend
    console.log('[confirm] calling resend.emails.send...')
    const { data: resendData, error: sendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Confirme ton adresse email — ISALY',
      html: confirmEmailTemplate(data.properties.action_link),
    })

    if (sendError) {
      console.error('[confirm] resend SEND ERROR:', JSON.stringify(sendError))
      return NextResponse.json({ error: `Resend error: ${JSON.stringify(sendError)}` }, { status: 500 })
    }

    console.log('[confirm] resend OK — email id:', resendData?.id)
    return NextResponse.json({ success: true, emailId: resendData?.id })
  } catch (err) {
    console.error('[confirm] unexpected error:', err)
    return NextResponse.json({ error: `Erreur serveur: ${String(err)}` }, { status: 500 })
  }
}
