import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assessmentSections, assessments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; num: string }> }
) {
  const { id, num } = await params;
  const sectionNum = parseInt(num);

  const [row] = await db
    .select()
    .from(assessmentSections)
    .where(
      and(
        eq(assessmentSections.assessmentId, id),
        eq(assessmentSections.sectionNumber, sectionNum)
      )
    );

  return NextResponse.json({ success: true, data: row?.data || null });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; num: string }> }
) {
  const { id, num } = await params;
  const sectionNum = parseInt(num);
  const body = await request.json();
  const now = new Date().toISOString();

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
        data: body.data,
        completedAt: body.completed === true ? now : body.completed === false ? null : existing.completedAt,
      })
      .where(eq(assessmentSections.id, existing.id));
  } else {
    await db.insert(assessmentSections).values({
      assessmentId: id,
      sectionNumber: sectionNum,
      data: body.data,
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
