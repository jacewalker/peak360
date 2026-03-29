'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { Assessment } from '@/types/assessment';
import { REPORT_MARKERS, REPORT_CATEGORIES } from '@/lib/report-markers';
import { getPeak360Rating } from '@/lib/normative/ratings';
import type { RatingTier } from '@/types/normative';
import { TIER_LABELS } from '@/types/normative';

const TrendsTab = dynamic(() => import('./TrendsTab'), { ssr: false });

export interface MarkerTimeline {
  value: number;
  tier: RatingTier | null;
  unit: string;
}

export interface AssessmentTimeline {
  assessmentId: string;
  assessmentDate: string;
  markers: Record<string, MarkerTimeline>;
}

const TIER_PILL: Record<RatingTier, string> = {
  elite: 'bg-emerald-50 text-emerald-700',
  great: 'bg-blue-50 text-blue-700',
  normal: 'bg-gray-100 text-gray-600',
  cautious: 'bg-amber-50 text-amber-700',
  poor: 'bg-red-50 text-red-700',
};

export default function ClientDetailPage() {
  const params = useParams();
  const clientName = decodeURIComponent(params.name as string);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [timelines, setTimelines] = useState<AssessmentTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'assessments' | 'trends'>('assessments');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/assessments');
        const json = await res.json();
        const all: Assessment[] = json.data || [];
        const clientAssessments = all
          .filter((a) => a.clientName === clientName)
          .sort((a, b) => (a.assessmentDate || a.createdAt).localeCompare(b.assessmentDate || b.createdAt));

        setAssessments(clientAssessments);

        // Fetch section data for each assessment in parallel
        const sectionsNeeded = [...new Set(REPORT_MARKERS.map((m) => m.section))];
        const timelineResults: AssessmentTimeline[] = await Promise.all(
          clientAssessments.map(async (a) => {
            const sectionData: Record<number, Record<string, unknown>> = {};

            // Fetch section 1 (for age/gender) + measurement sections
            const sectionsToFetch = [1, ...sectionsNeeded];
            const results = await Promise.all(
              sectionsToFetch.map((s) =>
                fetch(`/api/assessments/${a.id}/sections/${s}`)
                  .then((r) => r.json())
                  .then((j) => ({ section: s, data: j.data || {} }))
                  .catch(() => ({ section: s, data: {} }))
              )
            );
            results.forEach((r) => { sectionData[r.section] = r.data; });

            const age = (sectionData[1]?.clientAge as number) || null;
            const gender = (sectionData[1]?.clientGender as string) || null;

            const markers: Record<string, MarkerTimeline> = {};
            for (const m of REPORT_MARKERS) {
              const blob = sectionData[m.section];
              if (!blob) continue;
              const raw = blob[m.dataKey];
              const value = typeof raw === 'number' ? raw : (typeof raw === 'string' && raw !== '' ? Number(raw) : null);
              if (value == null || isNaN(value)) continue;

              const rating = m.hasNorms
                ? getPeak360Rating(m.testKey, value, age ?? undefined, gender ?? undefined)
                : null;
              markers[m.testKey] = {
                value,
                tier: rating?.tier ?? null,
                unit: rating?.unit || m.fallbackUnit || '',
              };
            }

            return {
              assessmentId: a.id,
              assessmentDate: a.assessmentDate || a.createdAt.split('T')[0],
              markers,
            };
          })
        );

        setTimelines(timelineResults);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientName]);

  const clientEmail = assessments[0]?.clientEmail || '';
  const clientGender = assessments[0]?.clientGender || '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="text-sm text-muted">Loading client data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-b from-navy-dark to-navy py-8 sm:py-10 text-white">
        <div className="max-w-5xl mx-auto pl-14 pr-4 sm:px-6 lg:px-6">
          <Link href="/clients" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-4 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to Clients
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-2xl font-bold text-white/80">
              {clientName[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{clientName}</h2>
              <div className="text-white/40 text-sm flex items-center gap-2 mt-0.5">
                {clientEmail && <span>{clientEmail}</span>}
                {clientEmail && clientGender && <span>&bull;</span>}
                {clientGender && <span className="capitalize">{clientGender}</span>}
                <span>&bull;</span>
                <span>{assessments.length} assessment{assessments.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-6">
          <button
            onClick={() => setTab('assessments')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'assessments'
                ? 'border-gold text-navy'
                : 'border-transparent text-muted hover:text-navy'
            }`}
          >
            Assessments
          </button>
          <button
            onClick={() => setTab('trends')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'trends'
                ? 'border-gold text-navy'
                : 'border-transparent text-muted hover:text-navy'
            }`}
          >
            Trends &amp; Analytics
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {tab === 'assessments' ? (
          /* Assessments Tab */
          assessments.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted">No assessments found for this client.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assessments.map((a, idx) => {
                const timeline = timelines[idx];
                const tierCounts: Record<string, number> = {};
                if (timeline) {
                  Object.values(timeline.markers).forEach((m) => {
                    if (m.tier) tierCounts[m.tier] = (tierCounts[m.tier] || 0) + 1;
                  });
                }
                return (
                  <Link
                    key={a.id}
                    href={`/assessment/${a.id}/section/${a.currentSection}`}
                    className="block bg-white rounded-xl border border-border p-5 hover:shadow-md hover:border-gold/30 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-navy">
                          {a.assessmentDate || a.createdAt.split('T')[0]}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          a.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-gold/10 text-gold-dark'
                        }`}>
                          {a.status === 'completed' ? 'Completed' : `Section ${a.currentSection}/11`}
                        </span>
                      </div>
                      <svg className="w-4 h-4 text-muted/40 group-hover:text-navy transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                    {Object.keys(tierCounts).length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(['elite', 'great', 'normal', 'cautious', 'poor'] as RatingTier[]).map((tier) =>
                          tierCounts[tier] ? (
                            <span key={tier} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${TIER_PILL[tier]}`}>
                              {tierCounts[tier]} {TIER_LABELS[tier]}
                            </span>
                          ) : null
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          /* Trends Tab */
          timelines.length < 2 ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-full bg-surface-alt flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <p className="text-navy font-medium mb-1">Not enough data for trends</p>
              <p className="text-sm text-muted">
                Trends will appear once this client has two or more assessments with recorded metrics.
              </p>
            </div>
          ) : (
            <TrendsTab timelines={timelines} clientName={clientName} />
          )
        )}
      </main>
    </div>
  );
}
