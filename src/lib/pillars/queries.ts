import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import {
  pillarDefinitions,
  pillarPageCopy,
  pillarPrescriptions,
} from '@/lib/db/schema';
import type {
  PillarDefinition,
  PillarPageCopy,
  PillarPrescription,
  PillarKey,
} from '@/lib/pillars/types';

/**
 * Phase 8 — server-side reads for the pillar layer.
 * Imported by:
 *   - src/app/portal/assessment/[id]/report/page.tsx (Plan 03 wiring)
 *   - src/lib/report/load-report-data.ts (Plan 05 PDF data load)
 *   - src/app/portal/admin/pillars/page.tsx (Plan 04 admin SSR)
 *   - src/app/portal/admin/assessments/[id]/prescriptions/page.tsx (Plan 04)
 *
 * D-21 — All reads happen server-side; client components receive shapes
 * via props. No client-side fetches for these endpoints.
 */

export async function getPillarDefinitions(): Promise<PillarDefinition[]> {
  const rows = await db
    .select()
    .from(pillarDefinitions)
    .orderBy(pillarDefinitions.sortOrder);
  return rows.map((r: Record<string, unknown>) => ({
    pillarKey: r.pillarKey as PillarKey,
    label: r.label as string,
    shortSummary: r.shortSummary as string,
    plainMeaning: r.plainMeaning as string,
    sortOrder: r.sortOrder as number,
    updatedBy: r.updatedBy as string,
    updatedAt: r.updatedAt as number,
  }));
}

export async function getPillarPageCopy(): Promise<PillarPageCopy | null> {
  const rows = await db.select().from(pillarPageCopy).limit(1);
  const r = rows[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    heading: r.heading as string,
    intro: r.intro as string,
    updatedBy: r.updatedBy as string,
    updatedAt: r.updatedAt as number,
  };
}

export async function getPillarPrescriptions(
  assessmentId: string
): Promise<PillarPrescription[]> {
  const rows = await db
    .select()
    .from(pillarPrescriptions)
    .where(eq(pillarPrescriptions.assessmentId, assessmentId));
  return rows.map((r: Record<string, unknown>) => ({
    pillarKey: r.pillarKey as PillarKey,
    summary: r.summary as string,
    bullets: (r.bullets as string[] | null) ?? null,
    fullPlanHref: (r.fullPlanHref as string | null) ?? null,
    updatedBy: r.updatedBy
      ? { id: r.updatedBy as string }
      : undefined,
    updatedAt: r.updatedAt as number | undefined,
  }));
}
