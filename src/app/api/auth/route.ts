import { NextRequest, NextResponse } from 'next/server'

const PASSWORD = process.env.SITE_PASSWORD || 'bayarea2026'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (password === PASSWORD) {
    const res = NextResponse.json({ ok: true })
    res.cookies.set('site_auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  }

  return NextResponse.json({ ok: false }, { status: 401 })
}
