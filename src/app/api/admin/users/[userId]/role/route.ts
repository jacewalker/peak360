import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { requireAdmin } from '@/lib/auth-helpers';
import { logAuditEvent, getRequestContext } from '@/lib/audit';

/**
 * POST /api/admin/users/[userId]/role
 *
 * D-21: Role-change handler with last-admin pre-check + setRole + audit log.
 * Warning 6 fix: post-check rollback closes the concurrent-demotion race window.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  // 1. Verify caller is admin (server-side source of truth — D-11)
  const [session, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  const { userId } = await params;
  const body = await request.json().catch(() => null);
  const newRole = body?.role as 'admin' | 'coach' | 'client' | undefined;
  if (!newRole || !['admin', 'coach', 'client'].includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Look up target user
  const [target] = await db.select().from(user).where(eq(user.id, userId));
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const oldRole = target.role;

  const countAdmins = async (): Promise<number> => {
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(eq(user.role, 'admin'));
    return Number(rows[0]?.count ?? 0);
  };

  // 2. Last-admin pre-check — D-21 step 2
  if (oldRole === 'admin' && newRole !== 'admin') {
    const before = await countAdmins();
    if (before <= 1) {
      return NextResponse.json(
        { error: 'Cannot change the role of the only admin. Promote another user to admin first.' },
        { status: 400 }
      );
    }
  }

  // 3. Persist via Better Auth admin plugin.
  // Cast to bypass Better Auth's restrictive default 'user' | 'admin' typing —
  // our app uses a domain role union of 'admin' | 'coach' | 'client'
  // configured via the admin plugin in src/lib/auth.ts.
  try {
    await auth.api.setRole({
      body: { userId, role: newRole as 'admin' },
      headers: await headers(),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }

  // 3b. Post-check rollback (warning 6 fix — close concurrent-demotion race).
  // If a concurrent setRole demoted a different admin between our pre-check and our setRole,
  // the system could now have 0 admins. Re-count and roll back if so.
  if (oldRole === 'admin' && newRole !== 'admin') {
    const after = await countAdmins();
    if (after < 1) {
      // Roll back our own demotion
      try {
        await auth.api.setRole({
          body: { userId, role: 'admin' },
          headers: await headers(),
        });
      } catch {
        // Rollback itself failed — the audit log entry below still surfaces the incident.
      }
      const ctx = await getRequestContext();
      await logAuditEvent({
        userId: session.user.id,
        action: 'user.role.rollback',
        resourceType: 'user',
        resourceId: userId,
        metadata: {
          from: oldRole,
          attemptedTo: newRole,
          restoredTo: 'admin',
          reason: 'last-admin-race',
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      return NextResponse.json(
        {
          error:
            'Race detected — another admin change happened simultaneously. Previous role restored.',
        },
        { status: 409 }
      );
    }
  }

  // 4. Audit log for the successful role change (fire-and-forget)
  const ctx = await getRequestContext();
  await logAuditEvent({
    userId: session.user.id,
    action: 'user.role.changed',
    resourceType: 'user',
    resourceId: userId,
    metadata: { from: oldRole, to: newRole },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return NextResponse.json({ success: true });
}
