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

const MetricChart = dynamic(() => import('@/components/charts/MetricChart'), { ssr: false });

export default function DashboardPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const { data: sessionData } = authClient.useSession();
  const userRole = sessionData?.user?.role;

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

  const createAssessment = async () => {
    const res = await fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const { data } = await res.json();
    router.push(`/portal/assessment/${data.id}/section/1`);
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

  // Unique clients
  const clientNames = useMemo(() => {
    const names = new Set<string>();
    assessments.forEach((a) => {
      if (a.clientName) names.add(a.clientName);
    });
    return names;
  }, [assessments]);

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
          <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="text-sm text-muted">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="py-8 sm:py-12 text-white" style={{ backgroundColor: '#0f2440' }}>
        <div className="max-w-5xl mx-auto pl-14 pr-4 sm:px-6 lg:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
              <p className="text-white/50 mt-1 text-sm">
                Your longevity assessment overview
              </p>
            </div>
            {(userRole === 'coach' || userRole === 'admin') && (
              <button
                onClick={createAssessment}
                className="px-6 py-2.5 bg-gold text-navy font-bold rounded-lg hover:bg-gold-light transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-sm whitespace-nowrap"
              >
                + New Assessment
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* First-login welcome banner for clients (D-04) */}
        {showWelcome && (
          <div className="bg-navy/5 border border-navy/10 rounded-xl p-6 mb-6">
            <h3 className="text-2xl font-bold text-navy">Welcome to Peak360!</h3>
            <p className="text-gray-600 mt-2">
              Your coach has set up your health assessment. You can view your results and track your progress here.
            </p>
            <button
              onClick={() => {
                localStorage.setItem('peak360_welcomed', 'true');
                setShowWelcome(false);
              }}
              className="mt-4 bg-navy text-white py-2.5 px-6 rounded-md font-medium hover:bg-navy/90 transition-all text-sm"
            >
              View My Assessments
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {/* Total Assessments */}
          <Link
            href="/portal/assessments"
            className="bg-white rounded-xl border border-border p-3.5 sm:p-5 hover:shadow-md hover:border-gold/30 transition-all group"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 sm:mb-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-navy/5 flex items-center justify-center group-hover:bg-navy/10 transition-colors shrink-0">
                <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-navy" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              </div>
              <div className="sm:hidden">
                <p className="text-xl font-bold text-navy leading-tight">{totalCount}</p>
                <p className="text-[10px] text-muted font-medium">Total</p>
              </div>
            </div>
            <p className="hidden sm:block text-3xl font-bold text-navy">{totalCount}</p>
            <p className="hidden sm:block text-xs text-muted font-medium mt-1">Total Assessments</p>
          </Link>

          {/* Incomplete */}
          <Link
            href="/portal/assessments"
            className="bg-white rounded-xl border border-border p-3.5 sm:p-5 hover:shadow-md hover:border-gold/30 transition-all group"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 sm:mb-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gold/10 flex items-center justify-center group-hover:bg-gold/15 transition-colors shrink-0">
                <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-gold-dark" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="sm:hidden">
                <p className="text-xl font-bold text-gold-dark leading-tight">{incompleteCount}</p>
                <p className="text-[10px] text-muted font-medium">Incomplete</p>
              </div>
            </div>
            <p className="hidden sm:block text-3xl font-bold text-gold-dark">{incompleteCount}</p>
            <p className="hidden sm:block text-xs text-muted font-medium mt-1">Incomplete</p>
          </Link>

          {/* Completed */}
          <div className="bg-white rounded-xl border border-border p-3.5 sm:p-5">
            <div className="flex items-center gap-2.5 sm:gap-3 sm:mb-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="sm:hidden">
                <p className="text-xl font-bold text-emerald-600 leading-tight">{completedCount}</p>
                <p className="text-[10px] text-muted font-medium">Completed</p>
              </div>
            </div>
            <p className="hidden sm:block text-3xl font-bold text-emerald-600">{completedCount}</p>
            <p className="hidden sm:block text-xs text-muted font-medium mt-1">Completed</p>
          </div>

          {/* Clients */}
          <Link
            href="/portal/clients"
            className="bg-white rounded-xl border border-border p-3.5 sm:p-5 hover:shadow-md hover:border-gold/30 transition-all group"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 sm:mb-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-navy/5 flex items-center justify-center group-hover:bg-navy/10 transition-colors shrink-0">
                <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-navy" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <div className="sm:hidden">
                <p className="text-xl font-bold text-navy leading-tight">{clientNames.size}</p>
                <p className="text-[10px] text-muted font-medium">Clients</p>
              </div>
            </div>
            <p className="hidden sm:block text-3xl font-bold text-navy">{clientNames.size}</p>
            <p className="hidden sm:block text-xs text-muted font-medium mt-1">Clients</p>
          </Link>
        </div>

        {/* Invite Client — coach/admin only */}
        {(userRole === 'coach' || userRole === 'admin') && (
          <div className="bg-white rounded-xl border border-border p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <h3 className="text-sm font-semibold text-navy">Invite Client</h3>
            </div>
            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Client email address"
                required
                className="flex-1 px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/25"
              />
              <button
                type="submit"
                disabled={inviteLoading || !inviteEmail.trim()}
                className="bg-gold text-navy px-4 py-2 rounded-md font-medium hover:bg-gold/90 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
              >
                {inviteLoading ? 'Sending...' : 'Send Invite'}
              </button>
            </form>
            {inviteMessage && (
              <p className={`text-xs mt-2 ${inviteMessage.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                {inviteMessage.text}
              </p>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-5 gap-6">
          {/* Action Items — wider column */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-xl border border-border">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-navy">Action Items</h3>
                </div>
                {actionItems.length > 0 && (
                  <span className="text-xs font-medium text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                    {actionItems.length}
                  </span>
                )}
              </div>

              {actionItems.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted">All clear — no action items</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {actionItems.map((item, i) => (
                    <Link
                      key={i}
                      href={item.href}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-alt transition-colors group"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        item.type === 'stuck' ? 'bg-red-400' : 'bg-gold'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-navy truncate group-hover:text-navy-light transition-colors">
                          {item.label}
                        </p>
                        <p className="text-xs text-muted mt-0.5">{item.detail}</p>
                      </div>
                      <svg className="w-4 h-4 text-muted/50 group-hover:text-navy shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
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
            <div className="bg-white rounded-xl border border-border">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-navy">Recent Assessments</h3>
                <Link
                  href="/portal/assessments"
                  className="text-xs text-muted hover:text-navy font-medium transition-colors"
                >
                  View all
                </Link>
              </div>

              {assessments.length === 0 ? (
                <div className="text-center py-12 px-5">
                  {userRole === 'client' ? (
                    <>
                      <h3 className="text-lg font-semibold text-navy mb-2">No assessments yet</h3>
                      <p className="text-sm text-muted">Your coach will set up your first assessment. You&apos;ll see it here when it&apos;s ready.</p>
                    </>
                  ) : userRole === 'admin' ? (
                    <>
                      <h3 className="text-lg font-semibold text-navy mb-2">No assessments in the system yet</h3>
                      <p className="text-sm text-muted mb-4">Once coaches start creating assessments, you&apos;ll see them grouped here.</p>
                      <button onClick={createAssessment} className="text-sm font-semibold text-gold hover:text-gold-dark">Create assessment</button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-navy mb-2">Start your first assessment</h3>
                      <p className="text-sm text-muted mb-4">Create an assessment to begin tracking a client&apos;s longevity profile.</p>
                      <button onClick={createAssessment} className="text-sm font-semibold text-gold hover:text-gold-dark">Create assessment</button>
                    </>
                  )}
                </div>
              ) : userRole === 'admin' && grouped ? (
                <div className="divide-y divide-border">
                  {/* Pinned first, gold left border */}
                  {grouped.myClients.length > 0 && (
                    <div className="border-l-4 border-gold">
                      <div className="px-5 py-3 flex items-center justify-between bg-surface-alt/50">
                        <h4 className="text-xl font-semibold text-navy">My clients (you)</h4>
                        <span className="text-xs text-muted">
                          {new Set(grouped.myClients.map((a) => a.clientName || a.id)).size} client
                          {new Set(grouped.myClients.map((a) => a.clientName || a.id)).size === 1 ? '' : 's'}
                          {' · '}
                          {grouped.myClients.length} assessment{grouped.myClients.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="divide-y divide-border">
                        {grouped.myClients.map((a) => (
                          <AssessmentRow key={a.id} a={a} />
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Other coaches — navy left border */}
                  {grouped.byCoach.map((g, idx) => (
                    <div key={idx} className="border-l-4 border-navy">
                      <div className="px-5 py-3 flex items-center justify-between bg-surface-alt/50">
                        <h4 className="text-xl font-semibold text-navy">{g.name}</h4>
                        <span className="text-xs text-muted">
                          {new Set(g.rows.map((a) => a.clientName || a.id)).size} client
                          {new Set(g.rows.map((a) => a.clientName || a.id)).size === 1 ? '' : 's'}
                          {' · '}
                          {g.rows.length} assessment{g.rows.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="divide-y divide-border">
                        {g.rows.map((a) => (
                          <AssessmentRow key={a.id} a={a} />
                        ))}
                      </div>
                    </div>
                  ))}
                  {/* Unassigned — slate left border */}
                  {grouped.unassigned.length > 0 && (
                    <div className="border-l-4 border-slate-300">
                      <div className="px-5 py-3 bg-surface-alt/50">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xl font-semibold text-navy">Unassigned</h4>
                          <span className="text-xs text-muted">
                            {new Set(grouped.unassigned.map((a) => a.clientName || a.id)).size} client
                            {new Set(grouped.unassigned.map((a) => a.clientName || a.id)).size === 1 ? '' : 's'}
                            {' · '}
                            {grouped.unassigned.length} assessment{grouped.unassigned.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-1">Legacy assessments without an owner.</p>
                      </div>
                      <div className="divide-y divide-border">
                        {grouped.unassigned.map((a) => (
                          <AssessmentRow key={a.id} a={a} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {assessments.slice(0, 5).map((a) => (
                    <AssessmentRow key={a.id} a={a} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Client trends section — D-28 (gated to ≥ 2 completed assessments) */}
        {userRole === 'client' && (
          <ClientTrendsSection
            assessments={assessments}
            completedCount={completedCount}
          />
        )}
      </main>
    </div>
  );
}

function AssessmentRow({ a }: { a: Assessment }) {
  return (
    <Link
      href={`/portal/assessment/${a.id}/section/${a.currentSection}`}
      className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-alt transition-colors group"
    >
      <div className="w-8 h-8 rounded-full bg-navy/5 flex items-center justify-center text-navy font-semibold text-xs group-hover:bg-gold/10 transition-colors shrink-0">
        {(a.clientName || 'U')[0].toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-navy truncate">
          {a.clientName || 'Unnamed Client'}
        </p>
        <p className="text-xs text-muted mt-0.5">
          {a.assessmentDate || a.createdAt.split('T')[0]}
        </p>
      </div>
      <span
        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
          a.status === 'completed'
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-gold/10 text-gold-dark'
        }`}
      >
        {a.status === 'completed' ? 'Done' : `${a.currentSection}/11`}
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
        // Fetch section data for each completed assessment in parallel.
        // API already scopes to the calling client — no client-side filter needed (D-28, T-07-18 mitigation).
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

        // Build per-marker series — only include markers with ≥ 2 points
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
        <p className="text-sm text-muted">Complete more assessments to see trends over time.</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-semibold text-navy mb-4">Your trends over time</h3>
      {trendsLoading ? (
        <div className="text-center py-8">
          <div className="w-5 h-5 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-muted">Loading trends...</p>
        </div>
      ) : chartData.length === 0 ? (
        <p className="text-sm text-muted">No trended metrics yet across your assessments.</p>
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
