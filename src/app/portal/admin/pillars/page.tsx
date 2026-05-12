import Link from 'next/link';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AuthSession } from '@/lib/auth-helpers';
import {
  getPillarDefinitions,
  getPillarPageCopy,
} from '@/lib/pillars/queries';
import AdminPillarsForm from './AdminPillarsForm';
import MonoEyebrow from '@/components/ui/MonoEyebrow';

/**
 * Phase 8 — Admin SSR-gated authoring shell for pillar definitions and page copy.
 *
 * D-19, D-20 — admin-only edits, RBAC enforced server-side. Reads happen here
 * (D-21 server-side); the client form receives the data as props.
 */
export default async function AdminPillarsPage() {
  const rawSession = await auth.api.getSession({ headers: await headers() });
  if (!rawSession?.user) redirect('/login');
  const session = rawSession as unknown as AuthSession;
  if (session.user.role !== 'admin') redirect('/portal');

  const [definitions, pageCopy] = await Promise.all([
    getPillarDefinitions(),
    getPillarPageCopy(),
  ]);

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
            ADMIN · PILLARS
          </MonoEyebrow>
          <h1 className="text-[32px] sm:text-[40px] font-medium text-text leading-none tracking-[-0.03em]">
            Pillar definitions
          </h1>
          <p className="mt-3 text-[13px] text-text-dim leading-[1.55] max-w-2xl">
            Edit the global pillar names, summaries, and explanations shown to every client.
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
        <AdminPillarsForm definitions={definitions} pageCopy={pageCopy} />
      </main>
    </div>
  );
}
