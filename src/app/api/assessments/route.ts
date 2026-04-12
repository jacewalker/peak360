import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assessments } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { createOrReuseVersion } from '@/lib/normative/versioning';
import { requireSession } from '@/lib/auth-helpers';

export async function GET() {
  const [session, errorRes] = await requireSession();
  if (errorRes) return errorRes;

  let rows;
  if (session.user.role === 'admin') {
    // Admin sees all assessments (including legacy with null coach_id)
    rows = await db.select().from(assessments).orderBy(desc(assessments.updatedAt));
  } else if (session.user.role === 'coach') {
    // Coach sees only their own assessments
    rows = await db
      .select()
      .from(assessments)
      .where(eq(assessments.coachId, session.user.id))
      .orderBy(desc(assessments.updatedAt));
  } else {
    // Client sees only assessments assigned to them
    rows = await db
      .select()
      .from(assessments)
      .where(eq(assessments.clientId, session.user.id))
      .orderBy(desc(assessments.updatedAt));
  }

  return NextResponse.json({ success: true, data: rows });
}

export async function POST(request: Request) {
  const [session, errorRes] = await requireSession();
  if (errorRes) return errorRes;

  // Clients cannot create assessments
  if (session.user.role === 'client') {
    return NextResponse.json(
      { error: 'Clients cannot create assessments' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const id = uuid();
  const now = new Date().toISOString();

  await db.insert(assessments).values({
    id,
    clientName: body.clientName || null,
    clientEmail: body.clientEmail || null,
    clientDob: body.clientDob || null,
    clientGender: body.clientGender || null,
    assessmentDate: body.assessmentDate || now.split('T')[0],
    currentSection: 1,
    status: 'in_progress',
    coachId: session.user.id,
    createdAt: now,
    updatedAt: now,
  });

  // Snapshot current normative ranges and link to assessment
  try {
    const versionId = await createOrReuseVersion();
    await db.update(assessments)
      .set({ normativeVersionId: versionId })
      .where(eq(assessments.id, id));
  } catch {
    // Non-fatal: assessment still created, just without version pinning
  }

  return NextResponse.json({ success: true, data: { id } }, { status: 201 });
}
