import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user, session, assessments } from '@/lib/db/schema';
import { sql, desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-helpers';

/**
 * GET /api/admin/users
 *
 * Returns the user list with banned status, last-active session timestamp,
 * per-user assessment counts (as coach + as client), and — for clients — the
 * coach derived from their most recent assessment.
 *
 * Previous version used correlated subqueries (`SELECT COUNT(*) FROM
 * assessments WHERE coachId = "user"."id"`) which proved unreliable in
 * production: in some configurations the inner `"user"."id"` reference
 * resolved against the wrong table or was silently mishandled, yielding
 * absurd counts (e.g. "View 10 assessments" on a brand-new client with zero
 * assessments). Counts now happen in JS over a single batched fetch.
 */
export async function GET() {
  const [, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  // 1. User rows with banned/active metadata via a single correlated subquery
  //    we KNOW works (session is a simple table lookup, no foot-gun aliases).
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
    storedCoachId: string | null;
  }> = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: user.banExpires,
      createdAt: user.createdAt,
      lastActive:
        sql<string | null>`(SELECT MAX(${session.createdAt}) FROM ${session} WHERE ${session.userId} = ${user.id})`.as(
          'last_active',
        ),
      storedCoachId: user.coachId,
    })
    .from(user)
    .orderBy(desc(user.createdAt));

  // 2. All assessments — small table, fine to scan. Pull the minimal columns
  //    needed to derive counts and the "most recent coach per client".
  const assessmentRows: Array<{
    id: string;
    coachId: string | null;
    clientId: string | null;
    createdAt: string;
  }> = await db
    .select({
      id: assessments.id,
      coachId: assessments.coachId,
      clientId: assessments.clientId,
      createdAt: assessments.createdAt,
    })
    .from(assessments);

  const coachCountById = new Map<string, number>();
  const clientCountById = new Map<string, number>();
  // For each client user, remember the most recent assessment with a non-null
  // coachId (assessments without a coach don't reveal one).
  const latestCoachForClient = new Map<
    string,
    { coachId: string; createdAt: string }
  >();

  for (const a of assessmentRows) {
    if (a.coachId) {
      coachCountById.set(a.coachId, (coachCountById.get(a.coachId) ?? 0) + 1);
    }
    if (a.clientId) {
      clientCountById.set(a.clientId, (clientCountById.get(a.clientId) ?? 0) + 1);
      if (a.coachId) {
        const prev = latestCoachForClient.get(a.clientId);
        if (!prev || a.createdAt > prev.createdAt) {
          latestCoachForClient.set(a.clientId, {
            coachId: a.coachId,
            createdAt: a.createdAt,
          });
        }
      }
    }
  }

  const nameById = new Map(rows.map((r) => [r.id, r.name] as const));

  const data = rows.map(({ storedCoachId, ...r }) => {
    const coachCount = coachCountById.get(r.id) ?? 0;
    const clientCount = clientCountById.get(r.id) ?? 0;
    let coachId: string | null = null;
    let coachName: string | null = null;
    if (r.role === 'client') {
      // Prefer the explicit user.coach_id assignment; fall back to the coach
      // on the client's most-recent assessment for users that pre-date the
      // user.coach_id column.
      const fallback = latestCoachForClient.get(r.id)?.coachId ?? null;
      coachId = storedCoachId ?? fallback;
      if (coachId) coachName = nameById.get(coachId) ?? null;
    }
    return { ...r, coachCount, clientCount, coachId, coachName };
  });

  return NextResponse.json({ success: true, data });
}
