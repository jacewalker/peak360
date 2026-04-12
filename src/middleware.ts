import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken } from '@/lib/auth/session';

const PUBLIC_PATHS = new Set([
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/health',
]);

const PORTAL_SUBDOMAIN_HOSTNAMES = new Set(
  (process.env.PORTAL_HOSTNAMES ?? 'portal.peak360.com.au').split(',')
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets — pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next();
  }

  // Redirect portal.peak360.com.au/* → peak360.com.au/portal/*
  const hostname = req.headers.get('host')?.split(':')[0] ?? '';
  if (PORTAL_SUBDOMAIN_HOSTNAMES.has(hostname)) {
    const targetPath = pathname === '/' ? '/portal' : `/portal${pathname}`;
    const targetUrl = new URL(targetPath, 'https://peak360.com.au');
    return NextResponse.redirect(targetUrl);
  }

  // Public paths — no auth required
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Landing page (root and non-portal paths) — no auth required
  if (!pathname.startsWith('/portal') && !pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // API routes not in public paths — require auth
  // Portal routes — require auth

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
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
