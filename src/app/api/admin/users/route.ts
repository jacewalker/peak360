import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user, session, assessments } from '@/lib/db/schema';
import { sql, desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-helpers';

/**
 * GET /api/admin/users
 *
 * REQ-7.10: returns the user list with banned status + last-active + per-user
 * assessment counts (as coach + as client). Admin-only.
 *
 * Response shape:
 *   { success: true, data: Array<{ id, email, name, role, banned, banReason,
 *       banExpires, createdAt, lastActive, coachCount, clientCount }> }
 */
export async function GET() {
  const [, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  const rows = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      // BLOCKER 1 fix — REQ-7.10 mandates banned status surfacing.
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires,
      createdAt: user.createdAt,
      lastActive:
        sql<string | null>`(SELECT MAX(${session.createdAt}) FROM ${session} WHERE ${session.userId} = ${user.id})`.as(
          'last_active'
        ),
      coachCount:
        sql<number>`(SELECT COUNT(*) FROM ${assessments} WHERE ${assessments.coachId} = ${user.id})`.as(
          'coach_count'
        ),
      clientCount:
        sql<number>`(SELECT COUNT(*) FROM ${assessments} WHERE ${assessments.clientId} = ${user.id})`.as(
          'client_count'
        ),
    })
    .from(user)
    .orderBy(desc(user.createdAt));

  return NextResponse.json({ success: true, data: rows });
}
