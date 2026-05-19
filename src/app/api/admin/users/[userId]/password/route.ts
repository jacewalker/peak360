import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { requireAdmin } from '@/lib/auth-helpers';
import { logAuditEvent, getRequestContext } from '@/lib/audit';

/**
 * POST /api/admin/users/[userId]/password
 *
 * Admin-only — set a user's password directly. Used when email delivery
 * isn't configured, so admins hand the password to the user out-of-band.
 *
 * Body: { newPassword: string }   // min 8 chars (matches auth.minPasswordLength)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const [session, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  const { userId } = await params;
  const body = await request.json().catch(() => null);
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400 },
    );
  }

  const [target] = await db.select().from(user).where(eq(user.id, userId));
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    await auth.api.setUserPassword({
      body: { userId, newPassword },
      headers: await headers(),
    });
  } catch (err) {
    console.error('[admin/users/password] setUserPassword failed', {
      userId,
      err: err instanceof Error ? { name: err.name, message: err.message } : err,
    });
    return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
  }

  const ctx = await getRequestContext();
  await logAuditEvent({
    userId: session.user.id,
    action: 'user.password.reset',
    resourceType: 'user',
    resourceId: userId,
    // Do NOT log the password itself.
    metadata: { targetEmail: target.email },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return NextResponse.json({ success: true });
}
