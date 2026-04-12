import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assessmentSections, assessments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { encrypt, decrypt } from '@/lib/crypto';

const ENCRYPTED_SECTIONS = new Set([3, 4, 5]);

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
  const { id, num } = await params;
  const sectionNum = parseInt(num);
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
