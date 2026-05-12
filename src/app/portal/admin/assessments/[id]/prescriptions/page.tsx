import Link from 'next/link';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import type { AuthSession } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { assessments } from '@/lib/db/schema';
import {
  getPillarDefinitions,
  getPillarPrescriptions,
} from '@/lib/pillars/queries';
import AdminPrescriptionsForm from './AdminPrescriptionsForm';
import MonoEyebrow from '@/components/ui/MonoEyebrow';

/**
 * Phase 8 — SSR-gated per-assessment per-pillar prescription authoring shell.
 *
 * D-12, D-15, D-20 — admin-only writes; reads happen server-side here.
 */
export default async function AdminPrescriptionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rawSession = await auth.api.getSession({ headers: await headers() });
  if (!rawSession?.user) redirect('/login');
  const session = rawSession as unknown as AuthSession;
  if (session.user.role !== 'admin') redirect('/portal');

  const [assessment] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.id, id));
  if (!assessment) notFound();

  const [definitions, prescriptions] = await Promise.all([
    getPillarDefinitions(),
    getPillarPrescriptions(id),
  ]);
  const clientName = assessment.clientName ?? 'this client';

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
            ADMIN · PRESCRIPTIONS
          </MonoEyebrow>
          <h1 className="text-[32px] sm:text-[40px] font-medium text-text leading-none tracking-[-0.03em]">
            Per-pillar recommendations
          </h1>
          <p className="mt-3 text-[13px] text-text-dim leading-[1.55] max-w-2xl">
            Author the personalised plan that {clientName} sees inside their report.
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-12">
        <AdminPrescriptionsForm
          assessmentId={id}
          clientName={clientName}
          definitions={definitions}
          prescriptions={prescriptions}
        />
      </main>
    </div>
  );
}
