import crypto from 'crypto';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { getAllDbRanges } from '@/lib/normative/db-ranges';
import { normativeData } from '@/lib/normative/data';
import type { NormativeVersionSnapshot, NormativeVersionMarker, NormativeVersionVariant, TierRanges, RatingTier } from '@/types/normative';

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
 * Extract tier ranges from a marker object that may have extra keys (unit, note, etc.).
 */
function extractTiers(obj: Record<string, unknown>): TierRanges {
  const tiers: RatingTier[] = ['poor', 'cautious', 'normal', 'great', 'elite'];
  const result: Record<string, { min: number; max: number }> = {};
  for (const tier of tiers) {
    const range = obj[tier] as { min: number; max: number } | undefined;
    if (range) {
      result[tier] = { min: range.min, max: range.max };
    }
  }
  return result as TierRanges;
}

/**
 * Merge hardcoded normativeData with any DB overrides into a single
 * NormativeVersionSnapshot (the format stored in normative_versions.ranges_json).
 */
export async function mergeDbWithHardcoded(): Promise<NormativeVersionSnapshot> {
  const snapshot: NormativeVersionSnapshot = {};

  // Process hardcoded data by category
  const categories: Array<{ name: string; data: Record<string, unknown> }> = [
    { name: 'blood_tests', data: normativeData.blood_tests },
    { name: 'body_comp', data: normativeData.body_comp as unknown as Record<string, unknown> },
    { name: 'fitness', data: normativeData.fitness as unknown as Record<string, unknown> },
    { name: 'strength', data: normativeData.strength },
    { name: 'mobility', data: normativeData.mobility },
  ];

  for (const cat of categories) {
    for (const [testKey, markerData] of Object.entries(cat.data)) {
      const marker = markerData as Record<string, unknown>;
      const versionMarker: NormativeVersionMarker = {
        unit: (marker.unit as string) ?? null,
        note: (marker.note as string) ?? null,
        severityWeight: null,
        variants: [],
      };

      // Check if gendered (has male/female keys)
      if ('male' in marker && 'female' in marker) {
        for (const gender of ['male', 'female']) {
          const genderData = marker[gender] as Record<string, unknown>;

          // Check if age-bucketed (keys like '20-39', '18-25', '66+')
          const ageGroups = Object.keys(genderData).filter(k =>
            /^\d{2}-\d{2}$|^\d{2}\+$/.test(k)
          );

          if (ageGroups.length > 0) {
            // Age-bucketed + gendered
            for (const ageGroup of ageGroups) {
              const tiers = genderData[ageGroup] as TierRanges;
              versionMarker.variants.push({
                gender,
                ageGroup,
                tiers,
              });
            }
          } else {
            // Gendered but not age-bucketed
            versionMarker.variants.push({
              gender,
              ageGroup: null,
              tiers: genderData as unknown as TierRanges,
            });
          }
        }
      } else {
        // Simple (unisex, no age buckets)
        versionMarker.variants.push({
          gender: null,
          ageGroup: null,
          tiers: extractTiers(marker),
        });
      }

      snapshot[testKey] = versionMarker;
    }
  }

  // Overlay DB ranges on top
  const dbRows = await getAllDbRanges();
  for (const row of dbRows) {
    if (!snapshot[row.testKey]) {
      // New marker from DB that doesn't exist in hardcoded
      snapshot[row.testKey] = {
        unit: row.unit ?? null,
        note: row.note ?? null,
        severityWeight: row.severityWeight ?? null,
        variants: [],
      };
    }

    const existing = snapshot[row.testKey];
    // Update unit/note/severityWeight from DB if provided
    if (row.unit != null) existing.unit = row.unit;
    if (row.note != null) existing.note = row.note;
    if (row.severityWeight != null) existing.severityWeight = row.severityWeight;

    if (row.tiers) {
      const dbVariant: NormativeVersionVariant = {
        gender: row.gender ?? null,
        ageGroup: row.ageGroup ?? null,
        tiers: row.tiers as TierRanges,
      };

      // Replace matching variant or add new one
      const idx = existing.variants.findIndex(
        v => v.gender === dbVariant.gender && v.ageGroup === dbVariant.ageGroup
      );
      if (idx >= 0) {
        existing.variants[idx] = dbVariant;
      } else {
        existing.variants.push(dbVariant);
      }
    }
  }

  return snapshot;
}

/**
 * Compute a deterministic SHA-256 hash from a JSON string.
 */
export function computeContentHash(mergedJson: string): string {
  return crypto.createHash('sha256').update(mergedJson).digest('hex');
}

/**
 * Sort object keys recursively for deterministic JSON serialization.
 */
function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * Create a new normative version snapshot, or reuse an existing one if the
 * content hash matches (deduplication). Returns the version ID.
 */
export async function createOrReuseVersion(): Promise<string> {
  const merged = await mergeDbWithHardcoded();
  const sorted = sortObjectKeys(merged);
  const mergedJson = JSON.stringify(sorted);
  const contentHash = computeContentHash(mergedJson);

  const schema = getSchema();
  const table = schema.normativeVersions;

  // Check for existing version with same hash
  const existing = await db
    .select()
    .from(table)
    .where(eq(table.contentHash, contentHash))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id as string;
  }

  // Create new version
  const id = uuidv4();
  await db.insert(table).values({
    id,
    rangesJson: sorted,
    contentHash,
    createdAt: new Date().toISOString(),
  });

  return id;
}

/**
 * Retrieve a version snapshot by ID. Returns the parsed ranges JSON
 * or null if not found.
 */
export async function getVersionSnapshot(versionId: string): Promise<NormativeVersionSnapshot | null> {
  const schema = getSchema();
  const table = schema.normativeVersions;

  const rows = await db
    .select()
    .from(table)
    .where(eq(table.id, versionId))
    .limit(1);

  if (rows.length === 0) return null;

  const rangesJson = rows[0].rangesJson;
  if (!rangesJson) return null;

  // rangesJson may already be parsed (JSON mode) or a string
  if (typeof rangesJson === 'string') {
    return JSON.parse(rangesJson) as NormativeVersionSnapshot;
  }
  return rangesJson as NormativeVersionSnapshot;
}
