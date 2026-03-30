import type { RatingTier, TierRanges, RatingResult, NormativeVersionSnapshot } from '@/types/normative';
import { normativeData } from './data';
import type { DbRangesMap } from './db-ranges';

function getFitnessAgeGroup(age: number): string | null {
  if (isNaN(age)) return null;
  if (age <= 25) return '18-25';
  if (age <= 35) return '26-35';
  if (age <= 45) return '36-45';
  if (age <= 55) return '46-55';
  if (age <= 65) return '56-65';
  return '66+';
}

function getBodyAgeGroup(age: number): string | null {
  if (isNaN(age)) return null;
  if (age < 40) return '20-39';
  if (age < 60) return '40-59';
  return '60+';
}

export function normalizeRating(raw: string): { tier: RatingTier; raw: string } {
  const s = (raw || '').toString().toLowerCase().trim();

  if (s === 'poor') return { tier: 'poor', raw };
  if (s === 'cautious') return { tier: 'cautious', raw };
  if (s === 'average') return { tier: 'cautious', raw };
  if (s === 'normal') return { tier: 'normal', raw };
  if (s === 'great') return { tier: 'great', raw };
  if (s === 'elite') return { tier: 'elite', raw };

  if (['below standards', 'very poor', 'deficient', 'limited', 'low', 'high risk', 'stage2', 'urgent_threshold'].includes(s) || s.includes('below')) {
    return { tier: 'poor', raw };
  }
  if (['fair', 'borderline', 'elevated', 'insufficient', 'stage1', 'prediabetes', 'suboptimal'].includes(s)) {
    return { tier: 'cautious', raw };
  }
  if (['acceptable', 'normal', 'ideal', 'healthy'].includes(s)) {
    return { tier: 'normal', raw };
  }
  if (['good', 'optimal', 'excellent'].includes(s)) {
    return { tier: 'great', raw };
  }
  if (['athlete', 'elite', 'superior'].includes(s)) {
    return { tier: 'elite', raw };
  }

  return { tier: 'normal', raw };
}

function resolveRawLabel(standards: TierRanges | null, value: number): string {
  if (!standards || isNaN(value)) return 'normal';
  const tiers: RatingTier[] = ['poor', 'cautious', 'normal', 'great', 'elite'];
  for (const tier of tiers) {
    const range = standards[tier];
    if (range && value >= range.min && value <= range.max) {
      return tier;
    }
  }
  return 'normal';
}

interface Standards {
  unit: string | null;
  note: string | null;
  standards: TierRanges | null;
}

function isAgeBucketed(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).some(k => /^\d{2}-\d{2}$|^\d{2}\+$/.test(k));
}

export function getStandards(testKey: string, age?: number | null, gender?: string | null): Standards {
  const key = (testKey || '').toString();
  const g = (gender || '').toLowerCase() as 'male' | 'female';
  const numAge = age ? Number(age) : NaN;

  // Fitness markers
  const fitness = normativeData.fitness;
  if (key in fitness) {
    const test = fitness[key as keyof typeof fitness];

    if ('male' in test && 'female' in test) {
      const genderData = test[g === 'female' ? 'female' : 'male'];
      if (typeof genderData === 'object' && isAgeBucketed(genderData as Record<string, unknown>)) {
        const ageGroup = getFitnessAgeGroup(numAge);
        const standards = ageGroup ? (genderData as Record<string, TierRanges>)[ageGroup] : null;
        return { unit: test.unit || null, note: test.note || null, standards: standards || null };
      }
      return { unit: test.unit || null, note: test.note || null, standards: genderData as unknown as TierRanges };
    }

    return { unit: test.unit || null, note: test.note || null, standards: test as unknown as TierRanges };
  }

  // Blood tests
  if (key in normativeData.blood_tests) {
    const test = normativeData.blood_tests[key];
    if ('male' in test && 'female' in test) {
      const genderData = test[g === 'female' ? 'female' : 'male'];
      return { unit: test.unit || null, note: test.note || null, standards: genderData as unknown as TierRanges };
    }
    return { unit: test.unit || null, note: test.note || null, standards: test as unknown as TierRanges };
  }

  // Body composition
  const bodyComp = normativeData.body_comp;
  if (key in bodyComp) {
    const test = bodyComp[key as keyof typeof bodyComp];

    if ('male' in test && 'female' in test) {
      const genderData = test[g === 'female' ? 'female' : 'male'];
      if (typeof genderData === 'object' && isAgeBucketed(genderData as Record<string, unknown>)) {
        const ageGroup = getBodyAgeGroup(numAge);
        const standards = ageGroup ? (genderData as Record<string, TierRanges>)[ageGroup] : null;
        return { unit: test.unit || null, note: test.note || null, standards: standards || null };
      }
      return { unit: test.unit || null, note: test.note || null, standards: genderData as unknown as TierRanges };
    }

    return { unit: test.unit || null, note: test.note || null, standards: test as unknown as TierRanges };
  }

  // Strength
  if (key in normativeData.strength) {
    const test = normativeData.strength[key];

    if ('male' in test && 'female' in test) {
      const genderData = test[g === 'female' ? 'female' : 'male'];
      if (typeof genderData === 'object' && isAgeBucketed(genderData as Record<string, unknown>)) {
        const ageGroup = getBodyAgeGroup(numAge);
        const standards = ageGroup ? (genderData as Record<string, TierRanges>)[ageGroup] : null;
        return { unit: test.unit || null, note: test.note || null, standards: standards || null };
      }
      return { unit: test.unit || null, note: test.note || null, standards: genderData as unknown as TierRanges };
    }

    return { unit: test.unit || null, note: test.note || null, standards: test as unknown as TierRanges };
  }

  // Mobility
  if (key in normativeData.mobility) {
    const test = normativeData.mobility[key];
    return { unit: test.unit || null, note: test.note || null, standards: test as unknown as TierRanges };
  }

  return { unit: null, note: null, standards: null };
}

export function getPeak360Rating(
  testKey: string,
  value: number | string | null | undefined,
  age?: number | null,
  gender?: string | null
): RatingResult | null {
  if (value === null || value === undefined || value === '') return null;

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return null;

  const { unit, note, standards } = getStandards(testKey, age, gender);
  if (!standards) return null;

  const rawLabel = resolveRawLabel(standards, num);
  const { tier } = normalizeRating(rawLabel);

  return { tier, value: num, unit: unit || '', note: note || undefined };
}

export function tierScore(tier: RatingTier): number {
  const scores: Record<RatingTier, number> = { poor: 1, cautious: 2, normal: 3, great: 4, elite: 5 };
  return scores[tier] || 0;
}

/**
 * Find the best matching variant from a list of DB range entries.
 * Priority: exact gender+ageGroup > gender-only > unisex (null gender).
 */
function findBestVariant<T extends { gender: string | null; ageGroup: string | null }>(
  variants: T[],
  gender?: string | null,
  ageGroup?: string | null
): T | null {
  if (variants.length === 0) return null;

  const g = (gender || '').toLowerCase() || null;

  // Exact match: gender + ageGroup
  if (g && ageGroup) {
    const exact = variants.find(v => v.gender === g && v.ageGroup === ageGroup);
    if (exact) return exact;
  }

  // Gender-only match (ageGroup null)
  if (g) {
    const genderOnly = variants.find(v => v.gender === g && !v.ageGroup);
    if (genderOnly) return genderOnly;
  }

  // Unisex match (gender null, ageGroup null)
  const unisex = variants.find(v => !v.gender && !v.ageGroup);
  if (unisex) return unisex;

  // Fallback: first variant
  return variants[0];
}

/**
 * Get standards using DB-backed ranges with hardcoded fallback.
 * dbRangesMap is the Map returned by preloadDbRanges().
 */
export function getStandardsWithOverrides(
  testKey: string,
  age: number | null | undefined,
  gender: string | null | undefined,
  dbRangesMap: DbRangesMap
): Standards & { severityWeight?: number | null } {
  const entries = dbRangesMap.get(testKey);

  if (entries && entries.length > 0) {
    const numAge = age ? Number(age) : NaN;
    const ageGroup = !isNaN(numAge) ? getFitnessAgeGroup(numAge) : null;
    const match = findBestVariant(entries, gender, ageGroup);

    if (match && match.tiers) {
      return {
        unit: match.unit,
        note: match.note,
        standards: match.tiers,
        severityWeight: match.severityWeight,
      };
    }
  }

  // Fallback to hardcoded data
  return getStandards(testKey, age, gender);
}

/**
 * Get standards from a versioned snapshot (stored in normative_versions.ranges_json).
 * Falls back to hardcoded data if testKey not found in snapshot.
 */
export function getStandardsFromSnapshot(
  snapshot: NormativeVersionSnapshot,
  testKey: string,
  age?: number | null,
  gender?: string | null
): Standards {
  const marker = snapshot[testKey];

  if (marker && marker.variants && marker.variants.length > 0) {
    const numAge = age ? Number(age) : NaN;
    const ageGroup = !isNaN(numAge) ? getFitnessAgeGroup(numAge) : null;
    const match = findBestVariant(marker.variants, gender, ageGroup);

    if (match && match.tiers) {
      return {
        unit: marker.unit ?? null,
        note: marker.note ?? null,
        standards: match.tiers,
      };
    }
  }

  // Fallback to hardcoded data
  return getStandards(testKey, age, gender);
}
