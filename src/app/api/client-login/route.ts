import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { sendEmailViaSMTP2Go } from '@/lib/email/send';
import { db } from '@/lib/db';
import { assessments, user } from '@/lib/db/schema';
import { and, eq, or } from 'drizzle-orm';
import { requireSession, type AuthSession } from '@/lib/auth-helpers';
import { findClientUserByName } from '@/lib/clients/link';

/**
 * Can the signed-in user create/resend a login for this client name?
 * Mirrors src/app/api/client-notes/route.ts canAccess:
 * - admin → any client name
 * - coach → only client names appearing in at least one of THEIR OWN assessments
 * - client → never (handled by caller as 403)
 */
async function canAccess(session: AuthSession, clientName: string): Promise<boolean> {
  if (session.user.role === 'admin') return true;
  if (session.user.role !== 'coach') return false;

  const rows = await db
    .select({ id: assessments.id })
    .from(assessments)
    .where(
      and(
        eq(assessments.clientName, clientName),
        eq(assessments.coachId, session.user.id)
      )
    )
    .limit(1);

  return rows.length > 0;
}

/**
 * Dedup-by-name upgrade: when no user matches the entered email, look for a
 * SINGLE role='client' placeholder (auto-created by the link resolver) matched
 * by NAME and upgrade its email to the entered email instead of creating a
 * second user. Returns true if it upgraded, false to fall through to createUser.
 *
 * Guards:
 * - Ambiguous name (2+ client users) → do NOT guess; fall through (return false).
 * - UNIQUE-email collision: if some OTHER user already holds the entered email,
 *   do NOT reassign it; fall through (return false) so createUser surfaces the
 *   constraint error as today. (The caller already proved no email match exists,
 *   but we re-confirm defensively.)
 *
 * Uses findClientUserByName from @/lib/clients/link (the same name-match rule the
 * resolver uses), keeping the dedup decision unit-testable.
 */
async function tryUpgradePlaceholderByName(
  clientName: string,
  email: string
): Promise<boolean> {
  const match = await findClientUserByName(clientName);
  if (match === null || match === 'ambiguous') return false;

  // Defensive UNIQUE-email re-confirm: never steal an email another user holds.
  const holder = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (holder.length > 0 && holder[0].id !== match) return false;

  await db.update(user).set({ email }).where(eq(user.id, match));
  return true;
}

/**
 * POST /api/client-login — create-or-resend a client login + link assessments.
 *
 * Creates a client-role account for the given email if none exists (else resends),
 * emails a magic-link sign-in (sender noreply@peak360.com.au via SMTP2Go), and
 * links every assessment whose clientName matches OR whose clientEmail matches the
 * entered email to that user's id (so the client can view them read-only).
 */
export async function POST(request: Request) {
  const [session, errorRes] = await requireSession();
  if (errorRes) return errorRes;

  const body = await request.json().catch(() => null);

  const clientName: string =
    typeof body?.clientName === 'string' ? body.clientName.trim() : '';

  // Only coach or admin can create/resend client logins
  if (session.user.role === 'client') {
    console.warn('[client-login] forbidden', {
      reason: 'role-client',
      role: session.user.role,
      userId: session.user.id,
      clientName,
    });
    return NextResponse.json(
      {
        error:
          "You're signed in as a client account. Sign out and sign in as a coach or admin to manage client logins.",
      },
      { status: 403 }
    );
  }

  if (!clientName) {
    return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
  }

  if (!body?.email || typeof body.email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  // Coach can only act on their own clients; admin on any
  if (!(await canAccess(session, clientName))) {
    console.warn('[client-login] forbidden', {
      reason: 'not-own-client',
      role: session.user.role,
      userId: session.user.id,
      clientName,
    });
    return NextResponse.json(
      { error: 'You can only create a login for a client in your own assessments.' },
      { status: 403 }
    );
  }

  // Look up the user by email
  const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);

  let userId: string;
  let created: boolean;

  if (existing.length > 0) {
    // Account exists → resend the sign-in link
    userId = existing[0].id;
    created = false;
  } else if (await tryUpgradePlaceholderByName(clientName, email)) {
    // A single role='client' placeholder (auto-created by the link resolver,
    // matched by name) had its email upgraded to the entered email instead of
    // creating a duplicate user. This is effectively the placeholder's first
    // real login, so created stays false.
    const upgraded = await db.select().from(user).where(eq(user.email, email)).limit(1);
    userId = upgraded[0].id;
    created = false;
  } else {
    // No account → create a client-role account (password is a placeholder;
    // clients sign in via magic link). Mirrors invitations.ts createUser flow.
    try {
      await auth.api.createUser({
        body: {
          email,
          password: crypto.randomUUID(),
          name: clientName,
          // Better Auth admin plugin role typing narrows to its own union; the
          // runtime accepts any configured role string, so we widen via cast.
          role: 'client' as 'user' | 'admin',
        },
      });
    } catch (err) {
      console.error('[client-login] createUser failed', {
        email,
        clientName,
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

    // Re-query to get the newly-created user's id
    const fresh = await db.select().from(user).where(eq(user.email, email)).limit(1);
    if (fresh.length === 0) {
      console.error('[client-login] user not found after createUser', { email });
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }
    userId = fresh[0].id;
    created = true;
  }

  // Link assessments: clientName matches OR clientEmail matches the entered email.
  const matched = await db
    .select({ id: assessments.id })
    .from(assessments)
    .where(or(eq(assessments.clientName, clientName), eq(assessments.clientEmail, email)));
  const linkedCount = matched.length;

  await db
    .update(assessments)
    .set({ clientId: userId, clientEmail: email })
    .where(or(eq(assessments.clientName, clientName), eq(assessments.clientEmail, email)));

  // Send the magic-link sign-in email. Falls back to an inline email if the
  // magic-link surface is unavailable (mirrors invitations.ts). In dev (no
  // SMTP2GO_API_KEY) sendEmailViaSMTP2Go logs the email to the console.
  try {
    await auth.api.signInMagicLink({
      body: {
        email,
        callbackURL: '/portal',
      },
      headers: await headers(),
    });
  } catch {
    const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
    await sendEmailViaSMTP2Go({
      to: email,
      subject: 'Sign in to Peak360',
      html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a365d;">Sign in to Peak360</h2>
        <p>A login has been created for your Peak360 account.</p>
        <p>Click the link below to sign in:</p>
        <a href="${baseUrl}/login" style="display: inline-block; padding: 12px 24px; background: #F5A623; color: #1a365d; text-decoration: none; border-radius: 8px; font-weight: 600;">Sign in to Peak360</a>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">This link will take you to the login page where you can request a magic link to access your account.</p>
      </div>`,
    });
  }

  return NextResponse.json({ success: true, created, linkedCount });
}
