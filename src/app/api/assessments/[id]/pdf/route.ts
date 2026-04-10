import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { loadReportData } from '@/lib/report/load-report-data';
import { Peak360Report } from '@/lib/pdf/Peak360Report';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await loadReportData(id);

    const buffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      React.createElement(Peak360Report, { data }) as any
    );
    const pdfBytes = new Uint8Array(buffer);

    const clientName = (data.clientName || 'Client').replace(/\s+/g, '_');
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Peak360_Report_${clientName}.pdf"`,
      },
    });
  } catch (err) {
    console.error('PDF generation failed:', err);
    return new Response(JSON.stringify({ error: 'PDF generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
