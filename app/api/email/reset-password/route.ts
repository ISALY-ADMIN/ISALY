import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { resend, FROM_EMAIL, APP_URL } from '@/lib/resend'
import { resetPasswordTemplate } from '@/lib/email-templates'

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[reset] Supabase env vars not set')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

  try {
    // Générer le lien de récupération via l'API admin Supabase
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${APP_URL}/auth/callback?next=/auth/update-password` },
    })

    if (error || !data?.properties?.action_link) {
      console.error('[reset] generateLink error:', error?.message)
      // Ne pas révéler si l'email existe ou non
      return NextResponse.json({ success: true })
    }

    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Réinitialise ton mot de passe — ISALY',
      html: resetPasswordTemplate(data.properties.action_link),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[reset] unexpected error:', err)
    return NextResponse.json({ success: true }) // pas de fuite d'info
  }
}
