import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assessments, assessmentSections } from '@/lib/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { requireSession } from '@/lib/auth-helpers';
import { applyClientLink } from '@/lib/clients/link';

/**
 * Check if the user has access to this assessment based on role.
 */
function hasAccess(
  role: string,
  userId: string,
  assessment: { coachId: string | null; clientId: string | null }
): boolean {
  if (role === 'admin') return true;
  if (role === 'coach') return assessment.coachId === userId;
  if (role === 'client') return assessment.clientId === userId;
  return false;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [session, errorRes] = await requireSession();
  if (errorRes) return errorRes;

  const { id } = await params;
  const [row] = await db.select().from(assessments).where(eq(assessments.id, id));
  if (!row) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  if (!hasAccess(session.user.role, session.user.id, row)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const completedRows = await db
    .select({ sectionNumber: assessmentSections.sectionNumber })
    .from(assessmentSections)
    .where(
      and(
        eq(assessmentSections.assessmentId, id),
        isNotNull(assessmentSections.completedAt)
      )
    );
  const completedSections = completedRows.map((r: { sectionNumber: number }) => r.sectionNumber);

  return NextResponse.json({ success: true, data: row, completedSections });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [session, errorRes] = await requireSession();
  if (errorRes) return errorRes;

  // Clients are read-only
  if (session.user.role === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const [row] = await db.select().from(assessments).where(eq(assessments.id, id));
  if (!row) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  if (!hasAccess(session.user.role, session.user.id, row)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const now = new Date().toISOString();

  await db
    .update(assessments)
    .set({ ...body, updatedAt: now })
    .where(eq(assessments.id, id));

  // Make client_id authoritative on reassign/rename. When the assign/rename
  // payload carries a clientName and/or clientEmail, repoint (or clear) client_id
  // to the resolved client. Use the pre-fetched row.coachId so a newly
  // auto-created client inherits the assessment's coach.
  if (body.clientName || body.clientEmail) {
    await applyClientLink(id, {
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      coachId: row.coachId,
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const [session, errorRes] = await requireSession();
  if (errorRes) return errorRes;

  // Clients cannot delete
  if (session.user.role === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const [row] = await db.select().from(assessments).where(eq(assessments.id, id));
  if (!row) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  if (!hasAccess(session.user.role, session.user.id, row)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.delete(assessments).where(eq(assessments.id, id));
  return NextResponse.json({ success: true });
}
