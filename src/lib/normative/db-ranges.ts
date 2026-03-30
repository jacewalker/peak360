import { db } from '@/lib/db';
import { eq, and, isNull } from 'drizzle-orm';
import type { TierRanges, NormativeRangeRow } from '@/types/normative';

const isPostgres = !!process.env.DATABASE_URL;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _schema: any;
function getSchema() {
  if (!_schema) {
    _schema = isPostgres ? require('@/lib/db/schema') : require('@/lib/db/schema-sqlite');
  }
  return _schema;
}

/**
 * Query a single normative range by testKey, gender, and ageGroup.
 * Returns the matching row's unit/note/tiers/severityWeight or null.
 */
export async function getDbStandards(
  testKey: string,
  gender?: string | null,
  ageGroup?: string | null
): Promise<{ unit: string | null; note: string | null; tiers: TierRanges | null; severityWeight: number | null } | null> {
  const schema = getSchema();
  const table = schema.normativeRanges;

  const conditions = [eq(table.testKey, testKey)];

  if (gender) {
    conditions.push(eq(table.gender, gender));
  } else {
    conditions.push(isNull(table.gender));
  }

  if (ageGroup) {
    conditions.push(eq(table.ageGroup, ageGroup));
  } else {
    conditions.push(isNull(table.ageGroup));
  }

  const rows = await db.select().from(table).where(and(...conditions)).limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    unit: row.unit ?? null,
    note: row.note ?? null,
    tiers: (row.tiers as TierRanges) ?? null,
    severityWeight: row.severityWeight ?? null,
  };
}

/**
 * Return all normative range rows from the database.
 */
export async function getAllDbRanges(): Promise<NormativeRangeRow[]> {
  const schema = getSchema();
  return db.select().from(schema.normativeRanges);
}

/**
 * Return all variants for a single test key.
 */
export async function getDbRangesByTestKey(testKey: string): Promise<NormativeRangeRow[]> {
  const schema = getSchema();
  return db.select().from(schema.normativeRanges).where(eq(schema.normativeRanges.testKey, testKey));
}

/**
 * Upsert a normative range row. If a row exists with the same testKey+gender+ageGroup,
 * update it; otherwise insert a new row. Returns the upserted row.
 */
export async function upsertDbRange(data: {
  testKey: string;
  category: string;
  gender?: string | null;
  ageGroup?: string | null;
  unit?: string | null;
  note?: string | null;
  tiers: TierRanges;
  severityWeight?: number | null;
}): Promise<NormativeRangeRow> {
  const schema = getSchema();
  const table = schema.normativeRanges;
  const now = new Date().toISOString();

  const conditions = [eq(table.testKey, data.testKey)];
  if (data.gender) {
    conditions.push(eq(table.gender, data.gender));
  } else {
    conditions.push(isNull(table.gender));
  }
  if (data.ageGroup) {
    conditions.push(eq(table.ageGroup, data.ageGroup));
  } else {
    conditions.push(isNull(table.ageGroup));
  }

  const existing = await db.select().from(table).where(and(...conditions)).limit(1);

  if (existing.length > 0) {
    await db
      .update(table)
      .set({
        category: data.category,
        unit: data.unit ?? null,
        note: data.note ?? null,
        tiers: data.tiers,
        severityWeight: data.severityWeight ?? null,
        updatedAt: now,
      })
      .where(eq(table.id, existing[0].id));

    const updated = await db.select().from(table).where(eq(table.id, existing[0].id)).limit(1);
    return updated[0] as NormativeRangeRow;
  }

  const inserted = await db
    .insert(table)
    .values({
      testKey: data.testKey,
      category: data.category,
      gender: data.gender ?? null,
      ageGroup: data.ageGroup ?? null,
      unit: data.unit ?? null,
      note: data.note ?? null,
      tiers: data.tiers,
      severityWeight: data.severityWeight ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return inserted[0] as NormativeRangeRow;
}

/**
 * Delete normative range rows matching testKey (and optionally gender/ageGroup).
 * Returns the number of deleted rows.
 */
export async function deleteDbRange(
  testKey: string,
  gender?: string | null,
  ageGroup?: string | null
): Promise<number> {
  const schema = getSchema();
  const table = schema.normativeRanges;

  const conditions = [eq(table.testKey, testKey)];

  if (gender !== undefined) {
    if (gender) {
      conditions.push(eq(table.gender, gender));
    } else {
      conditions.push(isNull(table.gender));
    }
  }

  if (ageGroup !== undefined) {
    if (ageGroup) {
      conditions.push(eq(table.ageGroup, ageGroup));
    } else {
      conditions.push(isNull(table.ageGroup));
    }
  }

  const result = await db.delete(table).where(and(...conditions)).returning();
  return result.length;
}

/**
 * Pre-load ALL normative ranges from the database into a lookup map keyed by testKey.
 * Call once before report generation to avoid N+1 queries.
 */
export type DbRangesMap = Map<string, Array<{
  unit: string | null;
  note: string | null;
  tiers: TierRanges | null;
  severityWeight: number | null;
  gender: string | null;
  ageGroup: string | null;
}>>;

export async function preloadDbRanges(): Promise<DbRangesMap> {
  const allRows = await getAllDbRanges();
  const map: DbRangesMap = new Map();

  for (const row of allRows) {
    const entries = map.get(row.testKey) || [];
    entries.push({
      unit: row.unit ?? null,
      note: row.note ?? null,
      tiers: (row.tiers as TierRanges) ?? null,
      severityWeight: row.severityWeight ?? null,
      gender: row.gender ?? null,
      ageGroup: row.ageGroup ?? null,
    });
    map.set(row.testKey, entries);
  }

  return map;
}
