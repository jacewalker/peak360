// esbuild entry for scripts/render-sample-report.mjs.
//
// Bundled (not run directly) so the @/ alias in the report tree resolves at
// build time and react-pdf is included. Exposes a single async helper that
// renders a ReportData fixture to a PDF Buffer.

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { Peak360Report } from '@/lib/pdf/Peak360Report';
import type { ReportData } from '@/lib/pdf/types';

export async function renderSample(data: ReportData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(React.createElement(Peak360Report, { data }) as any);
}
