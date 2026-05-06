import { NextRequest, NextResponse } from 'next/server';
import { GATE_COOKIE_NAME, GATE_MAX_AGE_SECONDS, signGateToken } from '@/lib/landing-gate';

export const runtime = 'edge';

function safeNext(raw: string | null): string {
  if (!raw) return '/';
  if (!raw.startsWith('/')) return '/';
  // Reject protocol-relative URLs and backslash tricks (open-redirect guard)
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  return raw;
}

function constantTimeEqualStrings(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  // Always loop the longer length so timing depends on neither input
  const len = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

const LANDING_PASSWORD = 'peakage';

export async function POST(req: NextRequest) {
  const secret = process.env.LANDING_GATE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Landing gate not configured: LANDING_GATE_SECRET must be set.' },
      { status: 500 },
    );
  }

  const form = await req.formData();
  const submitted = String(form.get('password') ?? '');
  const next = safeNext(typeof form.get('next') === 'string' ? String(form.get('next')) : null);
  const ok = constantTimeEqualStrings(submitted, LANDING_PASSWORD);

  if (!ok) {
    const url = new URL('/gate', req.url);
    url.searchParams.set('error', '1');
    if (next !== '/') url.searchParams.set('next', next);
    return NextResponse.redirect(url, 303);
  }

  const token = await signGateToken(secret);
  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(GATE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: GATE_MAX_AGE_SECONDS,
  });
  return res;
}
