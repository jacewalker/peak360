import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assessments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect, notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { AuthSession } from '@/lib/auth-helpers';

/**
 * SSR ownership gate for the assessment section surface (I23).
 *
 * Previously this layout force-redirected every client to the report route,
 * which both trapped clients on a single screen AND provided the implicit IDOR
 * protection (a client could never reach another client's section pages). I23
 * removes that redirect so owning clients can browse their own sections
 * read-only — so the ownership check must now live here explicitly.
 *
 * This gate runs BEFORE any child renders or any client JS executes: it requires
 * a session, fetches the assessment row, and redirects non-owners to /portal
 * (404 on a missing row). Owning clients fall through and render `children`; the
 * section page itself enforces read-only / no-write client-side (canWrite flag).
 *
 * Scope: wraps `/portal/assessment/[id]/section/[num]/*` only. The report route
 * does NOT nest under /section/, so its own SSR gate is unaffected.
 *
 * Coach + admin sessions render section pages normally (hasAccess passes for
 * owning coaches and all admins).
 */

// hasAccess mirrors report/page.tsx:36-45 — a duplicated pure function is
// acceptable per that file's own note; the static-source IDOR test guards both.
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

export default async function AssessmentSectionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 1. Require an authenticated session.
  const rawSession = await auth.api.getSession({ headers: await headers() });
  if (!rawSession?.user) {
    redirect('/login');
  }
  const session = rawSession as unknown as AuthSession;

  // 2. Fetch the assessment row.
  const [row] = await db.select().from(assessments).where(eq(assessments.id, id));
  if (!row) {
    notFound();
  }

  // 3. Enforce ownership BEFORE rendering any child page.
  if (!hasAccess(session.user.role, session.user.id, row)) {
    redirect('/portal');
  }

  return <>{children}</>;
}
