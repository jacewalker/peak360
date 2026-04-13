import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { runBackup } from '@/lib/backup';
import path from 'path';

export async function POST() {
  const [, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  // Only available for SQLite
  if (process.env.DATABASE_URL) {
    return NextResponse.json(
      { success: false, error: 'Manual backup only available for SQLite databases' },
      { status: 400 }
    );
  }

  try {
    const dest = await runBackup();
    return NextResponse.json({
      success: true,
      data: { filename: path.basename(dest) },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Backup failed' },
      { status: 500 }
    );
  }
}
