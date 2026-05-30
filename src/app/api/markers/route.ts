import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth-helpers';
import { getReportMarkers } from '@/lib/markers/registry';
import { getAllDbRanges } from '@/lib/normative/db-ranges';
import { db, runMigrations } from '@/lib/db';
import { markerContent } from '@/lib/db/schema';
import { hasAuthoredContent } from '@/app/api/admin/marker-content/route';

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
 *
 * Quick 260529-mwp: optional `?include=stats`. When the caller is an admin,
 * the response additionally carries `normsKeys` (testKeys with a DB normative
 * override) and `contentKeys` (testKeys with authored marker content) so the
 * admin markers page can compute registry analytics in one round trip. For
 * non-admin callers the stats fields are silently omitted - the base contract
 * { success, data: { markers } } stays unchanged for CustomMarkersBlock and
 * Section11, and no 403 is raised (preserves the any-authenticated read).
 */
export async function GET(request: Request) {
  const [session, errorRes] = await requireSession();
  if (errorRes) return errorRes;

  try {
    const markers = await getReportMarkers();

    const includeStats =
      new URL(request.url).searchParams.get('include') === 'stats';

    if (includeStats && session.user.role === 'admin') {
      await runMigrations();

      const ranges = await getAllDbRanges();
      const normsKeys = [...new Set(ranges.map((r) => r.testKey))];

      const contentRows = await db.select().from(markerContent);
      const contentKeys = (contentRows as Record<string, unknown>[])
        .filter(hasAuthoredContent)
        .map((r) => r.testKey as string);

      // Per-marker "last updated" = the most recent edit across its DB
      // normative ranges (updatedAt is an ISO string) and its authored content
      // (updatedAt is epoch-ms). Markers never edited in the DB are absent from
      // the map; the list renders "Not edited yet" for them.
      const updatedAt: Record<string, string> = {};
      const bump = (key: string, iso: string) => {
        if (!updatedAt[key] || iso > updatedAt[key]) updatedAt[key] = iso;
      };
      for (const r of ranges) {
        if (r.testKey && r.updatedAt) bump(r.testKey, String(r.updatedAt));
      }
      for (const row of contentRows as Record<string, unknown>[]) {
        const key = row.testKey as string | undefined;
        const ts = row.updatedAt as number | string | undefined;
        if (!key || ts == null) continue;
        const iso =
          typeof ts === 'number' ? new Date(ts).toISOString() : String(ts);
        bump(key, iso);
      }

      return NextResponse.json({
        success: true,
        data: { markers, normsKeys, contentKeys, updatedAt },
      });
    }

    return NextResponse.json({ success: true, data: { markers } });
  } catch (err) {
    console.error('[api/markers GET] Failed to load markers:', err);
    return NextResponse.json(
      { success: false, error: 'Could not load markers.' },
      { status: 500 }
    );
  }
}
