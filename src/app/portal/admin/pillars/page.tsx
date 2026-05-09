import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AuthSession } from '@/lib/auth-helpers';
import {
  getPillarDefinitions,
  getPillarPageCopy,
} from '@/lib/pillars/queries';
import AdminPillarsForm from './AdminPillarsForm';

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
    <div className="min-h-screen bg-background">
      {/* Hero header — mirrors the /portal/admin/users shell */}
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
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
              Peak360
            </span>
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
              Pillar definitions
            </span>
          </div>
          <h1 className="text-[2.75rem] font-semibold text-white tracking-tight leading-none mb-3">
            Pillar definitions
          </h1>
          <p className="text-white/40 text-sm max-w-2xl leading-relaxed">
            Edit the global pillar names, summaries, and explanations shown to every client.
          </p>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-gold/60 via-gold/20 to-transparent" />
      </div>

      <div className="px-8 py-10 max-w-3xl">
        <AdminPillarsForm definitions={definitions} pageCopy={pageCopy} />
      </div>
    </div>
  );
}
