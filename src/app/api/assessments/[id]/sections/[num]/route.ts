import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assessmentSections, assessments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireSession } from '@/lib/auth-helpers';
import { encrypt, decrypt } from '@/lib/crypto';

const ENCRYPTED_SECTIONS = new Set([3, 4, 5]);

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; num: string }> }
) {
  const [session, errorRes] = await requireSession();
  if (errorRes) return errorRes;

  const { id, num } = await params;
  const sectionNum = parseInt(num);

  // Verify access to parent assessment
  const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
  if (!assessment) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  if (!hasAccess(session.user.role, session.user.id, assessment)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [row] = await db
    .select()
    .from(assessmentSections)
    .where(
      and(
        eq(assessmentSections.assessmentId, id),
        eq(assessmentSections.sectionNumber, sectionNum)
      )
    );

  let data: unknown = row?.data ?? null;
  if (data && typeof data === 'string') {
    const raw = ENCRYPTED_SECTIONS.has(sectionNum) ? decrypt(data) : data;
    try { data = JSON.parse(raw); } catch { data = raw; }
  }

  return NextResponse.json({ success: true, data });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; num: string }> }
) {
  const [session, errorRes] = await requireSession();
  if (errorRes) return errorRes;

  // Clients are strictly read-only - cannot write section data
  if (session.user.role === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, num } = await params;
  const sectionNum = parseInt(num);

  // Verify access to parent assessment (coach must own it, admin can edit any)
  const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
  if (!assessment) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  if (!hasAccess(session.user.role, session.user.id, assessment)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const now = new Date().toISOString();
  const serialized = JSON.stringify(body.data);
  const dataToStore = ENCRYPTED_SECTIONS.has(sectionNum)
    ? encrypt(serialized)
    : serialized;

  const [existing] = await db
    .select()
    .from(assessmentSections)
    .where(
      and(
        eq(assessmentSections.assessmentId, id),
        eq(assessmentSections.sectionNumber, sectionNum)
      )
    );

  if (existing) {
    await db
      .update(assessmentSections)
      .set({
        data: dataToStore,
        completedAt: body.completed === true ? now : body.completed === false ? null : existing.completedAt,
      })
      .where(eq(assessmentSections.id, existing.id));
  } else {
    await db.insert(assessmentSections).values({
      assessmentId: id,
      sectionNumber: sectionNum,
      data: dataToStore,
      completedAt: body.completed ? now : null,
    });
  }

  // Update the assessment's current section and timestamp
  const updatePayload: Record<string, unknown> = { currentSection: sectionNum, updatedAt: now };

  // Sync client info from section 1 to assessment record
  if (sectionNum === 1 && body.data) {
    const d = body.data as Record<string, unknown>;
    if (d.clientName) updatePayload.clientName = d.clientName;
    if (d.clientEmail) updatePayload.clientEmail = d.clientEmail;
    if (d.clientDOB) updatePayload.clientDob = d.clientDOB;
    if (d.clientGender) updatePayload.clientGender = d.clientGender;
    if (d.assessmentDate) updatePayload.assessmentDate = d.assessmentDate;
  }

  await db
    .update(assessments)
    .set(updatePayload)
    .where(eq(assessments.id, id));

  return NextResponse.json({ success: true });
}
