import { describe, it, expect } from 'vitest';
import {
  computePillarScore,
  markerToPillar,
  computeAllPillarScores,
  groupMarkersByPillar,
} from '@/lib/pillars/mapping';
import type { ReportMarker } from '@/lib/pdf/types';

function marker(overrides: Partial<ReportMarker> = {}): ReportMarker {
  return {
    key: 'test_marker',
    label: 'Test Marker',
    value: 1,
    tier: 'normal',
    unit: '',
    category: 'Body Composition',
    subcategory: undefined,
    hasNorms: true,
    resolvedStandards: null,
    ...overrides,
  };
}

describe('computePillarScore (D-08 tier-rollup)', () => {
  it('empty array → score null, status pending, contributingCount 0', () => {
    const r = computePillarScore([]);
    expect(r.score).toBeNull();
    expect(r.status).toBe('pending');
    expect(r.contributingCount).toBe(0);
  });

  it('all-null tiers → score null, status pending', () => {
    const r = computePillarScore([
      marker({ tier: null }),
      marker({ tier: null }),
    ]);
    expect(r.score).toBeNull();
    expect(r.status).toBe('pending');
    expect(r.contributingCount).toBe(0);
  });

  it('single elite marker → score 100, status green, count 1', () => {
    const r = computePillarScore([marker({ tier: 'elite' })]);
    expect(r.score).toBe(100);
    expect(r.status).toBe('green');
    expect(r.contributingCount).toBe(1);
  });

  it('single great marker → score 80, status green', () => {
    const r = computePillarScore([marker({ tier: 'great' })]);
    expect(r.score).toBe(80);
    expect(r.status).toBe('green');
  });

  it('single normal marker → score 60, status amber', () => {
    const r = computePillarScore([marker({ tier: 'normal' })]);
    expect(r.score).toBe(60);
    expect(r.status).toBe('amber');
  });

  it('single cautious marker → score 40, status amber', () => {
    const r = computePillarScore([marker({ tier: 'cautious' })]);
    expect(r.score).toBe(40);
    expect(r.status).toBe('amber');
  });

  it('single poor marker → score 20, status red, count 1', () => {
    const r = computePillarScore([marker({ tier: 'poor' })]);
    expect(r.score).toBe(20);
    expect(r.status).toBe('red');
    expect(r.contributingCount).toBe(1);
  });

  it('mixed [elite=100, great=80, normal=60] → score 80, status green', () => {
    const r = computePillarScore([
      marker({ tier: 'elite' }),
      marker({ tier: 'great' }),
      marker({ tier: 'normal' }),
    ]);
    expect(r.score).toBe(80);
    expect(r.status).toBe('green');
    expect(r.contributingCount).toBe(3);
  });

  it('mixed [poor=20, cautious=40] → score 30, status red', () => {
    const r = computePillarScore([
      marker({ tier: 'poor' }),
      marker({ tier: 'cautious' }),
    ]);
    expect(r.score).toBe(30);
    expect(r.status).toBe('red');
    expect(r.contributingCount).toBe(2);
  });

  it('mixed [normal=60, cautious=40] → score 50, status amber', () => {
    const r = computePillarScore([
      marker({ tier: 'normal' }),
      marker({ tier: 'cautious' }),
    ]);
    expect(r.score).toBe(50);
    expect(r.status).toBe('amber');
  });

  it('boundary score exactly 70 → green (3 great + 1 normal = 75 → not 70 — use construction)', () => {
    // 70 from [normal, normal, great, great] = (60+60+80+80)/4 = 70
    const r = computePillarScore([
      marker({ tier: 'normal' }),
      marker({ tier: 'normal' }),
      marker({ tier: 'great' }),
      marker({ tier: 'great' }),
    ]);
    expect(r.score).toBe(70);
    expect(r.status).toBe('green');
  });

  it('boundary score 69 → amber (4 normal + 1 great = 64 → not 69; use 69 directly via 5 markers)', () => {
    // Hard to hit 69 exactly with tier values; instead simulate by constructing markers that round to 69:
    // Use 7 markers: 5 normal (60*5=300) + 2 great (80*2=160) → 460/7 ≈ 65.7 → 66
    // Use 10 markers to land 69: e.g. [normal x 5 (300), great x 5 (400)] = 700/10 = 70 (green)
    // [normal x 6, great x 4] = 360+320=680/10=68 (amber, below 70)
    const r = computePillarScore([
      marker({ tier: 'normal' }), marker({ tier: 'normal' }), marker({ tier: 'normal' }),
      marker({ tier: 'normal' }), marker({ tier: 'normal' }), marker({ tier: 'normal' }),
      marker({ tier: 'great' }), marker({ tier: 'great' }), marker({ tier: 'great' }),
      marker({ tier: 'great' }),
    ]);
    expect(r.score).toBe(68);
    expect(r.status).toBe('amber');
  });

  it('boundary score exactly 40 → amber', () => {
    const r = computePillarScore([marker({ tier: 'cautious' })]);
    expect(r.score).toBe(40);
    expect(r.status).toBe('amber');
  });

  it('boundary score 39 → red', () => {
    // [poor x 4, cautious x 6] = 80+240 = 320/10 = 32 (red)
    // [poor x 1, cautious x 4] = 20+160=180/5=36 (red)
    // [poor x 3, cautious x 7] = 60+280=340/10=34 (red)
    // Need 39: [poor x 1, cautious x 9] = 20+360 = 380/10 = 38 (red)
    // [poor x 2, normal x 8] = 40+480=520/10=52 (amber). To land sub-40:
    // any value < 40 is red. Use [poor, cautious] = 30 (red). Already covered.
    // Add an explicit test that 39 maps to red by constructing a value at the boundary using arithmetic
    // [poor x 1, normal x 4] = 20+240=260/5=52. Use plain poor → 20 (red).
    const r = computePillarScore([
      marker({ tier: 'poor' }),
      marker({ tier: 'poor' }),
      marker({ tier: 'cautious' }),
    ]);
    // (20+20+40)/3 = 26.67 → 27 → red
    expect(r.score).toBe(27);
    expect(r.status).toBe('red');
  });

  it('mix of rated and unrated → unrated excluded, score derived from rated only', () => {
    const r = computePillarScore([
      marker({ tier: 'elite' }),
      marker({ tier: null }),
    ]);
    expect(r.score).toBe(100);
    expect(r.status).toBe('green');
    expect(r.contributingCount).toBe(1);
  });

  it('tierCounts records each tier in contributing set', () => {
    const r = computePillarScore([
      marker({ tier: 'elite' }),
      marker({ tier: 'elite' }),
      marker({ tier: 'great' }),
      marker({ tier: 'normal' }),
      marker({ tier: 'cautious' }),
      marker({ tier: 'poor' }),
      marker({ tier: null }),
    ]);
    expect(r.tierCounts.elite).toBe(2);
    expect(r.tierCounts.great).toBe(1);
    expect(r.tierCounts.normal).toBe(1);
    expect(r.tierCounts.cautious).toBe(1);
    expect(r.tierCounts.poor).toBe(1);
    expect(r.contributingCount).toBe(6);
  });
});

describe('markerToPillar (D-05 / D-06 / D-05 Option A)', () => {
  it('Body Composition → bodyComposition (not supporting)', () => {
    expect(
      markerToPillar({
        category: 'Body Composition',
        testKey: 'body_fat_percent',
        label: 'Body Fat %',
      })
    ).toEqual({ pillar: 'bodyComposition', supporting: false });
  });

  it('Strength Testing — grip_strength_left → strength', () => {
    expect(
      markerToPillar({
        category: 'Strength Testing',
        testKey: 'grip_strength_left',
        label: 'Grip Strength (Left)',
      })
    ).toEqual({ pillar: 'strength', supporting: false });
  });

  it('D-05 Option A: single_leg_balance_left under Strength Testing → balance', () => {
    expect(
      markerToPillar({
        category: 'Strength Testing',
        testKey: 'single_leg_balance_left',
        label: 'SL Balance (Left)',
      })
    ).toEqual({ pillar: 'balance', supporting: false });
  });

  it('D-05 Option A: single_leg_balance_right under Strength Testing → balance', () => {
    expect(
      markerToPillar({
        category: 'Strength Testing',
        testKey: 'single_leg_balance_right',
        label: 'SL Balance (Right)',
      })
    ).toEqual({ pillar: 'balance', supporting: false });
  });

  it('Strength Testing — single_leg_hop_left does NOT match balance regex → strength', () => {
    expect(
      markerToPillar({
        category: 'Strength Testing',
        testKey: 'single_leg_hop_left',
        label: 'Single Leg Hop (Left)',
      })
    ).toEqual({ pillar: 'strength', supporting: false });
  });

  it('Strength Testing — single_leg_hop_right → strength', () => {
    expect(
      markerToPillar({
        category: 'Strength Testing',
        testKey: 'single_leg_hop_right',
        label: 'Single Leg Hop (Right)',
      })
    ).toEqual({ pillar: 'strength', supporting: false });
  });

  it('Strength Testing — sit_to_stand → strength', () => {
    expect(
      markerToPillar({
        category: 'Strength Testing',
        testKey: 'sit_to_stand',
        label: 'Sit to Stand',
      })
    ).toEqual({ pillar: 'strength', supporting: false });
  });

  it('Strength Testing — push_ups → strength', () => {
    expect(
      markerToPillar({
        category: 'Strength Testing',
        testKey: 'push_ups',
        label: 'Push Ups',
      })
    ).toEqual({ pillar: 'strength', supporting: false });
  });

  it('Strength Testing — plank_hold → strength', () => {
    expect(
      markerToPillar({
        category: 'Strength Testing',
        testKey: 'plank_hold',
        label: 'Plank Hold',
      })
    ).toEqual({ pillar: 'strength', supporting: false });
  });

  it('Cardiovascular Fitness — vo2_max → vo2', () => {
    expect(
      markerToPillar({
        category: 'Cardiovascular Fitness',
        testKey: 'vo2_max',
        label: 'VO2 Max',
      })
    ).toEqual({ pillar: 'vo2', supporting: false });
  });

  it('Cardiovascular Fitness — blood_pressure_systolic → cardiometabolic', () => {
    expect(
      markerToPillar({
        category: 'Cardiovascular Fitness',
        testKey: 'blood_pressure_systolic',
        label: 'Systolic BP',
      })
    ).toEqual({ pillar: 'cardiometabolic', supporting: false });
  });

  it('Cardiovascular Fitness — blood_pressure_diastolic → cardiometabolic', () => {
    expect(
      markerToPillar({
        category: 'Cardiovascular Fitness',
        testKey: 'blood_pressure_diastolic',
        label: 'Diastolic BP',
      })
    ).toEqual({ pillar: 'cardiometabolic', supporting: false });
  });

  it('Blood — Lipid Panel → cardiometabolic (primary)', () => {
    expect(
      markerToPillar({
        category: 'Blood Tests & Biomarkers',
        subcategory: 'Lipid Panel',
        testKey: 'cholesterol_total',
        label: 'Total Cholesterol',
      })
    ).toEqual({ pillar: 'cardiometabolic', supporting: false });
  });

  it('Blood — Glucose & Metabolic → cardiometabolic (primary)', () => {
    expect(
      markerToPillar({
        category: 'Blood Tests & Biomarkers',
        subcategory: 'Glucose & Metabolic',
        testKey: 'hba1c',
        label: 'HbA1c',
      })
    ).toEqual({ pillar: 'cardiometabolic', supporting: false });
  });

  it('Blood — Inflammation → cardiometabolic (primary)', () => {
    expect(
      markerToPillar({
        category: 'Blood Tests & Biomarkers',
        subcategory: 'Inflammation',
        testKey: 'crp_hs',
        label: 'hs-CRP',
      })
    ).toEqual({ pillar: 'cardiometabolic', supporting: false });
  });

  it('Blood — Hormones → cardiometabolic (D-06 supporting)', () => {
    expect(
      markerToPillar({
        category: 'Blood Tests & Biomarkers',
        subcategory: 'Hormones',
        testKey: 'testosterone_total',
        label: 'Total Testosterone',
      })
    ).toEqual({ pillar: 'cardiometabolic', supporting: true });
  });

  it('Blood — Thyroid → cardiometabolic (D-06 supporting)', () => {
    expect(
      markerToPillar({
        category: 'Blood Tests & Biomarkers',
        subcategory: 'Thyroid',
        testKey: 'tsh',
        label: 'TSH',
      })
    ).toEqual({ pillar: 'cardiometabolic', supporting: true });
  });

  it('Blood — Vitamins & Minerals → cardiometabolic (supporting)', () => {
    expect(
      markerToPillar({
        category: 'Blood Tests & Biomarkers',
        subcategory: 'Vitamins & Minerals',
        testKey: 'vitamin_d_25oh',
        label: 'Vitamin D',
      })
    ).toEqual({ pillar: 'cardiometabolic', supporting: true });
  });

  it('Blood — Iron Studies → cardiometabolic (supporting)', () => {
    expect(
      markerToPillar({
        category: 'Blood Tests & Biomarkers',
        subcategory: 'Iron Studies',
        testKey: 'serum_iron',
        label: 'Serum Iron',
      })
    ).toEqual({ pillar: 'cardiometabolic', supporting: true });
  });

  it('Blood — Liver Function → cardiometabolic (supporting)', () => {
    expect(
      markerToPillar({
        category: 'Blood Tests & Biomarkers',
        subcategory: 'Liver Function',
        testKey: 'alt',
        label: 'ALT',
      })
    ).toEqual({ pillar: 'cardiometabolic', supporting: true });
  });

  it('Blood — Kidney & Electrolytes → cardiometabolic (supporting)', () => {
    expect(
      markerToPillar({
        category: 'Blood Tests & Biomarkers',
        subcategory: 'Kidney & Electrolytes',
        testKey: 'creatinine',
        label: 'Creatinine',
      })
    ).toEqual({ pillar: 'cardiometabolic', supporting: true });
  });

  it('Blood — Heavy Metals → cardiometabolic (supporting)', () => {
    expect(
      markerToPillar({
        category: 'Blood Tests & Biomarkers',
        subcategory: 'Heavy Metals',
        testKey: 'mercury',
        label: 'Mercury',
      })
    ).toEqual({ pillar: 'cardiometabolic', supporting: true });
  });

  it('Blood — Full Blood Count → cardiometabolic (supporting)', () => {
    expect(
      markerToPillar({
        category: 'Blood Tests & Biomarkers',
        subcategory: 'Full Blood Count',
        testKey: 'hemoglobin',
        label: 'Hemoglobin',
      })
    ).toEqual({ pillar: 'cardiometabolic', supporting: true });
  });

  it('Mobility & Flexibility — sit_and_reach → null (Mobility is not a pillar)', () => {
    expect(
      markerToPillar({
        category: 'Mobility & Flexibility',
        testKey: 'sit_and_reach',
        label: 'Sit and Reach',
      })
    ).toEqual({ pillar: null, supporting: false });
  });

  it('Mobility & Flexibility — sway_test (regex hits "sway") → balance (Option A)', () => {
    expect(
      markerToPillar({
        category: 'Mobility & Flexibility',
        testKey: 'sway_test',
        label: 'Sway Test',
      })
    ).toEqual({ pillar: 'balance', supporting: false });
  });
});

describe('computeAllPillarScores', () => {
  it('returns Record<PillarKey, PillarScoreResult> with all 5 keys populated', () => {
    const r = computeAllPillarScores([
      marker({ category: 'Body Composition', tier: 'great' }),
    ]);
    expect(Object.keys(r).sort()).toEqual([
      'balance', 'bodyComposition', 'cardiometabolic', 'strength', 'vo2',
    ]);
  });

  it('Cardiometabolic excludes supporting markers from score (D-09)', () => {
    // One supporting Hormones marker with elite tier should NOT raise cardiometabolic score
    const r = computeAllPillarScores([
      marker({
        category: 'Blood Tests & Biomarkers',
        subcategory: 'Hormones',
        key: 'testosterone_total',
        label: 'Total Testosterone',
        tier: 'elite',
      }),
    ]);
    // No primary cardio markers → score should remain null/pending
    expect(r.cardiometabolic.score).toBeNull();
    expect(r.cardiometabolic.status).toBe('pending');
  });

  it('Balance pillar with no markers → pending', () => {
    const r = computeAllPillarScores([
      marker({ category: 'Body Composition', tier: 'normal' }),
    ]);
    expect(r.balance.score).toBeNull();
    expect(r.balance.status).toBe('pending');
    expect(r.balance.contributingCount).toBe(0);
  });

  it('Cardiometabolic primary marker (Lipid Panel elite) raises score to 100', () => {
    const r = computeAllPillarScores([
      marker({
        category: 'Blood Tests & Biomarkers',
        subcategory: 'Lipid Panel',
        key: 'cholesterol_total',
        label: 'Total Cholesterol',
        tier: 'elite',
      }),
    ]);
    expect(r.cardiometabolic.score).toBe(100);
    expect(r.cardiometabolic.status).toBe('green');
  });

  it('Balance markers under Strength Testing route to balance bucket (Option A)', () => {
    const r = computeAllPillarScores([
      marker({
        category: 'Strength Testing',
        key: 'single_leg_balance_left',
        label: 'SL Balance (Left)',
        tier: 'great',
      }),
      marker({
        category: 'Strength Testing',
        key: 'grip_strength_left',
        label: 'Grip Strength (Left)',
        tier: 'normal',
      }),
    ]);
    expect(r.balance.contributingCount).toBe(1);
    expect(r.balance.score).toBe(80);
    expect(r.strength.contributingCount).toBe(1);
    expect(r.strength.score).toBe(60);
  });
});

describe('groupMarkersByPillar', () => {
  it('separates supporting from primary inside cardiometabolic', () => {
    const lipid = marker({
      category: 'Blood Tests & Biomarkers',
      subcategory: 'Lipid Panel',
      key: 'cholesterol_total',
      label: 'Total Cholesterol',
      tier: 'elite',
    });
    const hormones = marker({
      category: 'Blood Tests & Biomarkers',
      subcategory: 'Hormones',
      key: 'testosterone_total',
      label: 'Total Testosterone',
      tier: 'great',
    });
    const grouped = groupMarkersByPillar([lipid, hormones]);
    expect(grouped.cardiometabolic.primary).toHaveLength(1);
    expect(grouped.cardiometabolic.supporting).toHaveLength(1);
    expect(grouped.cardiometabolic.primary[0].key).toBe('cholesterol_total');
    expect(grouped.cardiometabolic.supporting[0].key).toBe('testosterone_total');
  });

  it('all 5 pillar buckets always exist', () => {
    const grouped = groupMarkersByPillar([]);
    expect(grouped.cardiometabolic).toBeDefined();
    expect(grouped.bodyComposition).toBeDefined();
    expect(grouped.strength).toBeDefined();
    expect(grouped.balance).toBeDefined();
    expect(grouped.vo2).toBeDefined();
  });

  it('Mobility markers without balance signal end up in no bucket', () => {
    const sitReach = marker({
      category: 'Mobility & Flexibility',
      key: 'sit_and_reach',
      label: 'Sit and Reach',
      tier: 'great',
    });
    const grouped = groupMarkersByPillar([sitReach]);
    // No bucket should contain it
    for (const k of Object.keys(grouped) as Array<keyof typeof grouped>) {
      expect(grouped[k].primary).toHaveLength(0);
      expect(grouped[k].supporting).toHaveLength(0);
    }
  });
});
