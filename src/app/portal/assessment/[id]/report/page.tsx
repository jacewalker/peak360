import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assessments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Section11 from '@/components/sections/Section11';
import type { AuthSession } from '@/lib/auth-helpers';

/**
 * BL-05 fix: SSR ownership gate.
 *
 * The /report page is now a server component. It reads the session, fetches
 * the assessment row, calls hasAccess(), and issues notFound()/redirect()
 * BEFORE any HTML is rendered. The page chrome (header + Download PDF button)
 * is inside the gated branch only — a client guessing another client's UUID
 * never sees the page shell.
 *
 * Section11 itself remains a client component; Next.js handles the
 * server-to-client boundary at the <Section11 /> JSX site.
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
    // redirect('/portal') matches the VERIFICATION.md row-5 missing-list option;
    // notFound() is the alternative. We pick redirect to give the user a
    // sensible landing page instead of a 404.
    redirect('/portal');
  }

  // 4. Format date label server-side (locale: en-GB to match prior client behaviour).
  const dateLabel = row.assessmentDate
    ? new Date(row.assessmentDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-navy">
          Assessment · {dateLabel}
        </h1>
        <a
          href={`/api/assessments/${id}/pdf`}
          download
          className="px-4 py-2 bg-gold text-navy font-semibold rounded-lg hover:bg-gold/90 text-sm"
        >
          Download PDF
        </a>
      </div>
      <Section11 assessmentId={id} />
    </main>
  );
}
