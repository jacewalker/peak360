import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export type UserRole = 'admin' | 'coach' | 'client';

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
  session: {
    id: string;
    token: string;
    expiresAt: Date;
  };
}

/**
 * Validate the session from request headers.
 * Returns the session or null if not authenticated.
 */
export async function getValidSession(): Promise<AuthSession | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return session as unknown as AuthSession;
}

/**
 * Require a valid session or return 401.
 * Returns [session, null] on success, [null, response] on failure.
 */
export async function requireSession(): Promise<
  [AuthSession, null] | [null, NextResponse]
> {
  const session = await getValidSession();
  if (!session) {
    return [null, NextResponse.json({ error: 'Unauthorized' }, { status: 401 })];
  }
  return [session, null];
}

/**
 * Require an admin role or return 403.
 * Returns [session, null] on success, [null, response] on failure.
 */
export async function requireAdmin(): Promise<
  [AuthSession, null] | [null, NextResponse]
> {
  const [session, errorRes] = await requireSession();
  if (errorRes) return [null, errorRes];
  if (session.user.role !== 'admin') {
    return [null, NextResponse.json({ error: 'Forbidden' }, { status: 403 })];
  }
  return [session, null];
}
