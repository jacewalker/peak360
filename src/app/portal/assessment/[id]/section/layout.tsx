import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

/**
 * D-19: Server-side guard for the editable assessment surface.
 *
 * Clients are read-only and must be redirected to /portal/assessment/[id]/report
 * BEFORE any child page renders or any client JS executes. This eliminates the
 * flicker + stale-auto-save POST risk a client-side useEffect would introduce
 * (07 phase checker warning 3).
 *
 * Scope: this layout wraps `/portal/assessment/[id]/section/[num]/*` only.
 * The /report route does NOT nest under /section/, so clients can still reach
 * their report after this redirect (Option A in plan 07-08 task 2).
 *
 * Coach + admin sessions are unaffected — the redirect branch is skipped for
 * any role other than 'client', so editable section pages render normally.
 */
export default async function AssessmentSectionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user.role === 'client') {
    redirect(`/portal/assessment/${id}/report`);
  }

  return <>{children}</>;
}
