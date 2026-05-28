import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MarkerRow } from '@/lib/markers/queries';

// Mock the DB query layer so this test stays pure (no live DB).
vi.mock('@/lib/markers/queries', () => ({
  getAllMarkers: vi.fn(),
}));

import { getAllMarkers } from '@/lib/markers/queries';
import { getReportMarkers } from '@/lib/markers/registry';
import { REPORT_MARKERS } from '@/lib/report-markers';

const mockedGetAllMarkers = vi.mocked(getAllMarkers);

function dbMarker(overrides: Partial<MarkerRow>): MarkerRow {
  return {
    testKey: 'custom_marker',
    label: 'Custom Marker',
    section: 5,
    dataKey: 'customMarker',
    pillar: 'cardiometabolic',
    category: 'Blood Tests & Biomarkers',
    subcategory: null,
    fallbackUnit: null,
    hasNorms: true,
    aiAliases: null,
    severityWeight: null,
    createdBy: 'admin-1',
    createdAt: 1000,
    updatedBy: 'admin-1',
    updatedAt: 1000,
    ...overrides,
  };
}

describe('getReportMarkers (Phase 12 D-01)', () => {
  beforeEach(() => {
    mockedGetAllMarkers.mockReset();
  });

  it('returns all REPORT_MARKERS with source="seed" when DB has zero rows', async () => {
    mockedGetAllMarkers.mockResolvedValueOnce([]);
    const merged = await getReportMarkers();
    expect(merged).toHaveLength(REPORT_MARKERS.length);
    for (const m of merged) {
      expect(m.source).toBe('seed');
    }
    // Order preserved
    expect(merged[0].testKey).toBe(REPORT_MARKERS[0].testKey);
  });

  it('returns seed + DB rows when testKeys do not collide', async () => {
    const db = [dbMarker({ testKey: 'new_marker_a', createdAt: 1000 })];
    mockedGetAllMarkers.mockResolvedValueOnce(db);
    const merged = await getReportMarkers();
    expect(merged).toHaveLength(REPORT_MARKERS.length + 1);
    expect(merged.filter((m) => m.source === 'db')).toHaveLength(1);
    expect(merged.find((m) => m.testKey === 'new_marker_a')?.source).toBe('db');
  });

  it('DB row REPLACES seed when testKey collides (DB wins, seed entry omitted)', async () => {
    const seedKey = REPORT_MARKERS[0].testKey;
    const db = [
      dbMarker({
        testKey: seedKey,
        label: 'Overridden Label',
        pillar: 'strength',
        createdAt: 1000,
      }),
    ];
    mockedGetAllMarkers.mockResolvedValueOnce(db);
    const merged = await getReportMarkers();
    // Total count stays the same (one swap)
    expect(merged).toHaveLength(REPORT_MARKERS.length);
    // Only ONE entry for the colliding key, and it's the DB one
    const matches = merged.filter((m) => m.testKey === seedKey);
    expect(matches).toHaveLength(1);
    expect(matches[0].source).toBe('db');
    expect(matches[0].label).toBe('Overridden Label');
  });

  it('seed entries all precede DB entries in the result', async () => {
    const db = [
      dbMarker({ testKey: 'db_one', createdAt: 1000 }),
      dbMarker({ testKey: 'db_two', createdAt: 2000 }),
    ];
    mockedGetAllMarkers.mockResolvedValueOnce(db);
    const merged = await getReportMarkers();
    const firstDbIndex = merged.findIndex((m) => m.source === 'db');
    const lastSeedIndex = merged.map((m, i) => ({ m, i })).filter(({ m }) => m.source === 'seed').pop()!.i;
    expect(lastSeedIndex).toBeLessThan(firstDbIndex);
  });

  it('DB rows are returned in createdAt ascending order', async () => {
    // getAllMarkers() returns rows already ordered by createdAt asc (Task 1
    // contract). Verify the merge preserves that order.
    const db = [
      dbMarker({ testKey: 'db_older', createdAt: 1000 }),
      dbMarker({ testKey: 'db_newer', createdAt: 2000 }),
    ];
    mockedGetAllMarkers.mockResolvedValueOnce(db);
    const merged = await getReportMarkers();
    const dbOnly = merged.filter((m) => m.source === 'db');
    expect(dbOnly.map((m) => m.testKey)).toEqual(['db_older', 'db_newer']);
  });

  it('every returned entry carries a correct source field', async () => {
    const db = [dbMarker({ testKey: 'db_only', createdAt: 1000 })];
    mockedGetAllMarkers.mockResolvedValueOnce(db);
    const merged = await getReportMarkers();
    for (const m of merged) {
      expect(['seed', 'db']).toContain(m.source);
    }
  });
});
