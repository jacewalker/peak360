import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assessments } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';

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

  return NextResponse.json({ success: true, data: { id } }, { status: 201 });
}
