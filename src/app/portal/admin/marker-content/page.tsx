import Link from 'next/link';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AuthSession } from '@/lib/auth-helpers';
import { REPORT_MARKERS, REPORT_CATEGORIES } from '@/lib/report-markers';
import MonoEyebrow from '@/components/ui/MonoEyebrow';

/**
 * Phase 11 — Admin SSR-gated marker-content list (D-07, D-10).
 *
 * Lists every REPORT_MARKERS marker grouped by category; each marker links to
 * its per-marker editor at /portal/admin/marker-content/[testKey]. RBAC gate
 * cloned from /portal/admin/pillars/page.tsx: non-admin sessions redirect away.
 */
export default async function AdminMarkerContentPage() {
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
          <MonoEyebrow variant="hero" as="div" className="mb-3">
            ADMIN · MARKER CONTENT
          </MonoEyebrow>
          <h1 className="text-[32px] sm:text-[40px] font-medium text-text leading-none tracking-[-0.03em]">
            Marker content
          </h1>
          <p className="mt-3 text-[13px] text-text-dim leading-[1.55] max-w-2xl">
            Author the definition, impact, and per-tier per-gender coach insights shown in the report
            marker detail. Select a marker to edit its content.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        {REPORT_CATEGORIES.map((cat) => {
          const markers = REPORT_MARKERS.filter((m) => m.category === cat);
          if (markers.length === 0) return null;

          return (
            <section key={cat} className="mb-9">
              {/* Category header */}
              <div className="flex items-center gap-3 mb-3">
                <h2 className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">
                  {cat}
                </h2>
                <div className="flex-1 h-px bg-line" />
                <span className="font-mono text-[11px] text-text-dim tabular-nums">{markers.length}</span>
              </div>

              {/* Marker rows */}
              <div className="space-y-1.5">
                {markers.map((m) => (
                  <Link
                    key={m.testKey}
                    href={`/portal/admin/marker-content/${m.testKey}`}
                    className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-line bg-bg-3 hover:border-gold-brand/40 hover:bg-bg-2 transition-colors duration-150"
                  >
                    <div className="min-w-0">
                      <span className="block text-sm font-medium text-text truncate group-hover:text-gold-brand transition-colors">
                        {m.label}
                      </span>
                      {m.subcategory && (
                        <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint mt-0.5">
                          {m.subcategory}
                        </span>
                      )}
                    </div>
                    <svg
                      className="w-4 h-4 flex-none text-text-faint group-hover:text-gold-brand transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
