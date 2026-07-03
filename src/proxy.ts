import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/auth/callback', '/manutencao/ocorrencias']
const MOBILE_ONLY_PROFILES = ['motorista', 'conferente']
const ADMIN_ALLOWED_PROFILES = ['admin', 'frota', 'gestor', 'auditor', 'manutencao']

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
}

function isMobileRoute(pathname: string) {
  return pathname.startsWith('/mobile')
}

function isAssetOrApiRoute(pathname: string) {
  return pathname.startsWith('/_next') || pathname.startsWith('/api')
}

async function getPerfilUsuario(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('usuarios_perfis')
    .select('perfil, ativo')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data || data.ativo === false) return null
  return typeof data.perfil === 'string' ? data.perfil : null
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname

  if (isAssetOrApiRoute(pathname)) {
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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const publicRoute = isPublicRoute(pathname)

  if (!user && !publicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  if (!user) {
    return supabaseResponse
  }

  const perfil = await getPerfilUsuario(supabase, user.id)
  const isMobileOnly = perfil ? MOBILE_ONLY_PROFILES.includes(perfil) : false
  const isAdminAllowed = perfil ? ADMIN_ALLOWED_PROFILES.includes(perfil) : false

  // Login deve mandar cada perfil para seu ambiente correto.
  if (pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = isMobileOnly ? '/mobile' : '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Usuário de campo/conferente não deve acessar o painel administrativo.
  if (isMobileOnly && !isMobileRoute(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/mobile'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Usuário administrativo que abrir a raiz vai para o dashboard.
  if (pathname === '/' && isAdminAllowed) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
