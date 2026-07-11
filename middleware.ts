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
  const isAdminRoute = pathname.startsWith('/admin')
  const isRoot = pathname === '/'
  const isOnboarding = pathname === '/onboarding'
  // Only login + register bounce connected users; other auth pages (finalize, callback, etc.) stay accessible
  const isLoginOrRegister = pathname === '/auth/login' || pathname === '/auth/register'

  // Not connected: block /app/* and /admin/*
  if (!user && (isAppRoute || isAdminRoute)) {
    return redirect('/auth/login')
  }

  if (user) {
    // Fetch profile on routes where onboarding/admin state matters
    if (isAppRoute || isAdminRoute || isLoginOrRegister || isOnboarding || isRoot) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, is_admin, suspended')
        .eq('id', user.id)
        .single()

      const onboardingDone = profile?.onboarding_completed === true
      const isAdmin = profile?.is_admin === true
      const isSuspended = profile?.suspended === true

      // Suspended users can't access /app/* (shown a dedicated blocked page)
      if (isSuspended && isAppRoute && pathname !== '/app/suspendu') {
        return redirect('/app/suspendu')
      }

      // /admin/* requires is_admin = true
      if (isAdminRoute && !isAdmin) {
        return redirect('/app/dashboard-home')
      }

      // Connected + done: bounce away from public/auth/onboarding pages → dashboard
      // (le dashboard gère l'affichage selon le mode locataire/loueur)
      if (onboardingDone && (isRoot || isLoginOrRegister || isOnboarding)) {
        return redirect('/app/dashboard-home')
      }

      // Connected + not done: block /app/* until finalize runs (admin routes are exempt)
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
