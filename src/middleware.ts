import { NextRequest, NextResponse } from 'next/server'

const USERNAME = 'jeff'
const PASSWORD = 'bayarea2026'

export function middleware(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth) {
    const [scheme, encoded] = auth.split(' ')
    if (scheme === 'Basic') {
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8')
      const [user, pass] = decoded.split(':')
      if (user === USERNAME && pass === PASSWORD) {
        return NextResponse.next()
      }
    }
  }
  return new NextResponse('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Bay Area Shows"' },
  })
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)'],
}
