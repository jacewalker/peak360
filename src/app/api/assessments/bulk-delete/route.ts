import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assessments } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ids = body?.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids must be a non-empty array' },
        { status: 400 }
      );
    }

    await db.delete(assessments).where(inArray(assessments.id, ids));

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
