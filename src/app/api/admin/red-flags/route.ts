import { NextResponse } from 'next/server';
import { getAllDbRanges } from '@/lib/normative/db-ranges';
import { getReportMarkers } from '@/lib/markers/registry';

export async function GET() {
  try {
    const allRows = await getAllDbRanges();
    // Phase 12 D-13 - use the merged registry so DB-marker testKeys resolve
    // their label (seeded-only lookup would leave admin-added markers nameless).
    const reportMarkers = await getReportMarkers();

    const redFlags = allRows
      .filter((row) => row.severityWeight !== null && Number(row.severityWeight) > 0)
      .map((row) => {
        const markerDef = reportMarkers.find((m) => m.testKey === row.testKey);
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
