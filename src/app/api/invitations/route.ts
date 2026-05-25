import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { sendEmailViaSMTP2Go } from '@/lib/email/send';
import { renderBrandedEmail } from '@/lib/email/template';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  // Validate session
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only coach or admin can invite
  if (session.user.role === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Parse body
  const body = await request.json().catch(() => null);

  // D-05: admin can invite any role; coach can only invite clients
  const requestedRole = (body?.role as 'admin' | 'coach' | 'client' | undefined) ?? 'client';

  if (session.user.role === 'coach' && requestedRole !== 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!['admin', 'coach', 'client'].includes(requestedRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  if (!body?.email || typeof body.email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  // Optional caller-supplied password. Falls back to a random UUID when absent
  // (legacy callers + the "user already exists" branch don't supply one).
  // Matches the minPasswordLength configured on betterAuth (src/lib/auth.ts).
  const password =
    typeof body?.password === 'string' && body.password.length > 0
      ? body.password
      : crypto.randomUUID();
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400 },
    );
  }

  // Check if user already exists
  const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);

  if (existing.length > 0) {
    // User exists -- send them a sign-in link instead (D-07: magic-link for all roles)
    try {
      await auth.api.signInMagicLink({
        body: {
          email,
          callbackURL: '/portal',
        },
        headers: await headers(),
      });
    } catch {
      // Fallback: inline magic-link-style email if the API surface differs
      const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
      await sendEmailViaSMTP2Go({
        to: email,
        subject: 'Sign in to Peak360',
        html: renderBrandedEmail({
          preheader: 'You’ve been invited to sign in to Peak360.',
          heading: 'Sign in to Peak360',
          intro:
            'You’ve been invited to sign in to Peak360. Use the button below to go to the login page and access your account.',
          ctaLabel: 'Sign in to Peak360',
          ctaUrl: `${baseUrl}/login`,
          footnote:
            'If you weren’t expecting this invitation, you can safely ignore this email.',
        }),
      });
    }
    return NextResponse.json({ success: true, message: 'User already exists, sent sign-in link' });
  }

  // D-02: atomic create with role param via Better Auth admin plugin
  const inviteName =
    (typeof body?.name === 'string' && body.name.trim()) || email.split('@')[0];

  // D-02: atomic create with role param via Better Auth admin plugin.
  // Phase 7.1 fix: this used to fail with "Failed to create user account"
  // because the admin plugin sends email_verified/banned as native booleans
  // but the user table had INTEGER columns. Phase 7.1 migrated those columns
  // to BOOLEAN (runMigrations()) so this path now works directly.
  try {
    await auth.api.createUser({
      body: {
        email,
        password,
        name: inviteName,
        // Better Auth admin plugin role typing narrows to its own union; the
        // runtime accepts any configured role string, so we widen via cast.
        role: requestedRole as 'user' | 'admin',
      },
    });
  } catch (err) {
    console.error('[invitations] createUser failed', {
      email,
      requestedRole,
      err: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
    });
    const detail = err instanceof Error ? err.message : undefined;
    return NextResponse.json(
      {
        error: 'Failed to create user account',
        ...(process.env.NODE_ENV !== 'production' && detail ? { detail } : {}),
      },
      { status: 500 }
    );
  }

  // D-07: send a magic-link sign-in email regardless of target role
  try {
    await auth.api.signInMagicLink({
      body: {
        email,
        callbackURL: '/portal',
      },
      headers: await headers(),
    });
  } catch {
    // Fallback: inline invitation email if the magic-link surface is unavailable
    const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
    await sendEmailViaSMTP2Go({
      to: email,
      subject: "You've been invited to Peak360",
      html: renderBrandedEmail({
        preheader: 'You’ve been invited to Peak360 — an account has been created for you.',
        heading: 'Welcome to Peak360',
        intro:
          'You’ve been invited to access Peak360 and an account has been created for you. Use the button below to head to the login page and sign in.',
        ctaLabel: 'Sign in to Peak360',
        ctaUrl: `${baseUrl}/login`,
        footnote:
          'At the login page you can request a magic link to securely access your account.',
      }),
    });
  }

  return NextResponse.json({ success: true, message: 'Invitation sent' });
}
