import { NextResponse } from 'next/server';
import { runMigrations } from '@/lib/db';
import { exportCsv } from '@/lib/csv/export';

export async function GET() {
  await runMigrations();

  const csv = await exportCsv();
  const date = new Date().toISOString().split('T')[0];

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="peak360-export-${date}.csv"`,
    },
  });
}
