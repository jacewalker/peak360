import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-helpers';
import { logAuditEvent, getRequestContext } from '@/lib/audit';

/**
 * POST /api/admin/users/[userId]/coach
 *
 * Admin-only — assign or clear the coach for a client user. Independent of
 * assessments.coach_id (which records who ran a specific assessment); this
 * column lives on the user record so a client can have a coach before any
 * assessment exists.
 *
 * Body: { coachId: string | null }
 *   - null clears the assignment
 *   - non-null must point at an existing user whose role is 'coach' or 'admin'
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const [session, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  const { userId } = await params;
  const body = await request.json().catch(() => null);
  const rawCoachId = body?.coachId;
  const coachId =
    typeof rawCoachId === 'string' && rawCoachId.length > 0 ? rawCoachId : null;

  const [target] = await db.select().from(user).where(eq(user.id, userId));
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (target.role !== 'client') {
    return NextResponse.json(
      { error: 'Only clients can have a coach assigned.' },
      { status: 400 },
    );
  }

  if (coachId) {
    const [coachRow] = await db.select().from(user).where(eq(user.id, coachId));
    if (!coachRow) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 400 });
    }
    if (coachRow.role !== 'coach' && coachRow.role !== 'admin') {
      return NextResponse.json(
        { error: 'Selected user is not a coach.' },
        { status: 400 },
      );
    }
  }

  const previousCoachId = target.coachId ?? null;
  if (previousCoachId === coachId) {
    return NextResponse.json({ success: true, changed: false });
  }

  await db.update(user).set({ coachId }).where(eq(user.id, userId));

  const ctx = await getRequestContext();
  await logAuditEvent({
    userId: session.user.id,
    action: 'user.coach.assigned',
    resourceType: 'user',
    resourceId: userId,
    metadata: { from: previousCoachId, to: coachId },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return NextResponse.json({ success: true, changed: true });
}
