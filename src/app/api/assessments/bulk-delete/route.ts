import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assessments } from '@/lib/db/schema';
import { inArray, and, eq } from 'drizzle-orm';
import { requireSession } from '@/lib/auth-helpers';

export async function POST(req: Request) {
  try {
    const [session, errorRes] = await requireSession();
    if (errorRes) return errorRes;
    if (session.user.role === 'client') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const ids = body?.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids must be a non-empty array' },
        { status: 400 }
      );
    }

    // Scope the delete to resources the caller owns; admins may delete any.
    const where =
      session.user.role === 'admin'
        ? inArray(assessments.id, ids)
        : and(
            inArray(assessments.id, ids),
            eq(assessments.coachId, session.user.id)
          );

    const deleted = await db
      .delete(assessments)
      .where(where)
      .returning({ id: assessments.id });

    return NextResponse.json({ success: true, deleted: deleted.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
