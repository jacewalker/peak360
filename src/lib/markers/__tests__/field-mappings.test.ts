import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MarkerRow } from '@/lib/markers/queries';

vi.mock('@/lib/markers/queries', () => ({
  getAllMarkers: vi.fn(),
}));

import { getAllMarkers } from '@/lib/markers/queries';
import { getFieldMappings } from '@/lib/markers/field-mappings';
import { fieldMappings } from '@/lib/ai/field-mappings';

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

describe('getFieldMappings (Phase 12 D-04)', () => {
  beforeEach(() => {
    mockedGetAllMarkers.mockReset();
  });

  it('returns hardcoded fieldMappings verbatim when DB has zero rows', async () => {
    mockedGetAllMarkers.mockResolvedValueOnce([]);
    const merged = await getFieldMappings();
    expect(merged).toEqual(fieldMappings);
  });

  it('merges DB aliases as { alias.toLowerCase().trim() -> dataKey }', async () => {
    const db = [
      dbMarker({
        testKey: 'serum_aluminum',
        dataKey: 'serumAluminum',
        aiAliases: ['Aluminum (Al)', 'aluminum serum'],
      }),
    ];
    mockedGetAllMarkers.mockResolvedValueOnce(db);
    const merged = await getFieldMappings();
    expect(merged['aluminum (al)']).toBe('serumAluminum');
    expect(merged['aluminum serum']).toBe('serumAluminum');
  });

  it('skips DB rows whose aiAliases is null', async () => {
    const db = [dbMarker({ dataKey: 'noAliasMarker', aiAliases: null })];
    mockedGetAllMarkers.mockResolvedValueOnce(db);
    const merged = await getFieldMappings();
    // No new entries appear; merged equals the hardcoded baseline
    expect(merged).toEqual(fieldMappings);
  });

  it('skips DB rows whose aiAliases is an empty array', async () => {
    const db = [dbMarker({ dataKey: 'emptyAliasMarker', aiAliases: [] })];
    mockedGetAllMarkers.mockResolvedValueOnce(db);
    const merged = await getFieldMappings();
    expect(merged).toEqual(fieldMappings);
  });

  it('skips empty / whitespace-only alias strings', async () => {
    const db = [
      dbMarker({
        dataKey: 'someMarker',
        aiAliases: ['', '   ', '\t', 'valid alias'],
      }),
    ];
    mockedGetAllMarkers.mockResolvedValueOnce(db);
    const merged = await getFieldMappings();
    expect(merged['valid alias']).toBe('someMarker');
    expect(merged['']).toBeUndefined();
    expect(merged['   ']).toBeUndefined();
  });

  it('DB alias REPLACES a hardcoded alias on collision (DB wins per D-04)', async () => {
    // 'body fat' is a known hardcoded alias mapping to bodyFatPercentage.
    expect(fieldMappings['body fat']).toBe('bodyFatPercentage');
    const db = [
      dbMarker({
        dataKey: 'overriddenTarget',
        aiAliases: ['body fat'],
      }),
    ];
    mockedGetAllMarkers.mockResolvedValueOnce(db);
    const merged = await getFieldMappings();
    expect(merged['body fat']).toBe('overriddenTarget');
  });

  it('lowercases aliases (LDL-C -> ldl-c)', async () => {
    const db = [
      dbMarker({
        dataKey: 'ldlCholesterol',
        aiAliases: ['LDL-C'],
      }),
    ];
    mockedGetAllMarkers.mockResolvedValueOnce(db);
    const merged = await getFieldMappings();
    expect(merged['ldl-c']).toBe('ldlCholesterol');
    expect(merged['LDL-C']).toBeUndefined();
  });
});
