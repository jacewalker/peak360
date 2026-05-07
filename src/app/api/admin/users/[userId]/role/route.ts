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
 * D-21: Role-change handler with last-admin guard + audit log.
 * BL-02 fix: count + role write performed atomically inside db.transaction.
 * The previous post-check rollback design was unreachable in concurrent races
 * (the caller's session may no longer be admin by the time the rollback's
 * setRole call runs). The atomic transaction makes that race impossible.
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

  // 2. Last-admin guard + role write — atomic transaction (BL-02 fix).
  // Both the admin count and the role update happen inside the transaction so the
  // count cannot race against another concurrent demotion. The rollback path
  // (which was unreachable in concurrent races because the rollback setRole call
  // re-checks caller-is-admin) is removed in favour of this atomic design.
  //
  // Variable name `before` is intentional — it matches the regex anchor in
  // tests/security/last-admin-guard.test.ts:33 (`/before\s*<=\s*1/`). DO NOT
  // rename without also updating the test.
  class LastAdminError extends Error {}

  try {
    // db is exported as Proxy<any> in src/lib/db/index.ts so the tx parameter
    // has no inferable type — annotate as any to satisfy strict mode.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.transaction(async (tx: any) => {
      if (oldRole === 'admin' && newRole !== 'admin') {
        const rows = await tx
          .select({ count: sql<number>`count(*)` })
          .from(user)
          .where(eq(user.role, 'admin'));
        const before = Number(rows[0]?.count ?? 0);
        if (before <= 1) {
          throw new LastAdminError();
        }
      }
      await tx.update(user).set({ role: newRole }).where(eq(user.id, userId));
    });
  } catch (err) {
    if (err instanceof LastAdminError) {
      return NextResponse.json(
        { error: 'Cannot change the role of the only admin. Promote another user to admin first.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }

  // 3. Trigger Better Auth session-invalidation side effect AFTER the role write
  // has committed. If this errors (e.g. caller's session lost admin in a concurrent
  // race), the role write is already durable and the demoted user's next request
  // will see the new role — so we swallow the error and continue to the audit log.
  try {
    await auth.api.setRole({
      body: { userId, role: newRole as 'admin' },
      headers: await headers(),
    });
  } catch {
    // Role write already committed in the transaction; setRole here is best-effort
    // for session invalidation only.
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
