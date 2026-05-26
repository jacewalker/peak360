import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assessments, user } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { createOrReuseVersion } from '@/lib/normative/versioning';
import { requireSession } from '@/lib/auth-helpers';
import { applyClientLink } from '@/lib/clients/link';

export async function GET() {
  const [session, errorRes] = await requireSession();
  if (errorRes) return errorRes;

  let rows;
  if (session.user.role === 'admin') {
    // Admin sees all assessments (including legacy with null coach_id)
    rows = await db
      .select({
        id: assessments.id,
        clientName: assessments.clientName,
        clientEmail: assessments.clientEmail,
        clientDob: assessments.clientDob,
        clientGender: assessments.clientGender,
        assessmentDate: assessments.assessmentDate,
        currentSection: assessments.currentSection,
        status: assessments.status,
        coachId: assessments.coachId,
        clientId: assessments.clientId,
        normativeVersionId: assessments.normativeVersionId,
        createdAt: assessments.createdAt,
        updatedAt: assessments.updatedAt,
        coachName: user.name,
      })
      .from(assessments)
      .leftJoin(user, eq(assessments.coachId, user.id))
      .orderBy(desc(assessments.updatedAt));
  } else if (session.user.role === 'coach') {
    // Coach sees only their own assessments
    rows = await db
      .select({
        id: assessments.id,
        clientName: assessments.clientName,
        clientEmail: assessments.clientEmail,
        clientDob: assessments.clientDob,
        clientGender: assessments.clientGender,
        assessmentDate: assessments.assessmentDate,
        currentSection: assessments.currentSection,
        status: assessments.status,
        coachId: assessments.coachId,
        clientId: assessments.clientId,
        normativeVersionId: assessments.normativeVersionId,
        createdAt: assessments.createdAt,
        updatedAt: assessments.updatedAt,
        coachName: user.name,
      })
      .from(assessments)
      .leftJoin(user, eq(assessments.coachId, user.id))
      .where(eq(assessments.coachId, session.user.id))
      .orderBy(desc(assessments.updatedAt));
  } else {
    // Client sees only assessments assigned to them
    rows = await db
      .select({
        id: assessments.id,
        clientName: assessments.clientName,
        clientEmail: assessments.clientEmail,
        clientDob: assessments.clientDob,
        clientGender: assessments.clientGender,
        assessmentDate: assessments.assessmentDate,
        currentSection: assessments.currentSection,
        status: assessments.status,
        coachId: assessments.coachId,
        clientId: assessments.clientId,
        normativeVersionId: assessments.normativeVersionId,
        createdAt: assessments.createdAt,
        updatedAt: assessments.updatedAt,
        coachName: user.name,
      })
      .from(assessments)
      .leftJoin(user, eq(assessments.coachId, user.id))
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

  // Set client_id at create time when the new assessment carries a client
  // name/email. The auto-created client inherits this coach. Not wrapped in
  // try/catch — a failed link should surface as a 500 so it's visible.
  if (body.clientName || body.clientEmail) {
    await applyClientLink(id, {
      clientName: body.clientName,
      clientEmail: body.clientEmail,
      coachId: session.user.id,
    });
  }

  return NextResponse.json({ success: true, data: { id } }, { status: 201 });
}
