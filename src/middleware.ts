import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken } from '@/lib/auth/session';

const PUBLIC_PATHS = new Set([
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/health',
]);

const LANDING_HOSTNAMES = new Set(
  (process.env.LANDING_HOSTNAMES ?? 'peak360.com.au,www.peak360.com.au').split(',')
);

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

  // Hostname routing: landing page vs portal
  const hostname = req.headers.get('host')?.split(':')[0] ?? '';

  if (LANDING_HOSTNAMES.has(hostname)) {
    // Root path on landing domain -> rewrite to /landing route
    if (pathname === '/') {
      const url = req.nextUrl.clone();
      url.pathname = '/landing';
      return NextResponse.rewrite(url);
    }
    // API routes on landing domain pass through (e.g., contact form in Phase 7)
    if (pathname.startsWith('/api/')) {
      return NextResponse.next();
    }
    // All other paths on landing domain -> redirect to portal
    const portalUrl = new URL(pathname, 'https://portal.peak360.com.au');
    return NextResponse.redirect(portalUrl);
  }

  // Block direct access to /landing on portal hostname
  if (pathname === '/landing' || pathname.startsWith('/landing/')) {
    return NextResponse.redirect(new URL('/', req.url));
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
