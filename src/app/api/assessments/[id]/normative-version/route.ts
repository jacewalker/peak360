import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getVersionSnapshot, mergeDbWithHardcoded } from '@/lib/normative/versioning';

const isPostgres = !!process.env.DATABASE_URL;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _schema: any;
function getSchema() {
  if (!_schema) {
    _schema = isPostgres ? require('@/lib/db/schema') : require('@/lib/db/schema-sqlite');
  }
  return _schema;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const schema = getSchema();

    const rows = await db
      .select({ normativeVersionId: schema.assessments.normativeVersionId })
      .from(schema.assessments)
      .where(eq(schema.assessments.id, id))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assessment not found' },
        { status: 404 }
      );
    }

    const versionId = rows[0].normativeVersionId;

    if (!versionId) {
      // Old assessment without version pinning — build live snapshot from current DB overrides + hardcoded
      const liveSnapshot = await mergeDbWithHardcoded();
      return NextResponse.json({ success: true, data: liveSnapshot });
    }

    const snapshot = await getVersionSnapshot(versionId);
    return NextResponse.json({ success: true, data: snapshot });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch normative version' },
      { status: 500 }
    );
  }
}
