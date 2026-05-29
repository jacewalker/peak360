import type { RegistryMarker } from '@/lib/markers/registry';

/**
 * Quick task 260529-mwp - Admin markers redesign (stats engine).
 *
 * Pure, fetch-free, React-free analytics over the merged marker registry
 * (seed REPORT_MARKERS + DB markers). Consumed by MarkersStatsBar and the
 * admin markers page. The single source of truth for per-section labels lives
 * here so MarkersList can re-import it instead of re-declaring its own copy.
 */

/**
 * Per-section display labels. Single source of truth - MarkersList.tsx imports
 * this rather than re-declaring it (Task 1 lift). Sections 1..10 only; the
 * report (Section 11) holds no individual markers.
 */
export const SECTION_LABELS: Record<number, string> = {
  1: 'Section 1 - Client Information',
  2: 'Section 2 - Daily Readiness',
  3: 'Section 3 - Medical Screening',
  4: 'Section 4 - Informed Consent',
  5: 'Section 5 - Blood Tests & Biomarkers',
  6: 'Section 6 - Body Composition',
  7: 'Section 7 - Cardiovascular Fitness',
  8: 'Section 8 - Strength Testing',
  9: 'Section 9 - Mobility & Flexibility',
  10: 'Section 10 - Balance & Power',
};

/** Canonical render order for the per-section breakdown (sections 1..10). */
export const ORDERED_SECTIONS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export interface SectionStats {
  section: number;
  label: string;
  total: number;
  seed: number;
  db: number;
  withNorms: number;
  withContent: number;
}

export interface MarkerStats {
  total: number;
  seedCount: number;
  dbCount: number;
  withNormsCount: number;
  withContentCount: number;
  perSection: SectionStats[];
}

export interface ComputeMarkerStatsInput {
  markers: RegistryMarker[];
  /**
   * testKeys that have a DB normative override (from getAllDbRanges). A marker
   * counts toward "with norms" if its testKey is here OR it is a seed marker
   * with hasNorms === true.
   */
  normsKeys: string[];
  /**
   * testKeys that have authored marker content (the `authoredKeys` field from
   * /api/admin/marker-content, i.e. trimmed-non-empty only).
   */
  contentKeys: string[];
}

/**
 * Compute registry-wide and per-section marker analytics.
 *
 * A marker is:
 *   - "with norms"   if its testKey is in normsKeys OR
 *                    (marker.source === 'seed' AND marker.hasNorms === true).
 *   - "with content" iff its testKey is in contentKeys.
 *
 * perSection always has exactly 10 rows (sections 1..10, in order), even when
 * a section has no markers, so the breakdown grid never reflows. seed + db
 * always equals total for each row and for the registry overall.
 */
export function computeMarkerStats({
  markers,
  normsKeys,
  contentKeys,
}: ComputeMarkerStatsInput): MarkerStats {
  const normsSet = new Set(normsKeys);
  const contentSet = new Set(contentKeys);

  const hasNorms = (m: RegistryMarker): boolean =>
    normsSet.has(m.testKey) || (m.source === 'seed' && m.hasNorms === true);

  const hasContent = (m: RegistryMarker): boolean => contentSet.has(m.testKey);

  const perSection: SectionStats[] = ORDERED_SECTIONS.map((section) => {
    const sectionMarkers = markers.filter((m) => m.section === section);
    const seed = sectionMarkers.filter((m) => m.source === 'seed').length;
    const db = sectionMarkers.filter((m) => m.source === 'db').length;
    return {
      section,
      label: SECTION_LABELS[section] || `Section ${section}`,
      total: sectionMarkers.length,
      seed,
      db,
      withNorms: sectionMarkers.filter(hasNorms).length,
      withContent: sectionMarkers.filter(hasContent).length,
    };
  });

  return {
    total: markers.length,
    seedCount: markers.filter((m) => m.source === 'seed').length,
    dbCount: markers.filter((m) => m.source === 'db').length,
    withNormsCount: markers.filter(hasNorms).length,
    withContentCount: markers.filter(hasContent).length,
    perSection,
  };
}
