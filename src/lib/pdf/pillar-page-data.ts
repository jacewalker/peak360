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
//
// Phase 12 D-11 audit: This file consumes the merged registry indirectly via
// the `reportMarkers` array built by `src/lib/report/load-report-data.ts` and
// passed in through ReportData props. It imports REPORT_CATEGORIES (the
// category-name list, intentionally seed-only - no admin-added categories
// per CONTEXT assumption #4) but NOT REPORT_MARKERS at runtime. DB markers
// reach pillar pages via the upstream merge in load-report-data.ts.
// Do not add a direct REPORT_MARKERS import here - it would silently drop
// admin-added markers from the PDF. See 12-04-PLAN Task 4 for the audit
// rationale and 12-04-SUMMARY for the grep baseline.

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
  /**
   * Pillar score from the canonical scorer. The score number itself is still
   * computed from PRIMARY markers only (D-09) - changing that would shift every
   * client's cardio score. The display below shows all non-normal markers
   * (primary + supporting), so the score and the marker list intentionally have
   * different bases; `displayedTierCounts` is what the on-page distribution bar
   * uses so it matches the rows the reader actually sees.
   */
  score: PillarScoreResult;
  /** Displayed markers (all tiers except 'normal'), sorted poor -> elite. */
  markers: ReportMarker[];
  /** The same markers bucketed by tier, in Attention -> Peak order (no normal). */
  groups: TierGroup[];
  /** Tier counts of the DISPLAYED markers - drives the on-page distribution bar. */
  displayedTierCounts: Record<RatingTier, number>;
  /** Count of normal-tier markers omitted from this page (shown in the reference). */
  normalOmittedCount: number;
  prescription: PillarPrescription | null;
}

/**
 * Markers shown on a pillar page: every marker classified to this pillar
 * (primary OR supporting per `markerToPillar`) that has a recorded value and a
 * non-null tier, EXCLUDING tier === 'normal'. Per user-confirmed rule
 * (2026-05-28): pillar pages show only actionable markers (Attention, Cautious,
 * Optimal, Peak); Normal-tier markers move to the Full Results Reference page
 * only. Untested markers are filtered everywhere.
 *
 * Sorted poor -> elite, then alphabetical for stable ordering within a tier.
 */
export function selectPillarMarkers(
  pillarKey: PillarKey,
  markers: ReportMarker[],
): ReportMarker[] {
  return markers
    .filter((m) => {
      if (m.value == null || m.tier == null) return false;
      if (m.tier === 'normal') return false;
      const cls = markerToPillar(m);
      return cls.pillar === pillarKey;
    })
    .slice()
    .sort((a, b) => {
      const ra = a.tier ? TIER_RANK[a.tier] : 99;
      const rb = b.tier ? TIER_RANK[b.tier] : 99;
      if (ra !== rb) return ra - rb;
      return a.label.localeCompare(b.label);
    });
}

/** Count how many normal-tier markers this pillar has (for the "+N in normal" hint). */
export function countNormalForPillar(
  pillarKey: PillarKey,
  markers: ReportMarker[],
): number {
  let n = 0;
  for (const m of markers) {
    if (m.value == null || m.tier !== 'normal') continue;
    if (markerToPillar(m).pillar === pillarKey) n += 1;
  }
  return n;
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
    const displayedTierCounts: Record<RatingTier, number> = {
      poor: 0, cautious: 0, normal: 0, great: 0, elite: 0,
    };
    for (const m of markers) {
      if (m.tier) displayedTierCounts[m.tier] += 1;
    }
    return {
      definition,
      score: scores[definition.pillarKey],
      markers,
      groups: groupByTier(markers),
      displayedTierCounts,
      normalOmittedCount: countNormalForPillar(definition.pillarKey, data.markers),
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
 * The HARD-CODED set of categories the FullResultsPage knows how to render.
 *
 * This is INTENTIONALLY enumerated (not derived from REPORT_CATEGORIES) so the
 * marker-coverage guard test catches the bug class where a new marker with a
 * brand-new category is added to REPORT_MARKERS but no page is updated to
 * render that category. When you add a new category to REPORT_MARKERS:
 *   1. Add it here.
 *   2. The guard test will pass again.
 *   3. The FullResultsPage will iterate it automatically.
 *
 * Iteration order in the PDF still follows REPORT_CATEGORIES (declaration
 * order in REPORT_MARKERS) - this set just controls reachability.
 */
export const REFERENCE_PAGE_CATEGORIES: ReadonlySet<string> = new Set<string>([
  'Blood Tests & Biomarkers',
  'Body Composition',
  'Cardiovascular Fitness',
  'Strength Testing',
  'Mobility & Flexibility',
]);

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
    // Only render categories the reference page knows how to handle. New
    // categories must be enumerated in REFERENCE_PAGE_CATEGORIES; the
    // marker-coverage guard test enforces this so additions can't silently
    // disappear.
    if (!REFERENCE_PAGE_CATEGORIES.has(cat)) continue;
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

  // Emit categories in REPORT_CATEGORIES order; we've already filtered to
  // categories that exist in REFERENCE_PAGE_CATEGORIES above.
  const categoryOrder: string[] = [];
  for (const cat of REPORT_CATEGORIES) {
    if (byCategory.has(cat)) categoryOrder.push(cat);
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
