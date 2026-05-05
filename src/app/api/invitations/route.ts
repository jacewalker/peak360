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
    // User exists -- send them a login link instead
    const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
    await sendEmailViaSMTP2Go({
      to: email,
      subject: 'Sign in to Peak360',
      html: `<p>Your coach has invited you to view your health assessments on Peak360.</p><p>Click the link below to sign in:</p><a href="${baseUrl}/login?mode=client">Sign in to Peak360</a>`,
    });
    return NextResponse.json({ success: true, message: 'Client already exists, sent login link' });
  }

  // Create new client user via Better Auth
  try {
    await auth.api.signUpEmail({
      body: {
        email,
        password: crypto.randomUUID(),
        name: email.split('@')[0],
      },
    });

    // Update role to client
    await db.update(user).set({ role: 'client' }).where(eq(user.email, email));
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to create client account' },
      { status: 500 }
    );
  }

  // Send invite email
  const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
  await sendEmailViaSMTP2Go({
    to: email,
    subject: "You've been invited to Peak360",
    html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #1a365d;">Welcome to Peak360</h2>
      <p>Your coach has invited you to view your health assessments on Peak360.</p>
      <p>Click the link below to sign in:</p>
      <a href="${baseUrl}/login?mode=client" style="display: inline-block; padding: 12px 24px; background: #F5A623; color: #1a365d; text-decoration: none; border-radius: 8px; font-weight: 600;">Sign in to Peak360</a>
      <p style="color: #666; font-size: 12px; margin-top: 24px;">This link will take you to the login page where you can request a magic link to access your assessments.</p>
    </div>`,
  });

  return NextResponse.json({ success: true, message: 'Invitation sent' });
}
