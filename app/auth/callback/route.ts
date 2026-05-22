import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') // ex: /auth/update-password

  if (code) {
    const supabase = createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Redirection explicite (ex: reset password)
      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      // Vérifier si l'onboarding est complété
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', data.user.id)
        .single()

      const destination = profile?.onboarding_completed === true ? '/app/swipe' : '/auth/finalize'
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`)
}
