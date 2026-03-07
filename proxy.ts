import { NextRequest, NextResponse } from 'next/server'

export function proxy(req: NextRequest) {
  const auth = req.cookies.get('bbg-auth')?.value
  const isLoginPage = req.nextUrl.pathname === '/login'
  const isApiAuth = req.nextUrl.pathname === '/api/auth'

  if (isLoginPage || isApiAuth) return NextResponse.next()

  if (auth !== 'authenticated') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
