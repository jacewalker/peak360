import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assessments } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { createOrReuseVersion } from '@/lib/normative/versioning';

export async function GET() {
  const rows = await db.select().from(assessments).orderBy(desc(assessments.updatedAt));
  return NextResponse.json({ success: true, data: rows });
}

export async function POST(request: Request) {
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
