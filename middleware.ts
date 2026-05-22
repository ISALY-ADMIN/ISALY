import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  function redirect(path: string) {
    const url = request.nextUrl.clone()
    url.pathname = path
    return NextResponse.redirect(url)
  }

  const isAppRoute = pathname.startsWith('/app')
  const isRoot = pathname === '/'
  const isOnboarding = pathname === '/onboarding'
  // Only login + register bounce connected users; other auth pages (finalize, callback, etc.) stay accessible
  const isLoginOrRegister = pathname === '/auth/login' || pathname === '/auth/register'

  // Not connected: only block /app/*
  if (!user && isAppRoute) {
    return redirect('/auth/login')
  }

  if (user) {
    // Only fetch profile on routes where onboarding state matters
    if (isAppRoute || isLoginOrRegister || isOnboarding || isRoot) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()

      const onboardingDone = profile?.onboarding_completed === true

      // Connected + done: bounce away from public/auth/onboarding pages
      if (onboardingDone && (isRoot || isLoginOrRegister || isOnboarding)) {
        return redirect('/app/swipe')
      }

      // Connected + not done: block /app/* until finalize runs
      if (!onboardingDone && isAppRoute) {
        return redirect('/auth/finalize')
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
