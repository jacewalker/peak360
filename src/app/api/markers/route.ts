import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth-helpers';
import { getReportMarkers } from '@/lib/markers/registry';

/**
 * Phase 12 - Admin-managed marker registry (D-14).
 *
 * Client-readable list of the merged marker registry (seed REPORT_MARKERS
 * + DB markers; DB wins on testKey collision). Used by:
 *   - CustomMarkersBlock (Section1-10 coach input UI - Plan 12-04)
 *   - Section11 to render pillar groupings without re-importing REPORT_MARKERS
 *
 * Gated by requireSession (any authenticated role - admin, coach, or
 * client). Read-only; no audit. Writes go through /api/admin/markers.
 */
export async function GET() {
  const [, errorRes] = await requireSession();
  if (errorRes) return errorRes;

  try {
    const markers = await getReportMarkers();
    return NextResponse.json({ success: true, data: { markers } });
  } catch (err) {
    console.error('[api/markers GET] Failed to load markers:', err);
    return NextResponse.json(
      { success: false, error: 'Could not load markers.' },
      { status: 500 }
    );
  }
}
