import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assessments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import ReportShell from '@/components/report/ReportShell';
import {
  getPillarDefinitions,
  getPillarPageCopy,
  getPillarPrescriptions,
} from '@/lib/pillars/queries';
import { loadReportData } from '@/lib/report/load-report-data';
import type { AuthSession } from '@/lib/auth-helpers';

/**
 * BL-05 fix: SSR ownership gate.
 *
 * The /report page is now a server component. It reads the session, fetches
 * the assessment row, calls hasAccess(), and issues 404/302
 * BEFORE any HTML is rendered. The page chrome (header + Download PDF button)
 * is inside the gated branch only — a client guessing another client's UUID
 * never sees the page shell.
 *
 * Phase 8 (Plan 03): Section 11 was replaced by ReportShell, which renders
 * the new Peak Living five-pillar grid + collapsed detailed marker results.
 * Pillar definitions / page copy / per-assessment prescriptions and the
 * pre-computed marker set are loaded server-side post-gate in parallel
 * (D-21 SSR + Pitfall #8 fix — portal and PDF use the same loadReportData
 * source, so pillar scores never drift between surfaces).
 */

// hasAccess is duplicated from src/app/api/assessments/[id]/pdf/route.ts:11-20.
// Extracting to src/lib/access.ts is a follow-up; both copies are pure functions
// with the same signature. The static-source IDOR test guards both.
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

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 1. Require authenticated session.
  const rawSession = await auth.api.getSession({ headers: await headers() });
  if (!rawSession?.user) {
    redirect('/login');
  }
  // Cast to the typed AuthSession (mirrors getValidSession() in src/lib/auth-helpers.ts)
  // so role/id are non-nullable for the hasAccess() call below.
  const session = rawSession as unknown as AuthSession;

  // 2. Fetch the assessment row.
  const [row] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.id, id));

  if (!row) {
    notFound();
  }

  // 3. Enforce ownership BEFORE rendering any chrome.
  if (!hasAccess(session.user.role, session.user.id, row)) {
    // Redirect to the portal landing page (matches VERIFICATION.md row-5
    // missing-list option); we pick redirect over a 404 to give the user a
    // sensible landing page.
    redirect('/portal');
  }

  // 4. Load pillar definitions, page copy, prescriptions, and the pre-computed
  //    marker set in parallel. Pulling markers from `loadReportData` (the same
  //    helper the PDF route uses) is the Pitfall #8 fix — portal and PDF derive
  //    pillar scores from the same source of truth (D-21 SSR + D-22 score parity).
  const [definitions, pageCopy, prescriptions, reportData] = await Promise.all([
    getPillarDefinitions(),
    getPillarPageCopy(),
    getPillarPrescriptions(id),
    loadReportData(id),
  ]);

  // 5. Format date label server-side (locale: en-GB to match prior client behaviour).
  const dateLabel = row.assessmentDate
    ? new Date(row.assessmentDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
      {/* Outer chrome — sits on the dark portal frame.
          Phase 9 D-09 frame edge: dark-token header + gold-brand download CTA.
          Phase 8 sovereign content (ReportShell + everything under src/components/report/*)
          is wrapped in an inner light card below — its navy + bright gold palette
          stays untouched on the cream card surface. */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] font-medium text-text tracking-[-0.015em]">
          Assessment · {dateLabel}
        </h1>
        <a
          href={`/api/assessments/${id}/pdf`}
          download
          aria-label="Download report PDF"
          className="px-4 py-2 bg-gold-brand text-bg hover:bg-champagne rounded-lg text-[13px] font-medium tracking-[0.02em] transition-colors"
        >
          Download PDF
        </a>
      </div>
      {/* Inner light wrapper preserves Phase 8 contract — D-09 frame edge only. */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 my-6 shadow-sm">
        <ReportShell
          assessmentId={id}
          definitions={definitions}
          pageCopy={pageCopy}
          prescriptions={prescriptions}
          markers={reportData.markers}
        />
      </div>
    </main>
  );
}
