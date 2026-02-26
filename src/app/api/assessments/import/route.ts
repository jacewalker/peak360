import { NextResponse } from 'next/server';
import { runMigrations } from '@/lib/db';
import { importCsv } from '@/lib/csv/import';

export async function POST(request: Request) {
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
