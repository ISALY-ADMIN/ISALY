import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Budget d'exécution des appels réseau du middleware.
 *
 * Vercel coupe l'invocation et renvoie 504 MIDDLEWARE_INVOCATION_TIMEOUT sur
 * TOUTES les routes du matcher, landing publique comprise : un Supabase lent
 * ou injoignable suffit à mettre le site entier à terre. On borne donc chaque
 * appel, et on échoue OUVERT.
 */
const AUTH_TIMEOUT_MS = 2500

/**
 * Course entre une promesse réseau et un délai. En cas de dépassement ou
 * d'erreur, renvoie `fallback` au lieu de bloquer l'invocation.
 */
async function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>(resolve => { timer = setTimeout(() => resolve(fallback), ms) }),
    ])
  } catch {
    return fallback
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Un cookie de session Supabase est-il présent ?
 *
 * Sans cookie d'auth, le visiteur est forcément anonyme : inutile d'appeler le
 * réseau pour l'apprendre. C'est ce qui rend la landing publique totalement
 * indépendante de la disponibilité de Supabase.
 */
function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(c => c.name.startsWith('sb-') && c.name.includes('auth-token'))
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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

  const isGuardedRoute = isAppRoute || isAdminRoute || isLoginOrRegister || isOnboarding || isRoot

  // Aucune décision à prendre ici : on sort avant tout appel réseau.
  if (!isGuardedRoute) return supabaseResponse

  // Pas de cookie de session : anonyme, sans un seul appel réseau.
  if (!hasAuthCookie(request)) {
    if (isAppRoute || isAdminRoute) return redirect('/auth/login')
    return supabaseResponse
  }

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

  // Échec ouvert : si l'auth ne répond pas à temps, on laisse passer plutôt que
  // de faire tomber la page. Les écrans /app/* et /admin/* revérifient la
  // session côté serveur (lib/admin/getAdminUser, clients Supabase par page) et
  // les RLS protègent les données — la garde du middleware est du confort de
  // navigation, pas la seule barrière de sécurité.
  const authResult = await withTimeout(supabase.auth.getUser(), AUTH_TIMEOUT_MS, null)
  const user = authResult?.data?.user ?? null

  // Not connected: block /app/* and /admin/*
  // `authResult === null` = l'appel a expiré : on ne déconnecte personne sur un
  // timeout, on laisse la page se charger et se protéger elle-même.
  if (!user && authResult !== null && (isAppRoute || isAdminRoute)) {
    return redirect('/auth/login')
  }

  if (user) {
    const profileResult = await withTimeout(
      supabase
        .from('profiles')
        .select('onboarding_completed, is_admin, suspended')
        .eq('id', user.id)
        .single(),
      AUTH_TIMEOUT_MS,
      null,
    )

    // Profil indisponible (lenteur, erreur, ligne absente) : on laisse passer.
    // Aucune redirection ne doit dépendre d'une requête qui a échoué.
    if (profileResult?.data) {
      const profile = profileResult.data
      const onboardingDone = profile.onboarding_completed === true
      const isAdmin = profile.is_admin === true
      const isSuspended = profile.suspended === true

      // Suspended users can't access /app/* (shown a dedicated blocked page)
      if (isSuspended && isAppRoute && pathname !== '/app/suspendu') {
        return redirect('/app/suspendu')
      }

      // /admin/* requires is_admin = true
      if (isAdminRoute && !isAdmin) {
        return redirect('/app/dashboard-home')
      }

      // Connected + done: bounce away from public/auth/onboarding pages.
      // Point d'entrée : le dashboard rend la variante correspondant au rôle.
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
    // Périmètre réduit aux seules routes où le middleware décide quelque chose.
    // /api/*, les assets, le blog et le reste du site ne l'invoquent plus.
    '/',
    '/app/:path*',
    '/admin/:path*',
    '/onboarding',
    '/auth/login',
    '/auth/register',
  ],
}
