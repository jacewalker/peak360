'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Assessment } from '@/types/assessment';

export default function DashboardPage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

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
    router.push(`/assessment/${data.id}/section/1`);
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
          href: `/assessment/${a.id}/section/${a.currentSection}`,
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
          href: `/assessment/${a.id}/section/${a.currentSection}`,
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
      <div className="bg-gradient-to-b from-navy-dark to-navy py-8 sm:py-12 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
              <p className="text-white/50 mt-1 text-sm">
                Your longevity assessment overview
              </p>
            </div>
            <button
              onClick={createAssessment}
              className="px-6 py-2.5 bg-gold text-navy font-bold rounded-lg hover:bg-gold-light transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-sm whitespace-nowrap"
            >
              + New Assessment
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Assessments */}
          <Link
            href="/assessments"
            className="bg-white rounded-xl border border-border p-5 hover:shadow-md hover:border-gold/30 transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-navy/5 flex items-center justify-center group-hover:bg-navy/10 transition-colors">
                <svg className="w-4.5 h-4.5 text-navy" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-navy">{totalCount}</p>
            <p className="text-xs text-muted font-medium mt-1">Total Assessments</p>
          </Link>

          {/* Incomplete */}
          <Link
            href="/assessments"
            className="bg-white rounded-xl border border-border p-5 hover:shadow-md hover:border-gold/30 transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center group-hover:bg-gold/15 transition-colors">
                <svg className="w-4.5 h-4.5 text-gold-dark" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-gold-dark">{incompleteCount}</p>
            <p className="text-xs text-muted font-medium mt-1">Incomplete</p>
          </Link>

          {/* Completed */}
          <div className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <svg className="w-4.5 h-4.5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-emerald-600">{completedCount}</p>
            <p className="text-xs text-muted font-medium mt-1">Completed</p>
          </div>

          {/* Clients */}
          <Link
            href="/clients"
            className="bg-white rounded-xl border border-border p-5 hover:shadow-md hover:border-gold/30 transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-navy/5 flex items-center justify-center group-hover:bg-navy/10 transition-colors">
                <svg className="w-4.5 h-4.5 text-navy" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-navy">{clientNames.size}</p>
            <p className="text-xs text-muted font-medium mt-1">Clients</p>
          </Link>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Action Items — wider column */}
          <div className="lg:col-span-3">
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
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-border">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-navy">Recent Assessments</h3>
                <Link
                  href="/assessments"
                  className="text-xs text-muted hover:text-navy font-medium transition-colors"
                >
                  View all
                </Link>
              </div>

              {assessments.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-muted mb-3">No assessments yet</p>
                  <button
                    onClick={createAssessment}
                    className="text-sm font-medium text-gold hover:text-gold-dark transition-colors"
                  >
                    Create your first assessment
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {assessments.slice(0, 5).map((a) => (
                    <Link
                      key={a.id}
                      href={`/assessment/${a.id}/section/${a.currentSection}`}
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
