'use client';

import PillarsGrid from '@/components/report/PillarsGrid';
import DetailedMarkerResultsDisclosure from '@/components/report/DetailedMarkerResultsDisclosure';
import type {
  PillarDefinition,
  PillarPageCopy,
  PillarPrescription,
} from '@/lib/pillars/types';
import type { ReportMarker } from '@/lib/pdf/types';

/**
 * Phase 8 — ReportShell.
 *
 * Top-level client component for the new portal report body.
 * Renders heading + intro from pillar_page_copy (with defensive fallbacks
 * to the UI-SPEC seed copy if pageCopy is null), then PillarsGrid, then
 * the collapsed DetailedMarkerResultsDisclosure.
 *
 * `assessmentId` is currently unused inside this shell — exposed on the
 * props contract because the SSR page passes it through and downstream
 * follow-ups (Plan 04 prescription edit links, etc.) will need it.
 */

interface ReportShellProps {
  assessmentId: string;
  definitions: PillarDefinition[];
  pageCopy: PillarPageCopy | null;
  prescriptions: PillarPrescription[];
  markers: ReportMarker[];
}

// Defensive fallback copy — mirrors the seed values written to pillar_page_copy
// in Plan 01. Used only when the row is missing.
const FALLBACK_HEADING = 'The Peak Living Pillars';
const FALLBACK_INTRO =
  'Peak360 translates your results into five core pillars to show where you are performing strongly, where you may be exposed, and where focused intervention can help move you toward peak living.';

export default function ReportShell({
  assessmentId: _assessmentId,
  definitions,
  pageCopy,
  prescriptions,
  markers,
}: ReportShellProps) {
  const heading = pageCopy?.heading || FALLBACK_HEADING;
  const intro = pageCopy?.intro || FALLBACK_INTRO;

  return (
    <div>
      <h2
        className="text-navy font-semibold leading-[1.15]"
        style={{ fontSize: 'clamp(24px, 4vw, 28px)' }}
      >
        {heading}
      </h2>
      <p className="mt-3 text-base leading-[1.5] text-muted max-w-3xl">
        {intro}
      </p>

      <div className="mt-8">
        <PillarsGrid
          definitions={definitions}
          prescriptions={prescriptions}
          markers={markers}
        />
      </div>

      <DetailedMarkerResultsDisclosure markers={markers} />
    </div>
  );
}
