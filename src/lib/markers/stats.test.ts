import { describe, it, expect } from 'vitest';
import { computeMarkerStats, ORDERED_SECTIONS } from '@/lib/markers/stats';
import type { RegistryMarker } from '@/lib/markers/registry';

/**
 * Quick task 260529-mwp - stats engine spec.
 *
 * Covers the five behaviours from PLAN Task 1:
 *  1. empty inputs -> all zeros, perSection length 10, each row zero
 *  2. withNorms = in normsKeys OR (seed AND hasNorms === true)
 *  3. withContent iff testKey in contentKeys
 *  4. perSection rows ordered 1..10 and seed + db === total per row
 *  5. DB marker hasNorms=false but present in normsKeys still counts (override)
 */

function marker(overrides: Partial<RegistryMarker> & { testKey: string }): RegistryMarker {
  return {
    testKey: overrides.testKey,
    label: overrides.label ?? overrides.testKey,
    section: overrides.section ?? 5,
    dataKey: overrides.dataKey ?? overrides.testKey,
    category: overrides.category ?? 'Test',
    subcategory: overrides.subcategory,
    fallbackUnit: overrides.fallbackUnit,
    hasNorms: overrides.hasNorms ?? false,
    source: overrides.source ?? 'seed',
    pillar: overrides.pillar,
    aiAliases: overrides.aiAliases,
    severityWeight: overrides.severityWeight,
    createdAt: overrides.createdAt,
    updatedAt: overrides.updatedAt,
  };
}

describe('computeMarkerStats', () => {
  it('Test 1: empty inputs -> all zeros, perSection length 10, each row zero', () => {
    const stats = computeMarkerStats({ markers: [], normsKeys: [], contentKeys: [] });

    expect(stats.total).toBe(0);
    expect(stats.seedCount).toBe(0);
    expect(stats.dbCount).toBe(0);
    expect(stats.withNormsCount).toBe(0);
    expect(stats.withContentCount).toBe(0);

    expect(stats.perSection).toHaveLength(10);
    expect(stats.perSection.map((r) => r.section)).toEqual(ORDERED_SECTIONS);
    for (const row of stats.perSection) {
      expect(row.total).toBe(0);
      expect(row.seed).toBe(0);
      expect(row.db).toBe(0);
      expect(row.withNorms).toBe(0);
      expect(row.withContent).toBe(0);
    }
  });

  it('Test 2: withNorms = in normsKeys OR (seed AND hasNorms === true)', () => {
    const markers: RegistryMarker[] = [
      marker({ testKey: 'seedHasNorms', source: 'seed', hasNorms: true }),
      marker({ testKey: 'seedNoNorms', source: 'seed', hasNorms: false }),
      marker({ testKey: 'inNormsKeys', source: 'seed', hasNorms: false }),
    ];
    const stats = computeMarkerStats({
      markers,
      normsKeys: ['inNormsKeys'],
      contentKeys: [],
    });

    // seedHasNorms (seed+hasNorms) + inNormsKeys (in normsKeys) = 2
    expect(stats.withNormsCount).toBe(2);
  });

  it('Test 3: withContent iff testKey in contentKeys', () => {
    const markers: RegistryMarker[] = [
      marker({ testKey: 'authored' }),
      marker({ testKey: 'unauthored' }),
    ];
    const stats = computeMarkerStats({
      markers,
      normsKeys: [],
      contentKeys: ['authored'],
    });

    expect(stats.withContentCount).toBe(1);
    const sec5 = stats.perSection.find((r) => r.section === 5)!;
    expect(sec5.withContent).toBe(1);
  });

  it('Test 4: perSection rows ordered 1..10 and seed + db === total per row', () => {
    const markers: RegistryMarker[] = [
      marker({ testKey: 'a', section: 1, source: 'seed' }),
      marker({ testKey: 'b', section: 1, source: 'db' }),
      marker({ testKey: 'c', section: 5, source: 'seed' }),
      marker({ testKey: 'd', section: 5, source: 'seed' }),
      marker({ testKey: 'e', section: 7, source: 'db' }),
    ];
    const stats = computeMarkerStats({ markers, normsKeys: [], contentKeys: [] });

    expect(stats.perSection.map((r) => r.section)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const row of stats.perSection) {
      expect(row.seed + row.db).toBe(row.total);
    }

    const sec1 = stats.perSection.find((r) => r.section === 1)!;
    expect(sec1.total).toBe(2);
    expect(sec1.seed).toBe(1);
    expect(sec1.db).toBe(1);

    const sec5 = stats.perSection.find((r) => r.section === 5)!;
    expect(sec5.total).toBe(2);
    expect(sec5.seed).toBe(2);
    expect(sec5.db).toBe(0);

    expect(stats.seedCount + stats.dbCount).toBe(stats.total);
    expect(stats.total).toBe(5);
  });

  it('Test 5: DB marker hasNorms=false but present in normsKeys still counts (override)', () => {
    const markers: RegistryMarker[] = [
      marker({ testKey: 'dbOverride', section: 6, source: 'db', hasNorms: false }),
    ];
    const stats = computeMarkerStats({
      markers,
      normsKeys: ['dbOverride'],
      contentKeys: [],
    });

    expect(stats.withNormsCount).toBe(1);
    const sec6 = stats.perSection.find((r) => r.section === 6)!;
    expect(sec6.withNorms).toBe(1);
    expect(sec6.db).toBe(1);
  });
});
