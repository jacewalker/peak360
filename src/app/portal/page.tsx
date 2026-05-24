'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { Assessment } from '@/types/assessment';
import { authClient } from '@/lib/auth-client';
import { REPORT_MARKERS } from '@/lib/report-markers';
import { getPeak360Rating } from '@/lib/normative/ratings';
import type { RatingTier } from '@/types/normative';
import type { ChartPoint } from '@/components/charts/MetricChart';
import MonoEyebrow from '@/components/ui/MonoEyebrow';
import ClientPickerDialog from '@/components/portal/ClientPickerDialog';

const MetricChart = dynamic(() => import('@/components/charts/MetricChart'), { ssr: false });

export default function DashboardPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const { data: sessionData } = authClient.useSession();
  const userRole = sessionData?.user?.role;
  const firstName = (sessionData?.user?.name || '').split(' ')[0] || '';
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Admin-only grouping by coach (D-15, D-16)
  const grouped = useMemo(() => {
    if (userRole !== 'admin') return null;
    const myUserId = sessionData?.user?.id;
    const myClients = assessments.filter((a) => a.coachId === myUserId);
    const others = assessments.filter((a) => a.coachId && a.coachId !== myUserId);
    const unassigned = assessments.filter((a) => !a.coachId);

    const byCoach = new Map<string, { name: string; rows: Assessment[] }>();
    for (const a of others) {
      const key = a.coachId!;
      const label = a.coachName || `Coach ${key.slice(-4)}`; // D-16 fallback
      if (!byCoach.has(key)) byCoach.set(key, { name: label, rows: [] });
      byCoach.get(key)!.rows.push(a);
    }
    return { myClients, byCoach: Array.from(byCoach.values()), unassigned };
  }, [assessments, userRole, sessionData?.user?.id]);

  // First-login welcome for clients (D-04)
  useEffect(() => {
    if (userRole === 'client' && typeof window !== 'undefined') {
      if (!localStorage.getItem('peak360_welcomed')) {
        setShowWelcome(true);
      }
    }
  }, [userRole]);

  useEffect(() => {
    fetch('/api/assessments')
      .then((r) => r.json())
      .then((res) => {
        setAssessments(res.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleCreateForClient = async (name: string) => {
    setCreating(true);
    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: name }),
      });
      const { data } = await res.json();
      // Seed Section 1 so the chosen name renders pre-filled and the
      // auto-save can't blank it back out on arrival.
      await fetch(`/api/assessments/${data.id}/sections/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { clientName: name } }),
      });
      router.push(`/portal/assessment/${data.id}/section/1`);
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteMessage(null);
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteMessage({ type: 'success', text: data.message ?? 'Invitation sent' });
        setInviteEmail('');
      } else {
        setInviteMessage({ type: 'error', text: data.error ?? 'Failed to send invite' });
      }
    } catch {
      setInviteMessage({ type: 'error', text: 'Connection error. Please try again.' });
    } finally {
      setInviteLoading(false);
    }
  };

  const totalCount = assessments.length;
  const completedCount = assessments.filter((a) => a.status === 'completed').length;
  const incompleteCount = totalCount - completedCount;
  const activeCount = incompleteCount;

  // Unique clients
  const clientNames = useMemo(() => {
    const names = new Set<string>();
    assessments.forEach((a) => {
      if (a.clientName) names.add(a.clientName);
    });
    return names;
  }, [assessments]);

  // Distinct existing client names for the new-assessment picker.
  const existingNames = useMemo(() => Array.from(clientNames).sort(), [clientNames]);

  // Action items: assessments stuck on early sections (1-3) or stale (no progress)
  const actionItems = useMemo(() => {
    const items: { type: 'stuck' | 'stale'; label: string; detail: string; href: string }[] = [];

    const incomplete = assessments.filter((a) => a.status !== 'completed');

    // Stuck on early sections (section 1-3 — likely haven't really started)
    incomplete
      .filter((a) => a.currentSection <= 3)
      .forEach((a) => {
        items.push({
          type: 'stuck',
          label: a.clientName || 'Unnamed Client',
          detail: `Stuck on Section ${a.currentSection} of 11`,
          href: `/portal/assessment/${a.id}/section/${a.currentSection}`,
        });
      });

    // Assessments past early sections but still incomplete — need finishing
    incomplete
      .filter((a) => a.currentSection > 3 && a.currentSection < 11)
      .forEach((a) => {
        items.push({
          type: 'stale',
          label: a.clientName || 'Unnamed Client',
          detail: `In progress — Section ${a.currentSection} of 11`,
          href: `/portal/assessment/${a.id}/section/${a.currentSection}`,
        });
      });

    return items;
  }, [assessments]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-gold-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-brand">Loading…</span>
        </div>
      </div>
    );
  }

  const roleLabel = (userRole || 'coach').toUpperCase();
  const displayTitle = firstName ? `Welcome back, ${firstName}.` : 'Dashboard';

  // Empty-state for coach with zero assessments
  const isEmptyCoach = (userRole === 'coach' || userRole === 'admin') && totalCount === 0;
  const isEmptyClient = userRole === 'client' && totalCount === 0;

  return (
    <div className="min-h-screen">
      {/* Page hero */}
      <header className="pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <MonoEyebrow variant="hero" as="div" className="mb-3">
                YOUR PORTAL · {roleLabel}
              </MonoEyebrow>
              <h1 className="text-[32px] sm:text-[40px] font-medium text-text leading-none tracking-[-0.03em]">
                {displayTitle}
              </h1>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">
                {todayIso} · {activeCount} ACTIVE · {completedCount} COMPLETED
              </p>
            </div>
            {(userRole === 'coach' || userRole === 'admin') && (
              <button
                onClick={() => setPickerOpen(true)}
                aria-label="Start new assessment"
                className="bg-gold-brand text-bg hover:bg-champagne text-[13px] font-medium tracking-[0.02em] px-6 py-3 rounded-lg transition-colors whitespace-nowrap"
              >
                Start new assessment
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* First-login welcome banner for clients (D-04) */}
        {showWelcome && (
          <div className="bg-bg-3 border border-line rounded-xl p-6 mb-6">
            <h3 className="text-[20px] font-medium text-text tracking-[-0.015em]">Welcome to Peak360.</h3>
            <p className="text-[13px] text-text-dim mt-2 leading-[1.55]">
              Your coach has set up your health assessment. You can view your results and track your progress here.
            </p>
            <button
              onClick={() => {
                localStorage.setItem('peak360_welcomed', 'true');
                setShowWelcome(false);
              }}
              className="mt-4 bg-gold-brand text-bg hover:bg-champagne py-2.5 px-6 rounded-md text-[13px] font-medium tracking-[0.02em] transition-colors"
            >
              View my assessments
            </button>
          </div>
        )}

        {/* Counter strip — gold-brand mono Display for the active count */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <Link
            href="/portal/assessments"
            aria-label={`View all ${totalCount} assessments`}
            className="bg-bg-3 rounded-xl border border-line p-5 hover:border-gold-brand/40 transition-colors group block"
          >
            <p className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">Total</p>
            <p className="font-mono text-[40px] font-medium text-text leading-none mt-2" style={{ fontVariantNumeric: 'tabular-nums' }}>{totalCount}</p>
            <p className="text-[13px] text-text-dim mt-2">Assessments</p>
          </Link>

          <Link
            href="/portal/assessments"
            aria-label={`View ${activeCount} active assessments`}
            className="bg-bg-3 rounded-xl border border-line p-5 hover:border-gold-brand/40 transition-colors group block"
          >
            <p className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">Active</p>
            <p className="font-mono text-[40px] font-medium text-gold-brand leading-none mt-2" style={{ fontVariantNumeric: 'tabular-nums' }}>{activeCount}</p>
            <p className="text-[13px] text-text-dim mt-2">In progress</p>
          </Link>

          <div className="bg-bg-3 rounded-xl border border-line p-5">
            <p className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">Completed</p>
            <p className="font-mono text-[40px] font-medium text-status-good leading-none mt-2" style={{ fontVariantNumeric: 'tabular-nums' }}>{completedCount}</p>
            <p className="text-[13px] text-text-dim mt-2">Finished</p>
          </div>

          <Link
            href="/portal/clients"
            aria-label={`View ${clientNames.size} clients`}
            className="bg-bg-3 rounded-xl border border-line p-5 hover:border-gold-brand/40 transition-colors group block"
          >
            <p className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">Clients</p>
            <p className="font-mono text-[40px] font-medium text-text leading-none mt-2" style={{ fontVariantNumeric: 'tabular-nums' }}>{clientNames.size}</p>
            <p className="text-[13px] text-text-dim mt-2">Unique</p>
          </Link>
        </div>

        {/* Invite Client — coach/admin only */}
        {(userRole === 'coach' || userRole === 'admin') && (
          <div className="bg-bg-3 rounded-xl border border-line p-5 mb-6">
            <MonoEyebrow variant="meta" as="div" className="mb-3">
              INVITE · CLIENT
            </MonoEyebrow>
            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Client email address"
                required
                className="flex-1 h-12 px-4 bg-bg-3 border border-line rounded-md text-[13px] text-text placeholder:text-text-faint focus:outline-none focus:border-gold-brand transition-colors"
              />
              <button
                type="submit"
                disabled={inviteLoading || !inviteEmail.trim()}
                className="bg-gold-brand text-bg hover:bg-champagne px-4 rounded-md text-[13px] font-medium tracking-[0.02em] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {inviteLoading ? 'Sending…' : 'Send invite'}
              </button>
            </form>
            {inviteMessage && (
              <p className={`text-[13px] mt-2 ${inviteMessage.type === 'success' ? 'text-status-good' : 'text-danger'}`}>
                {inviteMessage.text}
              </p>
            )}
          </div>
        )}

        {/* Empty states */}
        {isEmptyCoach && (
          <div className="bg-bg-3 rounded-xl border border-line p-12 text-center">
            <h3 className="text-[20px] font-medium text-text tracking-[-0.015em]">Nothing here yet.</h3>
            <p className="text-[13px] text-text-dim mt-2 leading-[1.55]">Create your first assessment to start tracking a client.</p>
            <button
              onClick={() => setPickerOpen(true)}
              className="mt-6 bg-gold-brand text-bg hover:bg-champagne py-3 px-6 rounded-lg text-[13px] font-medium tracking-[0.02em] transition-colors"
            >
              Start new assessment
            </button>
          </div>
        )}

        {isEmptyClient && (
          <div className="bg-bg-3 rounded-xl border border-line p-12 text-center">
            <h3 className="text-[20px] font-medium text-text tracking-[-0.015em]">Your first report will appear here.</h3>
            <p className="text-[13px] text-text-dim mt-2 leading-[1.55]">Your coach will let you know when it is ready.</p>
          </div>
        )}

        {!isEmptyCoach && !isEmptyClient && (
        <div className="grid md:grid-cols-5 gap-6">
          {/* Action Items — wider column */}
          <div className="md:col-span-3">
            <div className="bg-bg-3 rounded-xl border border-line">
              <div className="px-5 py-4 border-b border-line flex items-center justify-between">
                <MonoEyebrow variant="meta" as="div">ACTION · ITEMS</MonoEyebrow>
                {actionItems.length > 0 && (
                  <span className="font-mono text-[11px] font-medium text-gold-brand bg-gold-brand/10 px-2 py-0.5 rounded-full" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {actionItems.length}
                  </span>
                )}
              </div>

              {actionItems.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-[13px] text-text-dim">All clear — no action items.</p>
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {actionItems.map((item, i) => (
                    <Link
                      key={i}
                      href={item.href}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-bg-2 transition-colors group"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        item.type === 'stuck' ? 'bg-danger' : 'bg-gold-brand'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-text truncate">
                          {item.label}
                        </p>
                        <p className="text-[13px] text-text-dim mt-0.5">{item.detail}</p>
                      </div>
                      <svg className="w-4 h-4 text-text-faint group-hover:text-gold-brand shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Assessments — narrower column */}
          <div className="md:col-span-2">
            <div className="bg-bg-3 rounded-xl border border-line">
              <div className="px-5 py-4 border-b border-line flex items-center justify-between">
                <MonoEyebrow variant="meta" as="div">RECENT · ASSESSMENTS</MonoEyebrow>
                <Link
                  href="/portal/assessments"
                  className="text-[13px] text-text-dim hover:text-text font-medium transition-colors"
                >
                  View all
                </Link>
              </div>

              {assessments.length === 0 ? (
                <div className="text-center py-12 px-5">
                  {userRole === 'client' ? (
                    <>
                      <h3 className="text-[20px] font-medium text-text tracking-[-0.015em]">Your first report will appear here.</h3>
                      <p className="text-[13px] text-text-dim mt-2 leading-[1.55]">Your coach will let you know when it is ready.</p>
                    </>
                  ) : userRole === 'admin' ? (
                    <>
                      <h3 className="text-[20px] font-medium text-text tracking-[-0.015em]">No assessments yet.</h3>
                      <p className="text-[13px] text-text-dim mt-2 leading-[1.55]">Once coaches start creating assessments, you&apos;ll see them grouped here.</p>
                      <button onClick={() => setPickerOpen(true)} className="mt-4 text-[13px] font-medium text-gold-brand hover:text-champagne">Start new assessment</button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-[20px] font-medium text-text tracking-[-0.015em]">Nothing here yet.</h3>
                      <p className="text-[13px] text-text-dim mt-2 leading-[1.55]">Create your first assessment to start tracking a client.</p>
                      <button onClick={() => setPickerOpen(true)} className="mt-4 text-[13px] font-medium text-gold-brand hover:text-champagne">Start new assessment</button>
                    </>
                  )}
                </div>
              ) : userRole === 'admin' && grouped ? (
                <div className="divide-y divide-line">
                  {/* Pinned first, gold left border */}
                  {grouped.myClients.length > 0 && (
                    <div className="border-l-4 border-gold-brand">
                      <div className="px-5 py-3 flex items-center justify-between bg-bg-2/50">
                        <h4 className="text-[20px] font-medium text-text">My clients (you)</h4>
                        <span className="text-[13px] text-text-dim">
                          {new Set(grouped.myClients.map((a) => a.clientName || a.id)).size} client
                          {new Set(grouped.myClients.map((a) => a.clientName || a.id)).size === 1 ? '' : 's'}
                          {' · '}
                          {grouped.myClients.length} assessment{grouped.myClients.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="divide-y divide-line">
                        {grouped.myClients.map((a) => (
                          <AssessmentRow key={a.id} a={a} />
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Other coaches — line-2 left border */}
                  {grouped.byCoach.map((g, idx) => (
                    <div key={idx} className="border-l-4 border-line-2">
                      <div className="px-5 py-3 flex items-center justify-between bg-bg-2/50">
                        <h4 className="text-[20px] font-medium text-text">{g.name}</h4>
                        <span className="text-[13px] text-text-dim">
                          {new Set(g.rows.map((a) => a.clientName || a.id)).size} client
                          {new Set(g.rows.map((a) => a.clientName || a.id)).size === 1 ? '' : 's'}
                          {' · '}
                          {g.rows.length} assessment{g.rows.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="divide-y divide-line">
                        {g.rows.map((a) => (
                          <AssessmentRow key={a.id} a={a} />
                        ))}
                      </div>
                    </div>
                  ))}
                  {/* Unassigned — faint left border */}
                  {grouped.unassigned.length > 0 && (
                    <div className="border-l-4 border-line">
                      <div className="px-5 py-3 bg-bg-2/50">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[20px] font-medium text-text">Unassigned</h4>
                          <span className="text-[13px] text-text-dim">
                            {new Set(grouped.unassigned.map((a) => a.clientName || a.id)).size} client
                            {new Set(grouped.unassigned.map((a) => a.clientName || a.id)).size === 1 ? '' : 's'}
                            {' · '}
                            {grouped.unassigned.length} assessment{grouped.unassigned.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <p className="text-[13px] text-text-dim mt-1">Legacy assessments without an owner.</p>
                      </div>
                      <div className="divide-y divide-line">
                        {grouped.unassigned.map((a) => (
                          <AssessmentRow key={a.id} a={a} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-line">
                  {assessments.slice(0, 5).map((a) => (
                    <AssessmentRow key={a.id} a={a} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Client trends section — D-28 (gated to ≥ 2 completed assessments) */}
        {userRole === 'client' && (
          <ClientTrendsSection
            assessments={assessments}
            completedCount={completedCount}
          />
        )}
      </main>

      <ClientPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        existingNames={existingNames}
        onConfirm={handleCreateForClient}
        busy={creating}
      />
    </div>
  );
}

function AssessmentRow({ a }: { a: Assessment }) {
  return (
    <Link
      href={`/portal/assessment/${a.id}/section/${a.currentSection}`}
      className="flex items-center gap-3 px-5 py-3.5 hover:bg-bg-2 transition-colors group"
    >
      <div className="w-8 h-8 rounded-full bg-bg-2 flex items-center justify-center text-text font-medium text-[13px] group-hover:bg-gold-brand/10 transition-colors shrink-0">
        {(a.clientName || 'U')[0].toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-text truncate">
          {a.clientName || 'Unnamed Client'}
        </p>
        <p className="text-[13px] text-text-dim mt-0.5">
          {a.assessmentDate || a.createdAt.split('T')[0]}
        </p>
      </div>
      <span
        className={`font-mono text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 uppercase tracking-[0.16em] ${
          a.status === 'completed'
            ? 'bg-status-good/10 text-status-good'
            : 'bg-gold-brand/10 text-gold-brand'
        }`}
      >
        {a.status === 'completed' ? 'DONE' : `${a.currentSection}/11`}
      </span>
    </Link>
  );
}

interface MarkerPoint {
  date: string;
  value: number;
  tier: RatingTier | null;
}

function ClientTrendsSection({
  assessments,
  completedCount,
}: {
  assessments: Assessment[];
  completedCount: number;
}) {
  const [chartData, setChartData] = useState<
    { testKey: string; label: string; unit: string; data: ChartPoint[] }[]
  >([]);
  const [trendsLoading, setTrendsLoading] = useState(false);

  // Sort completed assessments chronologically
  const completedAssessments = useMemo(
    () =>
      assessments
        .filter((a) => a.status === 'completed')
        .sort((a, b) =>
          (a.assessmentDate || a.createdAt).localeCompare(
            b.assessmentDate || b.createdAt
          )
        ),
    [assessments]
  );

  useEffect(() => {
    if (completedCount < 2) {
      setChartData([]);
      return;
    }

    let cancelled = false;
    async function loadTrends() {
      setTrendsLoading(true);
      try {
        const sectionsNeeded = [...new Set(REPORT_MARKERS.map((m) => m.section))];
        const sectionsToFetch = [1, ...sectionsNeeded];

        const timelines = await Promise.all(
          completedAssessments.map(async (a) => {
            const sectionData: Record<number, Record<string, unknown>> = {};
            const results = await Promise.all(
              sectionsToFetch.map((s) =>
                fetch(`/api/assessments/${a.id}/sections/${s}`)
                  .then((r) => r.json())
                  .then((j) => ({ section: s, data: j.data || {} }))
                  .catch(() => ({ section: s, data: {} }))
              )
            );
            results.forEach((r) => {
              sectionData[r.section] = r.data;
            });

            const age = (sectionData[1]?.clientAge as number) || null;
            const gender = (sectionData[1]?.clientGender as string) || null;

            const markers: Record<
              string,
              { value: number; tier: RatingTier | null; unit: string }
            > = {};
            for (const m of REPORT_MARKERS) {
              const blob = sectionData[m.section];
              if (!blob) continue;
              const raw = blob[m.dataKey];
              const value =
                typeof raw === 'number'
                  ? raw
                  : typeof raw === 'string' && raw !== ''
                  ? Number(raw)
                  : null;
              if (value == null || isNaN(value)) continue;

              const rating = m.hasNorms
                ? getPeak360Rating(
                    m.testKey,
                    value,
                    age ?? undefined,
                    gender ?? undefined
                  )
                : null;
              markers[m.testKey] = {
                value,
                tier: rating?.tier ?? null,
                unit: rating?.unit || m.fallbackUnit || '',
              };
            }

            return {
              date: a.assessmentDate || a.createdAt.split('T')[0],
              markers,
            };
          })
        );

        if (cancelled) return;

        const series: { testKey: string; label: string; unit: string; data: ChartPoint[] }[] = [];
        for (const m of REPORT_MARKERS) {
          const points: MarkerPoint[] = [];
          for (const tl of timelines) {
            const entry = tl.markers[m.testKey];
            if (entry) {
              points.push({ date: tl.date, value: entry.value, tier: entry.tier });
            }
          }
          if (points.length >= 2) {
            series.push({
              testKey: m.testKey,
              label: m.label,
              unit: m.fallbackUnit || '',
              data: points,
            });
          }
        }
        setChartData(series);
      } catch {
        // silently fail — show empty trends rather than break the dashboard
      } finally {
        if (!cancelled) setTrendsLoading(false);
      }
    }
    loadTrends();
    return () => {
      cancelled = true;
    };
  }, [completedAssessments, completedCount]);

  if (completedCount < 2) {
    return (
      <div className="mt-8">
        <p className="text-[13px] text-text-dim">Complete more assessments to see trends over time.</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <MonoEyebrow variant="hero" as="div" className="mb-3">CLIENT · TRENDS</MonoEyebrow>
      <h3 className="text-[20px] font-medium text-text tracking-[-0.015em] mb-4">Your trends over time</h3>
      {trendsLoading ? (
        <div className="text-center py-8">
          <div className="w-5 h-5 border-2 border-gold-brand border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-brand">Loading…</p>
        </div>
      ) : chartData.length === 0 ? (
        <p className="text-[13px] text-text-dim">No trended metrics yet across your assessments.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {chartData.map((c) => (
            <MetricChart key={c.testKey} label={c.label} unit={c.unit} data={c.data} />
          ))}
        </div>
      )}
    </div>
  );
}
