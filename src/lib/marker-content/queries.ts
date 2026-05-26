import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { markerContent } from '@/lib/db/schema';
import type { RatingTier } from '@/types/normative';

/**
 * Phase 11 — server-side reads for the marker-content layer (D-07, D-12).
 *
 * Mirrors src/lib/pillars/queries.ts (global admin-authored content). One row
 * per REPORT_MARKERS testKey. Definition + impact are gender-neutral (D-04);
 * coachInsights is a 5-tier x {male,female} matrix (D-05). Imported by the
 * client-readable GET /api/marker-content endpoint and the admin routes.
 */

export interface MarkerContent {
  testKey: string;
  definition: string | null;
  impact: string | null;
  coachInsights:
    | Record<RatingTier, { male: string | null; female: string | null }>
    | null;
  updatedBy: string | null;
  updatedAt: number; // epoch ms
}

export async function getAllMarkerContent(): Promise<MarkerContent[]> {
  const rows = await db.select().from(markerContent);
  return rows.map((r: Record<string, unknown>) => ({
    testKey: r.testKey as string,
    definition: (r.definition as string | null) ?? null,
    impact: (r.impact as string | null) ?? null,
    coachInsights:
      (r.coachInsights as MarkerContent['coachInsights']) ?? null,
    updatedBy: (r.updatedBy as string | null) ?? null,
    updatedAt: r.updatedAt as number,
  }));
}

export async function getMarkerContentByKey(
  testKey: string
): Promise<MarkerContent | null> {
  const rows = await db
    .select()
    .from(markerContent)
    .where(eq(markerContent.testKey, testKey));
  const r = rows[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    testKey: r.testKey as string,
    definition: (r.definition as string | null) ?? null,
    impact: (r.impact as string | null) ?? null,
    coachInsights:
      (r.coachInsights as MarkerContent['coachInsights']) ?? null,
    updatedBy: (r.updatedBy as string | null) ?? null,
    updatedAt: r.updatedAt as number,
  };
}
