import { describe, it, expect } from 'vitest';
import { REPORT_MARKERS } from '@/lib/report-markers';
import { markerToPillar } from '@/lib/pillars/mapping';
import { REFERENCE_PAGE_CATEGORIES } from '@/lib/pdf/pillar-page-data';

/**
 * Foolproof guard: every entry in REPORT_MARKERS must be reachable in the PDF.
 *
 * A marker is reachable when at least one of the following is true:
 *   (a) markerToPillar(m).pillar !== null
 *       -> it has a pillar page slot (scored markers on a pillar page).
 *   (b) m.category is iterated by the FullResultsPage reference, i.e. it lives
 *       inside REFERENCE_PAGE_CATEGORIES.
 *
 * Supporting cardiometabolic markers (m.supporting === true on the classifier
 * result) still satisfy (a) because pillar is non-null - and they additionally
 * satisfy (b) because Blood Tests & Biomarkers is in REFERENCE_PAGE_CATEGORIES.
 *
 * This catches the bug class where a marker is added to REPORT_MARKERS but the
 * PDF has no place to render it - for example, the Mobility & Flexibility
 * category was previously routed nowhere (markerToPillar returns null, and the
 * old blood-only reference page filtered Mobility out). Today the reference
 * page iterates REFERENCE_PAGE_CATEGORIES so Mobility markers are surfaced.
 */
describe('PDF marker coverage', () => {
  it('every REPORT_MARKERS entry is reachable in the PDF', () => {
    const unreachable: string[] = [];

    for (const m of REPORT_MARKERS) {
      const cls = markerToPillar(m);
      const onPillarPage = cls.pillar !== null;
      const onReferencePage = REFERENCE_PAGE_CATEGORIES.has(m.category);
      const reachable = onPillarPage || onReferencePage;

      if (!reachable) {
        unreachable.push(
          `Marker ${m.testKey} (category="${m.category}") is in REPORT_MARKERS but the PDF has no place to render it. Either route it via markerToPillar or extend the reference page (REFERENCE_PAGE_CATEGORIES / REPORT_CATEGORIES).`,
        );
      }
    }

    if (unreachable.length > 0) {
      // eslint-disable-next-line no-console
      console.error(`\n${unreachable.length} unreachable marker(s):\n` + unreachable.join('\n'));
    }
    expect(unreachable).toEqual([]);
  });

  it('the new FABER and eyes-closed CoP markers ARE reachable', () => {
    const newKeys = [
      'single_leg_balance_ec_left_ml',
      'single_leg_balance_ec_left_ap',
      'single_leg_balance_ec_right_ml',
      'single_leg_balance_ec_right_ap',
      'faber_outcome_left',
      'faber_distance_left',
      'faber_outcome_right',
      'faber_distance_right',
    ];
    for (const key of newKeys) {
      const m = REPORT_MARKERS.find((x) => x.testKey === key);
      expect(m, `expected ${key} to be registered in REPORT_MARKERS`).toBeDefined();
      const cls = markerToPillar(m!);
      const reachable = cls.pillar !== null || REFERENCE_PAGE_CATEGORIES.has(m!.category);
      expect(reachable, `${key} must be reachable in the PDF`).toBe(true);
    }
  });

  it('a hypothetical marker with an unknown category and no pillar is correctly flagged as unreachable', () => {
    // Sanity check: the guard fails when it should fail.
    const fake = {
      testKey: 'fake_unknown_marker',
      label: 'Fake Unknown Marker',
      section: 99,
      dataKey: 'fakeUnknown',
      category: 'Some Unmapped Category That Will Never Exist',
      hasNorms: false,
    };
    const cls = markerToPillar(fake);
    const onPillarPage = cls.pillar !== null;
    const onReferencePage = REFERENCE_PAGE_CATEGORIES.has(fake.category);
    expect(onPillarPage).toBe(false);
    expect(onReferencePage).toBe(false);
  });
});
