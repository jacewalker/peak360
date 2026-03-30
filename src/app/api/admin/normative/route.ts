import { NextResponse } from 'next/server';
import { getAllDbRanges } from '@/lib/normative/db-ranges';

export async function GET() {
  try {
    const rows = await getAllDbRanges();
    const overrideKeySet = new Set(rows.map((r) => r.testKey));

    return NextResponse.json({
      success: true,
      data: {
        dbOverrides: rows,
        overrideKeys: [...overrideKeySet],
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not load normative data. Refresh the page to try again.' },
      { status: 500 }
    );
  }
}
