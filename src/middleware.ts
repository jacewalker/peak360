import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

const PUBLIC_PATHS = new Set(['/login', '/api/health']);

const PORTAL_SUBDOMAIN_HOSTNAMES = new Set(
  (process.env.PORTAL_HOSTNAMES ?? 'portal.peak360.com.au').split(',')
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Static assets - pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next();
  }

  // Portal subdomain redirect
  const hostname = req.headers.get('host')?.split(':')[0] ?? '';
  if (PORTAL_SUBDOMAIN_HOSTNAMES.has(hostname)) {
    const targetPath = pathname === '/' ? '/portal' : `/portal${pathname}`;
    const targetUrl = new URL(targetPath, req.url);
    return NextResponse.redirect(targetUrl);
  }

  // Better Auth catch-all routes must be public
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Public paths
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Landing page (non-portal, non-api) - public
  if (!pathname.startsWith('/portal') && !pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Protected paths: check session cookie (optimistic, real validation in API handlers)
  const sessionCookie = getSessionCookie(req);
  if (!sessionCookie) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
