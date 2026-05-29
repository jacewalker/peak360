import Link from 'next/link';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AuthSession } from '@/lib/auth-helpers';
import MonoEyebrow from '@/components/ui/MonoEyebrow';
import MarkersList from './MarkersList';

/**
 * Phase 12 - Admin SSR-gated marker registry list (D-12, D-15).
 *
 * Lists every marker (seeded REPORT_MARKERS + DB-added) grouped by section.
 * Seeded rows carry a SEEDED badge (read-only here; editable via the
 * normative + marker-content editors). DB-added rows expose edit/delete
 * affordances. RBAC gate cloned from marker-content/page.tsx.
 */
export default async function AdminMarkersPage() {
  const rawSession = await auth.api.getSession({ headers: await headers() });
  if (!rawSession?.user) redirect('/login');
  const session = rawSession as unknown as AuthSession;
  if (session.user.role !== 'admin') redirect('/portal');

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Link
            href="/portal/admin"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-text-faint hover:text-gold-brand mb-4 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            ADMIN
          </Link>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <MonoEyebrow variant="hero" as="div" className="mb-3">
                ADMIN &middot; REGISTRY
              </MonoEyebrow>
              <h1 className="text-[32px] sm:text-[40px] font-medium text-text leading-none tracking-[-0.03em]">
                Markers
              </h1>
              <p className="mt-3 text-[13px] text-text-dim leading-[1.55] max-w-2xl">
                Add or remove markers from any assessment section. Configure pillar, AI aliases, and
                initial normative ranges.
              </p>
            </div>
            <Link
              href="/portal/admin/markers/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gold-brand text-bg text-[13px] font-bold hover:bg-champagne transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add marker
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <MarkersList />
      </main>
    </div>
  );
}
