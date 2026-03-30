import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { desc } from 'drizzle-orm';

const isPostgres = !!process.env.DATABASE_URL;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _schema: any;
function getSchema() {
  if (!_schema) {
    _schema = isPostgres ? require('@/lib/db/schema') : require('@/lib/db/schema-sqlite');
  }
  return _schema;
}

export async function GET() {
  try {
    const schema = getSchema();
    const table = schema.normativeVersions;

    const rows = await db
      .select({
        id: table.id,
        contentHash: table.contentHash,
        createdAt: table.createdAt,
      })
      .from(table)
      .orderBy(desc(table.createdAt));

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch normative versions' },
      { status: 500 }
    );
  }
}
