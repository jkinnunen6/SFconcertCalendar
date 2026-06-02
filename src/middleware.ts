import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always allow auth routes and gate page
  if (
    pathname.startsWith('/api/auth') ||
    pathname === '/gate'
  ) {
    return NextResponse.next()
  }

  // Password gate check
  const siteAuth = req.cookies.get('site_auth')
  if (siteAuth?.value !== 'true') {
    const gateUrl = req.nextUrl.clone()
    gateUrl.pathname = '/gate'
    return NextResponse.redirect(gateUrl)
  }

  // Refresh Supabase auth session if present
  let response = NextResponse.next({ request: req })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )
  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|fonts).*)'],
}
