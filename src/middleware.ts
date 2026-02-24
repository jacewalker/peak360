import { NextRequest, NextResponse } from 'next/server';

function makeToken(password: string, date: string): string {
  return btoa(`${password}:${date}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next();
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.next();
  }

  const sessionToken = req.cookies.get('peak360_session')?.value;
  if (!sessionToken) {
    return redirectToLogin(req);
  }

  const today = new Date().toISOString().slice(0, 10);
  const expectedToken = makeToken(adminPassword, today);

  if (sessionToken !== expectedToken) {
    return redirectToLogin(req);
  }

  return NextResponse.next();
}

function redirectToLogin(req: NextRequest) {
  const loginUrl = new URL('/login', req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
