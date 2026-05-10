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
 *       banExpires, createdAt, lastActive, coachCount, clientCount,
 *       coachId, coachName }> }
 *
 * Additive fields (260510-osn):
 *   - coachId:   id of the coach assigned via the user's MOST RECENT
 *                assessment (assessments.coachId, ordered by created_at desc).
 *                Populated only when role === 'client'; otherwise null.
 *   - coachName: display name of that coach (joined from user table by id).
 *                Populated only when role === 'client'; otherwise null.
 */
export async function GET() {
  const [, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  const rows: Array<{
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'coach' | 'client';
    banned: boolean | null;
    banReason: string | null;
    banExpires: number | null;
    createdAt: string;
    lastActive: string | null;
    coachCount: number;
    clientCount: number;
    coachId: string | null;
    coachName: string | null;
  }> = await db
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
      // 260510-osn: coachId of the client's most-recent assessment.
      // Correlated subquery — works on both Postgres and SQLite paths.
      coachId:
        sql<string | null>`(SELECT ${assessments.coachId} FROM ${assessments} WHERE ${assessments.clientId} = ${user.id} AND ${assessments.coachId} IS NOT NULL ORDER BY ${assessments.createdAt} DESC LIMIT 1)`.as(
          'coach_id'
        ),
      // 260510-osn: display name of that coach via nested correlated subquery.
      coachName:
        sql<string | null>`(SELECT u2.name FROM ${user} u2 WHERE u2.id = (SELECT ${assessments.coachId} FROM ${assessments} WHERE ${assessments.clientId} = ${user.id} AND ${assessments.coachId} IS NOT NULL ORDER BY ${assessments.createdAt} DESC LIMIT 1))`.as(
          'coach_name'
        ),
    })
    .from(user)
    .orderBy(desc(user.createdAt));

  // Defensive post-process: only `client` rows ever surface a coach.
  const data = rows.map((r) =>
    r.role === 'client' ? r : { ...r, coachId: null, coachName: null }
  );

  return NextResponse.json({ success: true, data });
}
