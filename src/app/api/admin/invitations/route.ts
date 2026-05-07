import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user, session } from '@/lib/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-helpers';

/**
 * GET /api/admin/invitations
 *
 * Returns the list of past invitations derived from the `user` table joined
 * against `session` (D-08). An invitation is "accepted" iff the invited user
 * has at least one session row (D-08). Ordered by user.createdAt DESC (D-09).
 *
 * Admin-only. No new schema (D-08: no `invitations` table).
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
      createdAt: user.createdAt,
      anySessionId: sql<string | null>`MAX(${session.id})`.as('any_session_id'),
    })
    .from(user)
    .leftJoin(session, eq(session.userId, user.id))
    .groupBy(user.id)
    .orderBy(desc(user.createdAt));

  const data = rows.map((r: typeof rows[number]) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    createdAt: r.createdAt,
    accepted: r.anySessionId !== null, // D-08: accepted = has at least one session
  }));

  return NextResponse.json({ success: true, data });
}
