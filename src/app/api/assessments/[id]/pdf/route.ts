import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { assessments } from '@/lib/db/schema';
import { requireSession } from '@/lib/auth-helpers';
import { loadReportData } from '@/lib/report/load-report-data';
import { Peak360Report } from '@/lib/pdf/Peak360Report';

function hasAccess(
  role: string,
  userId: string,
  row: { coachId: string | null; clientId: string | null }
): boolean {
  if (role === 'admin') return true;
  if (role === 'coach') return row.coachId === userId;
  if (role === 'client') return row.clientId === userId;
  return false;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [session, errorRes] = await requireSession();
  if (errorRes) return errorRes;

  const { id } = await params;

  const [row] = await db.select().from(assessments).where(eq(assessments.id, id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!hasAccess(session.user.role, session.user.id, row)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
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
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
