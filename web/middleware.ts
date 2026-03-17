import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const { pathname } = request.nextUrl

    if (!user && (pathname.startsWith('/home') || pathname.startsWith('/onboarding'))) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user && pathname === '/login') {
      return NextResponse.redirect(new URL('/home', request.url))
    }
  } catch {
    // Se Supabase non disponibile, lascia passare senza auth guard
  }

  return response
}

export const config = {
  matcher: ['/home/:path*', '/onboarding/:path*', '/login'],
}
