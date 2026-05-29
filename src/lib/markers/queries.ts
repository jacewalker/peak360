import { db } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';
import { markers, markerContent, normativeRanges } from '@/lib/db/schema';
import type { PillarKey } from '@/lib/pillars/types';

/**
 * Phase 12 - Admin-managed marker registry (D-01, D-02, D-13).
 *
 * Server-side CRUD for the DB-driven markers table. The hardcoded
 * REPORT_MARKERS array in src/lib/report-markers.ts is the seed baseline;
 * this table only stores admin-added markers. The merge happens at read
 * time in src/lib/markers/registry.ts via getReportMarkers().
 *
 * Pattern mirrors src/lib/marker-content/queries.ts (same role, same shape:
 * defensive Record<string, unknown> row coercion, typed return shapes,
 * null-safe coalescing).
 *
 * Imports come from the Postgres schema; Drizzle's SQLite-on-PG-schema
 * compatibility mode handles dev SQLite at runtime (the codebase already
 * relies on this pattern in marker-content/queries.ts).
 */

export interface MarkerRow {
  testKey: string;
  label: string;
  section: number;             // 1..10
  dataKey: string;             // camelCase, written to sectionData JSON
  pillar: PillarKey;           // one of PILLAR_KEYS
  category: string;
  subcategory: string | null;
  fallbackUnit: string | null;
  hasNorms: boolean;
  aiAliases: string[] | null;
  severityWeight: number | null;
  createdBy: string;
  createdAt: number;           // epoch ms
  updatedBy: string;
  updatedAt: number;           // epoch ms
}

/**
 * Thrown by updateMarker when the caller-supplied updatedAt is older than
 * the current DB row's updatedAt. Routes catch this and translate it to a
 * 409 Conflict response.
 */
export class OptimisticConflictError extends Error {
  constructor(message = 'This marker was updated by another admin. Reload to see their changes before saving.') {
    super(message);
    this.name = 'OptimisticConflictError';
  }
}

function coerce(r: Record<string, unknown>): MarkerRow {
  return {
    testKey: r.testKey as string,
    label: r.label as string,
    section: r.section as number,
    dataKey: r.dataKey as string,
    pillar: r.pillar as PillarKey,
    category: r.category as string,
    subcategory: (r.subcategory as string | null) ?? null,
    fallbackUnit: (r.fallbackUnit as string | null) ?? null,
    hasNorms: Boolean(r.hasNorms),
    aiAliases: (r.aiAliases as string[] | null) ?? null,
    severityWeight: (r.severityWeight as number | null) ?? null,
    createdBy: r.createdBy as string,
    createdAt: r.createdAt as number,
    updatedBy: r.updatedBy as string,
    updatedAt: r.updatedAt as number,
  };
}

export async function getAllMarkers(): Promise<MarkerRow[]> {
  const rows = await db.select().from(markers).orderBy(asc(markers.createdAt));
  return rows.map((r: Record<string, unknown>) => coerce(r));
}

export async function getMarkerByTestKey(testKey: string): Promise<MarkerRow | null> {
  const rows = await db.select().from(markers).where(eq(markers.testKey, testKey));
  const r = rows[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  return coerce(r);
}

export type CreateMarkerInput = Omit<MarkerRow, 'createdAt' | 'updatedAt'>;

export async function createMarker(input: CreateMarkerInput): Promise<MarkerRow> {
  const now = Date.now();
  await db.insert(markers).values({
    testKey: input.testKey,
    label: input.label,
    section: input.section,
    dataKey: input.dataKey,
    pillar: input.pillar,
    category: input.category,
    subcategory: input.subcategory,
    fallbackUnit: input.fallbackUnit,
    hasNorms: input.hasNorms,
    aiAliases: input.aiAliases,
    severityWeight: input.severityWeight,
    createdBy: input.createdBy,
    createdAt: now,
    updatedBy: input.updatedBy,
    updatedAt: now,
  });
  const fresh = await getMarkerByTestKey(input.testKey);
  if (!fresh) {
    throw new Error(`createMarker: row not found after insert (testKey=${input.testKey})`);
  }
  return fresh;
}

export type UpdateMarkerInput = Partial<
  Omit<MarkerRow, 'testKey' | 'createdBy' | 'createdAt' | 'updatedAt'>
> & {
  updatedBy: string;
};

export async function updateMarker(
  testKey: string,
  input: UpdateMarkerInput,
  sentUpdatedAt: number
): Promise<MarkerRow> {
  const current = await getMarkerByTestKey(testKey);
  if (!current) {
    throw new Error(`updateMarker: marker not found (testKey=${testKey})`);
  }
  if (current.updatedAt > sentUpdatedAt) {
    throw new OptimisticConflictError();
  }
  const now = Date.now();
  // Build set only with provided fields to avoid nulling unrelated columns
  const set: Record<string, unknown> = { updatedBy: input.updatedBy, updatedAt: now };
  if (input.label !== undefined) set.label = input.label;
  if (input.section !== undefined) set.section = input.section;
  if (input.dataKey !== undefined) set.dataKey = input.dataKey;
  if (input.pillar !== undefined) set.pillar = input.pillar;
  if (input.category !== undefined) set.category = input.category;
  if (input.subcategory !== undefined) set.subcategory = input.subcategory;
  if (input.fallbackUnit !== undefined) set.fallbackUnit = input.fallbackUnit;
  if (input.hasNorms !== undefined) set.hasNorms = input.hasNorms;
  if (input.aiAliases !== undefined) set.aiAliases = input.aiAliases;
  if (input.severityWeight !== undefined) set.severityWeight = input.severityWeight;

  await db.update(markers).set(set).where(eq(markers.testKey, testKey));
  const fresh = await getMarkerByTestKey(testKey);
  if (!fresh) {
    throw new Error(`updateMarker: row not found after update (testKey=${testKey})`);
  }
  return fresh;
}

export interface DeleteMarkerResult {
  deletedMarker: number;
  deletedContent: number;
  deletedRanges: number;
}

/**
 * Cascade delete a marker. Sequence:
 *   1. normative_ranges where test_key matches (clear all tier-range variants)
 *   2. marker_content where test_key matches (clear authored definition/impact)
 *   3. markers row itself
 *
 * No transaction (the codebase does not use real txns for cross-table writes;
 * mirrors the deleteDbRange + marker_content delete sequence used elsewhere).
 * Returns counts (best-effort: when the driver doesn't expose rowsAffected we
 * fall back to 0 for that step rather than guessing).
 */
export async function deleteMarker(testKey: string): Promise<DeleteMarkerResult> {
  let deletedRanges = 0;
  let deletedContent = 0;
  let deletedMarker = 0;

  const ranges = await db
    .delete(normativeRanges)
    .where(eq(normativeRanges.testKey, testKey))
    .returning({ id: normativeRanges.id })
    .catch(() => [] as Array<{ id: number }>);
  deletedRanges = Array.isArray(ranges) ? ranges.length : 0;

  const content = await db
    .delete(markerContent)
    .where(eq(markerContent.testKey, testKey))
    .returning({ testKey: markerContent.testKey })
    .catch(() => [] as Array<{ testKey: string }>);
  deletedContent = Array.isArray(content) ? content.length : 0;

  const m = await db
    .delete(markers)
    .where(eq(markers.testKey, testKey))
    .returning({ testKey: markers.testKey })
    .catch(() => [] as Array<{ testKey: string }>);
  deletedMarker = Array.isArray(m) ? m.length : 0;

  return { deletedMarker, deletedContent, deletedRanges };
}
