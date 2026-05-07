import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { sendEmailViaSMTP2Go } from '@/lib/email/send';
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
        html: `<p>You've been invited to sign in to Peak360.</p><p>Click the link below to sign in:</p><a href="${baseUrl}/login">Sign in to Peak360</a>`,
      });
    }
    return NextResponse.json({ success: true, message: 'User already exists, sent sign-in link' });
  }

  // D-02: atomic create with role param via Better Auth admin plugin
  const inviteName =
    (typeof body?.name === 'string' && body.name.trim()) || email.split('@')[0];

  try {
    await auth.api.createUser({
      body: {
        email,
        password: crypto.randomUUID(),
        name: inviteName,
        // Better Auth admin plugin role typing narrows to its own union; the
        // runtime accepts any configured role string, so we widen via cast.
        role: requestedRole as 'user' | 'admin',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to create user account' },
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
      html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Welcome to Peak360</h2>
        <p>You've been invited to access Peak360.</p>
        <p>Click the link below to sign in:</p>
        <a href="${baseUrl}/login" style="display: inline-block; padding: 12px 24px; background: #F5A623; color: #1a365d; text-decoration: none; border-radius: 8px; font-weight: 600;">Sign in to Peak360</a>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">This link will take you to the login page where you can request a magic link to access your account.</p>
      </div>`,
    });
  }

  return NextResponse.json({ success: true, message: 'Invitation sent' });
}
