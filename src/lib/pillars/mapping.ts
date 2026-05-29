import type { ReportMarker } from '@/lib/pdf/types';
import type { PillarKey, PillarStatus, PillarScoreResult } from '@/lib/pillars/types';
import { PILLAR_THRESHOLDS } from '@/lib/pillars/colors';
import type { RatingTier } from '@/types/normative';

/**
 * D-08 — tier-rollup score values.
 */
const TIER_VALUE: Record<RatingTier, number> = {
  elite: 100,
  great: 80,
  normal: 60,
  cautious: 40,
  poor: 20,
};

/**
 * D-05/D-06 mapping helpers. The classifier returns:
 * - pillar: which Peak Living pillar this marker belongs to (or null if none)
 * - supporting: true when the marker is surfaced inside the Cardiometabolic
 *   modal under "Supporting markers" but EXCLUDED from the pillar score
 *   (D-09).
 *
 * D-05 Option A (RESEARCH §Pitfall #1):
 *   The literal text of D-05 says Balance comes from "balance-subset of
 *   Mobility & Flexibility". Verified in src/lib/report-markers.ts: zero
 *   markers exist under that category matching the regex. The only balance
 *   markers are single_leg_balance_left/right under category 'Strength
 *   Testing'. We therefore classify ANY marker whose testKey or label
 *   matches /balance|sway|stability/i as Balance, regardless of category.
 *   Strength loses those two markers but still has 6+ contributing markers
 *   (grip strength L/R, push ups, plank hold, sit to stand, single leg hop
 *   L/R), preserving signal.
 */
const PRIMARY_CARDIO_SUBCATS = new Set<string>([
  'Lipid Panel',
  'Glucose & Metabolic',
  'Inflammation',
]);

const SUPPORTING_CARDIO_SUBCATS = new Set<string>([
  'Hormones',
  'Thyroid',
  'Vitamins & Minerals',
  'Iron Studies',
  'Liver Function',
  'Kidney & Electrolytes',
  'Heavy Metals',
  'Full Blood Count',
]);

const BP_KEYS = new Set<string>([
  'blood_pressure_systolic',
  'blood_pressure_diastolic',
]);

const BALANCE_REGEX = /balance|sway|stability/i;

/**
 * Minimal marker shape this classifier needs. Both REPORT_MARKERS entries
 * (MarkerDef) and ReportMarker rows satisfy it. Phase 12 (D-07) also adds
 * an optional `pillar` for DB-driven markers which short-circuits the
 * category/regex heuristic below.
 */
type ClassifiableMarker = {
  category: string;
  subcategory?: string;
  testKey?: string;
  key?: string;
  label: string;
  pillar?: PillarKey | null;   // Phase 12 D-07 - DB-driven short-circuit
};

export function markerToPillar(m: ClassifiableMarker): {
  pillar: PillarKey | null;
  supporting: boolean;
} {
  const testKey = m.testKey ?? m.key ?? '';
  const label = m.label ?? '';

  // Phase 12 D-07 - DB-driven markers carry their pillar directly, so we
  // bypass the regex/category heuristic and trust the admin's assignment.
  // A null or absent .pillar falls through to the legacy heuristic so
  // existing seeded markers (which never carry this field) are unaffected.
  if ('pillar' in m && m.pillar) {
    return { pillar: m.pillar as PillarKey, supporting: false };
  }

  const haystack = `${testKey} ${label}`;

  // D-05 Option A — Balance markers go to Balance regardless of category
  if (BALANCE_REGEX.test(haystack)) {
    return { pillar: 'balance', supporting: false };
  }

  if (m.category === 'Body Composition') {
    return { pillar: 'bodyComposition', supporting: false };
  }

  if (m.category === 'Cardiovascular Fitness') {
    if (BP_KEYS.has(testKey)) return { pillar: 'cardiometabolic', supporting: false };
    return { pillar: 'vo2', supporting: false };
  }

  if (m.category === 'Strength Testing') {
    return { pillar: 'strength', supporting: false };
  }

  if (m.category === 'Mobility & Flexibility') {
    // Mobility itself is not a Peak Living pillar (D-04). Balance hits
    // would have been caught by the regex check above.
    return { pillar: null, supporting: false };
  }

  if (m.category === 'Blood Tests & Biomarkers') {
    const sub = m.subcategory ?? '';
    if (PRIMARY_CARDIO_SUBCATS.has(sub)) {
      return { pillar: 'cardiometabolic', supporting: false };
    }
    if (SUPPORTING_CARDIO_SUBCATS.has(sub)) {
      // D-06: surfaced inside the Cardiometabolic modal but excluded from
      // the pillar score (D-09).
      return { pillar: 'cardiometabolic', supporting: true };
    }
  }

  return { pillar: null, supporting: false };
}

/**
 * D-08 — pillar score over a SINGLE pillar's markers.
 * Caller is responsible for filtering markers down to the pillar's
 * contributing set (i.e. drop supporting=true rows BEFORE calling).
 */
export function computePillarScore(markers: ReportMarker[]): PillarScoreResult {
  const tierCounts: Record<RatingTier, number> = {
    elite: 0, great: 0, normal: 0, cautious: 0, poor: 0,
  };
  let sum = 0;
  let n = 0;
  for (const m of markers) {
    const t = m.tier;
    if (t === null) continue;
    tierCounts[t] += 1;
    sum += TIER_VALUE[t];
    n += 1;
  }
  if (n === 0) {
    return { score: null, status: 'pending', contributingCount: 0, tierCounts };
  }
  const score = Math.round(sum / n);
  const status: PillarStatus =
    score >= PILLAR_THRESHOLDS.green ? 'green' :
    score >= PILLAR_THRESHOLDS.amber ? 'amber' :
    'red';
  return { score, status, contributingCount: n, tierCounts };
}

/**
 * D-08/D-09 — compute scores for all 5 pillars given a flat marker array.
 * Filters supporting markers out of cardiometabolic before scoring (D-09).
 */
export function computeAllPillarScores(
  markers: ReportMarker[]
): Record<PillarKey, PillarScoreResult> {
  const buckets: Record<PillarKey, ReportMarker[]> = {
    cardiometabolic: [],
    bodyComposition: [],
    strength: [],
    balance: [],
    vo2: [],
  };
  for (const m of markers) {
    const { pillar, supporting } = markerToPillar(m);
    if (!pillar) continue;
    if (supporting) continue; // D-09 — surface in modal, NOT in score
    buckets[pillar].push(m);
  }
  return {
    cardiometabolic: computePillarScore(buckets.cardiometabolic),
    bodyComposition: computePillarScore(buckets.bodyComposition),
    strength: computePillarScore(buckets.strength),
    balance: computePillarScore(buckets.balance),
    vo2: computePillarScore(buckets.vo2),
  };
}

/**
 * Helper used by the modal "Your results" + "Supporting markers" sections.
 * Returns markers grouped by pillar with the supporting flag preserved.
 */
export function groupMarkersByPillar(markers: ReportMarker[]): Record<
  PillarKey,
  { primary: ReportMarker[]; supporting: ReportMarker[] }
> {
  const out: Record<PillarKey, { primary: ReportMarker[]; supporting: ReportMarker[] }> = {
    cardiometabolic: { primary: [], supporting: [] },
    bodyComposition: { primary: [], supporting: [] },
    strength: { primary: [], supporting: [] },
    balance: { primary: [], supporting: [] },
    vo2: { primary: [], supporting: [] },
  };
  for (const m of markers) {
    const { pillar, supporting } = markerToPillar(m);
    if (!pillar) continue;
    if (supporting) out[pillar].supporting.push(m);
    else out[pillar].primary.push(m);
  }
  return out;
}

export { PILLAR_KEYS } from '@/lib/pillars/types';

// ─────────────────────────────────────────────────────────────────────────────
// Back-compat adapters (kept for the in-app Section11 + PillarsDisplay UI that
// pre-dates Phase 8). These wrap the new pure-function core. Newer code (Plans
// 03/04/05) should import `computeAllPillarScores` and consume the
// `Record<PillarKey, PillarScoreResult>` shape directly.
// ─────────────────────────────────────────────────────────────────────────────

import type { PillarKey as _PillarKey } from '@/lib/pillars/types';
import { TRAFFIC_LIGHT_HEX, STATUS_LABEL } from '@/lib/pillars/colors';

export interface PillarDef {
  key: _PillarKey;
  label: string;
  blurb: string;
}

export const PILLARS: PillarDef[] = [
  { key: 'cardiometabolic', label: 'Cardiometabolic', blurb: 'Lipids, glucose, inflammation' },
  { key: 'vo2', label: 'Aerobic Fitness', blurb: 'VO₂, heart rate, blood pressure' },
  { key: 'bodyComposition', label: 'Body Composition', blurb: 'Body fat, lean mass, ratios' },
  { key: 'strength', label: 'Strength', blurb: 'Grip, jumps, push-ups, hangs' },
  { key: 'balance', label: 'Balance', blurb: 'Single-leg stability' },
];

export type TrafficLight = PillarStatus;

export interface PillarScore {
  key: _PillarKey;
  label: string;
  blurb: string;
  rated: number;
  total: number;
  score: number | null;
  status: TrafficLight;
}

/**
 * Legacy classifier — mirrors `markerToPillar()` but returns just the pillar key
 * (or null) and ignores the supporting flag. Used by the legacy in-app UI which
 * doesn't yet distinguish primary vs supporting cardiometabolic markers.
 */
export function pillarKey(m: { testKey: string; label: string; category: string; subcategory?: string }): _PillarKey | null {
  const { pillar } = markerToPillar(m);
  return pillar;
}

interface MarkerInput {
  testKey: string;
  label: string;
  category: string;
  subcategory?: string;
  tier: RatingTier | null;
}

/**
 * Legacy array-shape adapter for the in-app Section11 + PillarsDisplay UI.
 * Converts the new `Record<PillarKey, PillarScoreResult>` core output into
 * the historical `PillarScore[]` array (one row per pillar, in `PILLARS` order)
 * by adapting `MarkerInput[]` (which carries `testKey`) into `ReportMarker[]`.
 */
export function computeAllPillarScoresLegacy(markers: MarkerInput[]): PillarScore[] {
  // Project legacy MarkerInput → ReportMarker shape (only fields we need)
  const reportMarkers: ReportMarker[] = markers.map((m) => ({
    key: m.testKey,
    label: m.label,
    value: null,
    tier: m.tier,
    unit: '',
    category: m.category,
    subcategory: m.subcategory,
    hasNorms: true,
    resolvedStandards: null,
  }));

  // Per-bucket totals (rated + unrated) — used for the legacy `total` count
  const bucketTotals: Record<_PillarKey, number> = {
    cardiometabolic: 0,
    vo2: 0,
    bodyComposition: 0,
    strength: 0,
    balance: 0,
  };
  for (const m of reportMarkers) {
    const { pillar, supporting } = markerToPillar(m);
    if (!pillar) continue;
    if (supporting) continue; // legacy UI mirrors D-09 — supporting excluded from total
    bucketTotals[pillar] += 1;
  }

  const scores = computeAllPillarScores(reportMarkers);
  return PILLARS.map((p) => {
    const r = scores[p.key];
    return {
      key: p.key,
      label: p.label,
      blurb: p.blurb,
      rated: r.contributingCount,
      total: bucketTotals[p.key],
      score: r.score,
      status: r.status,
    };
  });
}

/**
 * Legacy palette adapter so existing components keep their `palette.fill / .bg /
 * .ring / .text / .label` API. Hex values come from the D-28 single-source-of-
 * truth (`TRAFFIC_LIGHT_HEX`) plus precomputed soft backgrounds for the in-app
 * UI. The PDF mirror uses the slimmer raw constants directly.
 */
export const TRAFFIC_LIGHT: Record<PillarStatus, { fill: string; bg: string; ring: string; text: string; label: string }> = {
  green: {
    fill: TRAFFIC_LIGHT_HEX.green,
    bg: '#dcfce7',
    ring: 'rgba(16,185,129,0.25)',
    text: '#166534',
    label: STATUS_LABEL.green,
  },
  amber: {
    fill: TRAFFIC_LIGHT_HEX.amber,
    bg: '#fef3c7',
    ring: 'rgba(245,158,11,0.30)',
    text: '#92400e',
    label: STATUS_LABEL.amber,
  },
  red: {
    fill: TRAFFIC_LIGHT_HEX.red,
    bg: '#fee2e2',
    ring: 'rgba(239,68,68,0.30)',
    text: '#991b1b',
    label: STATUS_LABEL.red,
  },
  pending: {
    fill: '#94a3b8',
    bg: '#f1f5f9',
    ring: 'rgba(148,163,184,0.25)',
    text: '#475569',
    label: STATUS_LABEL.pending,
  },
};

// Re-export PillarKey for legacy named-imports
export type { PillarKey } from '@/lib/pillars/types';
