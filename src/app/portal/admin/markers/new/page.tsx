import Link from 'next/link';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AuthSession } from '@/lib/auth-helpers';
import MonoEyebrow from '@/components/ui/MonoEyebrow';
import NewMarkerForm from './NewMarkerForm';

/**
 * Phase 12 - Admin SSR-gated create-marker page (D-05, D-15, D-16).
 *
 * Renders the client-side NewMarkerForm; SSR gate ensures non-admins are
 * redirected before any client JS loads.
 */
export default async function NewMarkerPage() {
  const rawSession = await auth.api.getSession({ headers: await headers() });
  if (!rawSession?.user) redirect('/login');
  const session = rawSession as unknown as AuthSession;
  if (session.user.role !== 'admin') redirect('/portal');

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="pt-24 pb-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Link
            href="/portal/admin/markers"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-text-faint hover:text-gold-brand mb-4 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            MARKERS
          </Link>
          <MonoEyebrow variant="hero" as="div" className="mb-3">
            ADMIN &middot; NEW MARKER
          </MonoEyebrow>
          <h1 className="text-[32px] sm:text-[40px] font-medium text-text leading-none tracking-[-0.03em]">
            Add marker
          </h1>
          <p className="mt-3 text-[13px] text-text-dim leading-[1.55] max-w-2xl">
            Create a new biomarker or fitness-test entry for any assessment section. After saving
            you will be taken to the content editor to author the definition, impact, and per-tier
            coach insights.
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <NewMarkerForm />
      </main>
    </div>
  );
}
