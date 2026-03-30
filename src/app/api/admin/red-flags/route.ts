import { NextResponse } from 'next/server';
import { getAllDbRanges } from '@/lib/normative/db-ranges';
import { REPORT_MARKERS } from '@/lib/report-markers';

export async function GET() {
  try {
    const allRows = await getAllDbRanges();

    const redFlags = allRows
      .filter((row) => row.severityWeight !== null && Number(row.severityWeight) > 0)
      .map((row) => {
        const markerDef = REPORT_MARKERS.find((m) => m.testKey === row.testKey);
        return {
          testKey: row.testKey,
          severityWeight: row.severityWeight,
          label: markerDef?.label ?? row.testKey,
        };
      });

    return NextResponse.json({
      success: true,
      data: redFlags,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to load red flag data' },
      { status: 500 }
    );
  }
}
