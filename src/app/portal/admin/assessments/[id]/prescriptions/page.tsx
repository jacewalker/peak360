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
    <div className="min-h-screen bg-background">
      <div
        className="relative overflow-hidden"
        style={{
          backgroundColor: '#0f2440',
          backgroundImage: `radial-gradient(circle, rgba(245,166,35,0.07) 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      >
        <div className="relative px-8 py-14 max-w-6xl">
          <div className="flex items-center gap-1.5 mb-5">
            <Link
              href="/portal/admin"
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 hover:text-gold/70 transition-colors"
            >
              Administration
            </Link>
            <svg
              className="w-3 h-3 text-white/20"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold/70">
              Per-pillar recommendations
            </span>
          </div>
          <h1 className="text-[2.75rem] font-semibold text-white tracking-tight leading-none mb-3">
            Per-pillar recommendations
          </h1>
          <p className="text-white/40 text-sm max-w-2xl leading-relaxed">
            Author the personalised plan that {clientName} sees inside their report.
          </p>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-gold/60 via-gold/20 to-transparent" />
      </div>

      <div className="px-8 py-10 max-w-3xl">
        <AdminPrescriptionsForm
          assessmentId={id}
          clientName={clientName}
          definitions={definitions}
          prescriptions={prescriptions}
        />
      </div>
    </div>
  );
}
