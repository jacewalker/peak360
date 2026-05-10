'use client';

import { useState } from 'react';
import PillarCard from '@/components/report/PillarCard';
import PillarModal from '@/components/report/PillarModal';
import {
  computeAllPillarScores,
  groupMarkersByPillar,
} from '@/lib/pillars/mapping';
import type {
  PillarDefinition,
  PillarKey,
  PillarPrescription,
} from '@/lib/pillars/types';
import type { ReportMarker } from '@/lib/pdf/types';

/**
 * Phase 8 — PillarsGrid (orchestrator).
 *
 * Computes per-pillar scores + groups markers by pillar once per render
 * (D-08 / D-09). Renders the responsive grid (3 + 2 desktop, single column
 * mobile — D-22 sort order honoured by `definitions` already coming sorted
 * out of `getPillarDefinitions`). Owns `openKey` modal state.
 */

interface PillarsGridProps {
  definitions: PillarDefinition[];
  prescriptions: PillarPrescription[];
  markers: ReportMarker[];
}

export default function PillarsGrid({
  definitions,
  prescriptions,
  markers,
}: PillarsGridProps) {
  const [openKey, setOpenKey] = useState<PillarKey | null>(null);

  const scores = computeAllPillarScores(markers);
  const grouped = groupMarkersByPillar(markers);

  const activeDefinition = openKey
    ? definitions.find((d) => d.pillarKey === openKey) ?? null
    : null;
  const activePrescription = openKey
    ? prescriptions.find((p) => p.pillarKey === openKey) ?? null
    : null;
  const activeScore = openKey ? scores[openKey] : null;
  const activeGroup = openKey ? grouped[openKey] : null;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5 md:gap-4">
        {definitions.map((def) => {
          const result = scores[def.pillarKey];
          const group = grouped[def.pillarKey];
          return (
            <PillarCard
              key={def.pillarKey}
              pillar={def}
              score={result.score}
              status={result.status}
              markers={group.primary}
              onOpen={() => setOpenKey(def.pillarKey)}
            />
          );
        })}
      </div>

      {openKey && activeDefinition && activeScore && activeGroup && (
        <PillarModal
          open={true}
          onClose={() => setOpenKey(null)}
          definition={activeDefinition}
          prescription={activePrescription}
          score={activeScore.score}
          status={activeScore.status}
          primaryMarkers={activeGroup.primary}
          supportingMarkers={activeGroup.supporting}
        />
      )}
    </>
  );
}
