import { renderToBuffer } from '@react-pdf/renderer';
import { loadReportData } from '@/lib/report/load-report-data';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles } from '@/lib/pdf/styles';
import React from 'react';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await loadReportData(id);

    // Minimal placeholder document -- will be replaced by Peak360Report in Plan 02
    const doc = React.createElement(Document, null,
      React.createElement(Page, { size: 'A4', style: styles.page },
        React.createElement(View, null,
          React.createElement(Text, { style: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1a365d' } },
            'Peak360 Longevity Assessment Report'
          ),
          React.createElement(Text, { style: { fontSize: 12, marginTop: 10 } },
            `Client: ${data.clientName || 'N/A'}`
          ),
          React.createElement(Text, { style: { fontSize: 10, marginTop: 5, color: '#64748b' } },
            `Markers evaluated: ${data.totalRated} | Insights: ${data.insights.length}`
          )
        )
      )
    );

    const buffer = await renderToBuffer(doc);
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
