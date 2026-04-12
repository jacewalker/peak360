import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = new Set([
  '/login',
  '/api/health',
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow Better Auth catch-all routes
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

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

  // TODO: Plan 02-02 will add proper Better Auth session checks here.
  // For now, allow all requests through to avoid blocking the app
  // while the auth system is being set up incrementally.
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
