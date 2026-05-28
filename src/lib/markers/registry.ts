import { REPORT_MARKERS, type MarkerDef } from '@/lib/report-markers';
import { getAllMarkers, type MarkerRow } from '@/lib/markers/queries';
import type { PillarKey } from '@/lib/pillars/types';

/**
 * Phase 12 - Admin-managed marker registry (D-01).
 *
 * Merges the seeded REPORT_MARKERS array (canonical, ~98 markers) with the
 * DB-driven `markers` table. DB rows win on testKey conflict.
 *
 * Output ordering:
 *   - Seeded markers first (in REPORT_MARKERS source order), skipping any
 *     testKeys also present in the DB.
 *   - DB rows after, in createdAt ascending order (guaranteed by
 *     getAllMarkers() in src/lib/markers/queries.ts).
 *
 * Implementation note (per CONTEXT "Claude's Discretion" + PATTERNS):
 *   No memoization for v1. The merge is cheap (~100 rows + one DB read) and
 *   matches the async-no-cache pattern used by loadReportData / Section11.
 */

export type RegistryMarker = MarkerDef & {
  pillar?: PillarKey;            // present only on DB rows (D-07)
  source: 'seed' | 'db';
  aiAliases?: string[] | null;
  severityWeight?: number | null;
  createdAt?: number;
  updatedAt?: number;
};

function fromDbRow(r: MarkerRow): RegistryMarker {
  return {
    testKey: r.testKey,
    label: r.label,
    section: r.section,
    dataKey: r.dataKey,
    category: r.category,
    subcategory: r.subcategory ?? undefined,
    fallbackUnit: r.fallbackUnit ?? undefined,
    hasNorms: r.hasNorms,
    pillar: r.pillar,
    source: 'db',
    aiAliases: r.aiAliases,
    severityWeight: r.severityWeight,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function getReportMarkers(): Promise<RegistryMarker[]> {
  const dbRows = await getAllMarkers();
  const dbKeys = new Set(dbRows.map((r) => r.testKey));

  const merged: RegistryMarker[] = [];

  // Seed first, skipping any testKeys overridden by DB rows (DB wins).
  for (const m of REPORT_MARKERS) {
    if (dbKeys.has(m.testKey)) continue;
    merged.push({ ...m, source: 'seed' });
  }

  // DB rows last, in the order returned by getAllMarkers (createdAt asc).
  for (const r of dbRows) {
    merged.push(fromDbRow(r));
  }

  return merged;
}
