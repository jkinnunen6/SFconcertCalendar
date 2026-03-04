import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname.startsWith('/api/auth') || pathname === '/gate') {
    return NextResponse.next()
  }
  const auth = req.cookies.get('site_auth')
  if (auth?.value === 'true') {
    return NextResponse.next()
  }
  const gateUrl = req.nextUrl.clone()
  gateUrl.pathname = '/gate'
  return NextResponse.redirect(gateUrl)
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|fonts).*)'],
}
