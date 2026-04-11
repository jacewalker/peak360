import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken } from '@/lib/auth/session';

const PUBLIC_PATHS = new Set([
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/health',
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
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
    // Fail-closed: deny all access when auth is not configured
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication not configured' },
        { status: 503 }
      );
    }
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  const sessionToken = req.cookies.get('peak360_session')?.value;
  if (!sessionToken) {
    return redirectToLogin(req);
  }

  if (!await validateSessionToken(sessionToken, adminPassword)) {
    return redirectToLogin(req);
  }

  return NextResponse.next();
}

function redirectToLogin(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const loginUrl = new URL('/login', req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
