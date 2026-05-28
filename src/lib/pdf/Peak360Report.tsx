import { Document } from '@react-pdf/renderer';
import type { ReportData } from '@/lib/pdf/types';
// Ensure brand fonts are registered before any page renders.
import '@/lib/pdf/fonts';
import { CoverPage } from '@/lib/pdf/pages/CoverPage';
import { PillarPage } from '@/lib/pdf/pages/PillarPage';
import { FullResultsPage } from '@/lib/pdf/pages/FullResultsPage';
import { AppendixPage } from '@/lib/pdf/pages/AppendixPage';
import { buildPillarPageModels } from '@/lib/pdf/pillar-page-data';

interface Peak360ReportProps {
  data: ReportData;
}

/**
 * Section 11 downloadable report - 8-page, dark-portal-branded, pillar-based.
 *
 * Page order:
 *   1.   Cover (wordmark, hero, client band, pillar scoreboard, tagline)
 *   2-6. One page per Peak Living pillar in definition.sortOrder, markers
 *        ranked Attention -> Peak with a gold Coach focus note
 *   7.   Full results reference (every recorded marker across all categories,
 *        grouped by category then subcategory)
 *   8.   Appendix (readiness, medical screening, consent, disclaimer)
 *
 * The number of pillar pages tracks data.definitions (5 in v1), so the page
 * count is "8" for a standard assessment but adapts if definitions change.
 */
export function Peak360Report({ data }: Peak360ReportProps) {
  const pillarModels = buildPillarPageModels(data);

  return (
    <Document>
      <CoverPage data={data} />

      {pillarModels.map((model) => (
        <PillarPage key={model.definition.pillarKey} model={model} />
      ))}

      <FullResultsPage data={data} />

      <AppendixPage data={data} />
    </Document>
  );
}
