import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const ref = searchParams.get('ref')

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

      // Apply referral if present (Google OAuth flow)
      if (ref) {
        try {
          const service = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
          )
          const { data: userProfile } = await service
            .from('profiles')
            .select('referred_by')
            .eq('id', data.user.id)
            .single()

          if (!userProfile?.referred_by) {
            const { data: referrer } = await service
              .from('profiles')
              .select('id, referral_count')
              .eq('referral_code', ref.toUpperCase())
              .neq('id', data.user.id)
              .single()

            if (referrer) {
              await service
                .from('profiles')
                .update({ referred_by: ref.toUpperCase() })
                .eq('id', data.user.id)
              await service
                .from('profiles')
                .update({ referral_count: (referrer.referral_count ?? 0) + 1 })
                .eq('id', referrer.id)
            }
          }
        } catch {}
      }

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
