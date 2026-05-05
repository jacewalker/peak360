import { NextResponse } from 'next/server';
import { runMigrations } from '@/lib/db';
import { importCsv } from '@/lib/csv/import';
import { requireAdmin } from '@/lib/auth-helpers';

export async function POST(request: Request) {
  const [, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  await runMigrations();

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
  }

  const text = await file.text();
  const result = await importCsv(text);

  return NextResponse.json({ success: true, data: result });
}
