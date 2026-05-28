// Data helpers for the pillar-based PDF report.
//
// Given the flat ReportData.markers array, these pure functions produce the
// per-page view models the page components render:
//   - per-pillar scored markers grouped + sorted Attention -> Peak
//   - the full-results grouping (by category, then subcategory) for the
//     reference page that backs every recorded marker
//
// They wrap the existing pillar classifier / scorer (markerToPillar,
// computeAllPillarScores) so PDF and portal scores stay identical. Nothing
// here throws: every entry-point is defensive so PDF generation never hard
// fails on malformed data.

import type { ReportMarker, ReportData } from '@/lib/pdf/types';
import type {
  PillarKey,
  PillarDefinition,
  PillarPrescription,
  PillarScoreResult,
} from '@/lib/pillars/types';
import { markerToPillar, computeAllPillarScores } from '@/lib/pillars/mapping';
import type { RatingTier } from '@/types/normative';
import { REPORT_CATEGORIES } from '@/lib/report-markers';

/** Worst-to-best tier rank (poor -> elite). Drives row ordering. */
export const TIER_RANK: Record<RatingTier, number> = {
  poor: 0,
  cautious: 1,
  normal: 2,
  great: 3,
  elite: 4,
};

/** Tier order Attention -> Peak, used to emit groups in a stable order. */
export const TIER_ORDER: RatingTier[] = ['poor', 'cautious', 'normal', 'great', 'elite'];

export interface TierGroup {
  tier: RatingTier;
  markers: ReportMarker[];
}

export interface PillarPageModel {
  definition: PillarDefinition;
  score: PillarScoreResult;
  /** Scored markers for this pillar, sorted poor -> elite. */
  markers: ReportMarker[];
  /** The same markers bucketed by tier, in Attention -> Peak order. */
  groups: TierGroup[];
  prescription: PillarPrescription | null;
}

/**
 * The set of score-driving markers for a single pillar:
 *   markerToPillar(m).pillar === key && !supporting && m.value != null
 * sorted by tier rank (poor first).
 */
export function selectPillarMarkers(
  pillarKey: PillarKey,
  markers: ReportMarker[],
): ReportMarker[] {
  return markers
    .filter((m) => {
      if (m.value == null || m.tier == null) return false;
      const cls = markerToPillar(m);
      return cls.pillar === pillarKey && !cls.supporting;
    })
    .slice()
    .sort((a, b) => {
      const ra = a.tier ? TIER_RANK[a.tier] : 99;
      const rb = b.tier ? TIER_RANK[b.tier] : 99;
      if (ra !== rb) return ra - rb;
      return a.label.localeCompare(b.label);
    });
}

/** Bucket already-sorted markers into tier groups, Attention -> Peak. */
export function groupByTier(markers: ReportMarker[]): TierGroup[] {
  const groups: TierGroup[] = [];
  for (const tier of TIER_ORDER) {
    const inTier = markers.filter((m) => m.tier === tier);
    if (inTier.length > 0) groups.push({ tier, markers: inTier });
  }
  return groups;
}

/**
 * Build the ordered (by definition.sortOrder) per-pillar page models for the
 * whole report. Each model carries everything a PillarPage needs.
 */
export function buildPillarPageModels(data: ReportData): PillarPageModel[] {
  let scores: Record<PillarKey, PillarScoreResult>;
  try {
    scores = computeAllPillarScores(data.markers);
  } catch {
    const empty: PillarScoreResult = {
      score: null,
      status: 'pending',
      contributingCount: 0,
      tierCounts: { elite: 0, great: 0, normal: 0, cautious: 0, poor: 0 },
    };
    scores = {
      cardiometabolic: empty,
      bodyComposition: empty,
      strength: empty,
      balance: empty,
      vo2: empty,
    };
  }

  const prescriptionByKey = new Map<PillarKey, PillarPrescription>();
  for (const p of data.prescriptions ?? []) {
    prescriptionByKey.set(p.pillarKey, p);
  }

  const sorted = [...(data.definitions ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  return sorted.map((definition) => {
    const markers = selectPillarMarkers(definition.pillarKey, data.markers);
    return {
      definition,
      score: scores[definition.pillarKey],
      markers,
      groups: groupByTier(markers),
      prescription: prescriptionByKey.get(definition.pillarKey) ?? null,
    };
  });
}

export interface ResultsPanelGroup {
  /** Subcategory panel name, e.g. "Lipid Panel". Null when the parent
   *  category has no subcategory split (markers render flat). */
  name: string | null;
  markers: ReportMarker[];
}

export interface ResultsCategoryGroup {
  /** Category name, e.g. "Blood Tests & Biomarkers" or "Mobility & Flexibility". */
  category: string;
  /** One or more panels under this category. Categories with no subcategory
   *  split produce a single panel with name === null. */
  panels: ResultsPanelGroup[];
}

/**
 * The set of categories the FullResultsPage iterates. Source-of-truth for the
 * marker-coverage guard test - if a marker's category isn't here, the guard
 * will catch it. This is just REPORT_CATEGORIES re-exported as a set for
 * convenience; FullResultsPage iterates the array in declaration order.
 */
export const REFERENCE_PAGE_CATEGORIES: ReadonlySet<string> = new Set(REPORT_CATEGORIES);

/**
 * Full results grouping: every marker with a non-null value, grouped by
 * category (REPORT_CATEGORIES order) and then by subcategory within each
 * category. Categories without a subcategory split produce a single
 * unlabelled panel. Markers within each panel are sorted poor -> elite.
 *
 * Drives the exhaustive reference page so newly added markers (FABER,
 * eyes-closed CoP, mobility metrics) never get silently dropped from the PDF.
 */
export function buildFullResultsGroups(markers: ReportMarker[]): ResultsCategoryGroup[] {
  // Walk markers once, bucketing by category then by subcategory key.
  // We preserve REPORT_CATEGORIES order for categories; within a category we
  // preserve first-appearance order for subcategories so the canonical
  // REPORT_MARKERS order wins.
  const byCategory = new Map<string, { panelOrder: (string | null)[]; panels: Map<string | null, ReportMarker[]> }>();

  for (const m of markers) {
    if (m.value == null) continue;
    const cat = m.category;
    if (!byCategory.has(cat)) {
      byCategory.set(cat, { panelOrder: [], panels: new Map() });
    }
    const bucket = byCategory.get(cat)!;
    const panelKey: string | null = m.subcategory && m.subcategory.trim() ? m.subcategory : null;
    if (!bucket.panels.has(panelKey)) {
      bucket.panels.set(panelKey, []);
      bucket.panelOrder.push(panelKey);
    }
    bucket.panels.get(panelKey)!.push(m);
  }

  // Emit categories in REPORT_CATEGORIES order, falling back to first-seen
  // order for any category we somehow received that wasn't in the canonical
  // list (defensive - this should never happen).
  const categoryOrder: string[] = [];
  for (const cat of REPORT_CATEGORIES) {
    if (byCategory.has(cat)) categoryOrder.push(cat);
  }
  for (const cat of byCategory.keys()) {
    if (!categoryOrder.includes(cat)) categoryOrder.push(cat);
  }

  return categoryOrder.map((category) => {
    const bucket = byCategory.get(category)!;
    const panels: ResultsPanelGroup[] = bucket.panelOrder.map((name) => ({
      name,
      markers: bucket.panels.get(name)!.slice().sort((a, b) => {
        const ra = a.tier ? TIER_RANK[a.tier] : 99;
        const rb = b.tier ? TIER_RANK[b.tier] : 99;
        if (ra !== rb) return ra - rb;
        return a.label.localeCompare(b.label);
      }),
    }));
    return { category, panels };
  });
}

/**
 * Overall composite = rounded mean of the non-null pillar scores. Returns null
 * when no pillar has a score yet.
 */
export function computeOverallComposite(
  scores: Record<PillarKey, PillarScoreResult>,
): number | null {
  const vals = Object.values(scores)
    .map((s) => s.score)
    .filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
