import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      if (next) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      // Upsert profile with metadata from auth provider (handles Google OAuth + email signup)
      const meta = data.user.user_metadata ?? {}
      const fullName: string = meta.full_name ?? meta.name ?? ''
      await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          email: data.user.email,
          first_name: meta.first_name ?? (fullName ? fullName.split(' ')[0] : null),
          last_name: meta.last_name ?? (fullName ? fullName.split(' ').slice(1).join(' ') || null : null),
          avatar_url: meta.avatar_url ?? meta.picture ?? null,
        },
        { onConflict: 'id' }
      )

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', data.user.id)
        .single()

      const destination = profile?.onboarding_completed === true ? '/app/swipe' : '/onboarding'
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`)
}
