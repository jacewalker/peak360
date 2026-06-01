import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { GATE_COOKIE_NAME, verifyGateToken } from '@/lib/landing-gate';

const PUBLIC_PATHS = new Set([
  '/login',
  '/api/health',
  '/api/landing-gate',
  '/api/contact', // public landing-page enquiry form
]);

const PORTAL_SUBDOMAIN_HOSTNAMES = new Set(
  (process.env.PORTAL_HOSTNAMES ?? 'portal.peak360.com.au').split(',')
);
const APEX_HOSTNAME = process.env.APEX_HOSTNAME ?? 'peak360.com.au';

// Paths that bypass the landing gate. The gate exists to lock down marketing
// pages — auth, the gate UI itself, the gate's POST handler, the portal, and
// admin all need to keep working without the cookie. Static assets are
// excluded earlier in the function.
const GATE_EXEMPT_PREFIXES = ['/api/', '/portal/', '/admin/'];
function isGateExempt(pathname: string): boolean {
  if (pathname === '/login' || pathname === '/gate' || pathname === '/portal' || pathname === '/admin') return true;
  return GATE_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

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

  // Portal subdomain → apex /portal cross-domain redirect.
  // API routes (/api/*) live at the root of the route tree, NOT under /portal/api,
  // so they must NOT be prefixed with /portal — that produces broken URLs like
  // peak360.com.au/portal/api/assessments/export which (a) 404 on the apex tree
  // and (b) mangle the suggested download filename (browser falls back to the
  // last path segment "export", dropping the .csv extension).
  // Serve API requests from the portal subdomain directly — same Next.js route,
  // same auth cookie scope, no cross-host filename loss.
  const hostname = req.headers.get('host')?.split(':')[0] ?? '';
  if (PORTAL_SUBDOMAIN_HOSTNAMES.has(hostname) && !pathname.startsWith('/api/')) {
    const targetPath = pathname === '/' ? '/portal' : `/portal${pathname}`;
    const targetUrl = new URL(`https://${APEX_HOSTNAME}${targetPath}${search}`);
    return NextResponse.redirect(targetUrl);
  }

  // Landing gate: restrict public marketing routes behind a password.
  // Exempt: /api/*, /portal/*, /admin/*, /login, /gate. The gate runs
  // BEFORE the better-auth bypass and protected-path checks below so we
  // gate even unauthenticated visits to "/" but never interfere with auth
  // or session-protected flows (which are exempt by prefix).
  if (!isGateExempt(pathname)) {
    const secret = process.env.LANDING_GATE_SECRET;
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        // Fail-closed in prod so the deployer notices a misconfiguration.
        const gateUrl = new URL('/gate', req.url);
        gateUrl.searchParams.set('next', `${pathname}${search}`);
        return NextResponse.redirect(gateUrl);
      }
      console.warn(
        '[landing-gate] LANDING_GATE_SECRET unset; allowing request through (dev fail-open).',
      );
    } else {
      const token = req.cookies.get(GATE_COOKIE_NAME)?.value;
      const ok = token ? await verifyGateToken(token, secret) : false;
      if (!ok) {
        const gateUrl = new URL('/gate', req.url);
        gateUrl.searchParams.set('next', `${pathname}${search}`);
        return NextResponse.redirect(gateUrl);
      }
    }
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
