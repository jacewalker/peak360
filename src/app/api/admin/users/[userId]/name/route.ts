import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-helpers';
import { logAuditEvent, getRequestContext } from '@/lib/audit';

/**
 * POST /api/admin/users/[userId]/name
 *
 * Admin-only — rename a user's display name. Mirrors the shape of the
 * sibling /role route (admin guard via requireAdmin, audit log on success).
 *
 * Body: { name: string }
 * Validation: trimmed length 1..120.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const [session, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  const { userId } = await params;
  const body = await request.json().catch(() => null);
  const raw = typeof body?.name === 'string' ? body.name.trim() : '';

  if (!raw) {
    return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
  }
  if (raw.length > 120) {
    return NextResponse.json({ error: 'Name too long (max 120 characters)' }, { status: 400 });
  }

  const [target] = await db.select().from(user).where(eq(user.id, userId));
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const oldName = target.name;
  if (oldName === raw) {
    // No-op write — return success without an audit entry.
    return NextResponse.json({ success: true, name: raw, changed: false });
  }

  await db.update(user).set({ name: raw }).where(eq(user.id, userId));

  const ctx = await getRequestContext();
  await logAuditEvent({
    userId: session.user.id,
    action: 'user.name.changed',
    resourceType: 'user',
    resourceId: userId,
    metadata: { from: oldName, to: raw },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return NextResponse.json({ success: true, name: raw, changed: true });
}
