import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assessments, assessmentSections } from '@/lib/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select().from(assessments).where(eq(assessments.id, id));
  if (!row) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

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
  const { id } = await params;
  const body = await request.json();
  const now = new Date().toISOString();

  await db
    .update(assessments)
    .set({ ...body, updatedAt: now })
    .where(eq(assessments.id, id));

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(assessments).where(eq(assessments.id, id));
  return NextResponse.json({ success: true });
}
