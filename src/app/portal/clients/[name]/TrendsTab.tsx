'use client';

import { useState, useMemo } from 'react';
/* eslint-disable react/no-unescaped-entities */
import { REPORT_MARKERS, REPORT_CATEGORIES } from '@/lib/report-markers';
import { TIER_LABELS } from '@/types/normative';
import type { RatingTier } from '@/types/normative';
import type { AssessmentTimeline } from './page';
import MetricChart, { type ChartPoint } from '@/components/charts/MetricChart';
import MonoEyebrow from '@/components/ui/MonoEyebrow';

interface TrendsTabProps {
  timelines: AssessmentTimeline[];
  clientName: string;
}

interface AiAssessment {
  overallScore: number;
  trajectory: 'improving' | 'stable' | 'declining' | 'mixed';
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  categoryInsights: Record<string, string>;
}

// Rating-tier marker palette — preserved verbatim per Phase 9 UI-SPEC §Color.
const TIER_HEX: Record<string, string> = {
  elite: '#10b981',
  great: '#3b82f6',
  normal: '#6b7280',
  cautious: '#f59e0b',
  poor: '#ef4444',
};

const TIER_PILL: Record<string, string> = {
  elite: 'bg-emerald-50 text-emerald-700',
  great: 'bg-blue-50 text-blue-700',
  normal: 'bg-gray-100 text-gray-600',
  cautious: 'bg-amber-50 text-amber-700',
  poor: 'bg-red-50 text-red-700',
};

const TIER_ACCENT: Record<string, string> = {
  elite: 'border-t-emerald-500',
  great: 'border-t-blue-500',
  normal: 'border-t-gray-300',
  cautious: 'border-t-amber-400',
  poor: 'border-t-red-500',
};

const TRAJECTORY_ICON: Record<string, { color: string; label: string; arrow: string }> = {
  improving: { color: 'text-status-good', label: 'Improving', arrow: '↑' },
  stable: { color: 'text-text-dim', label: 'Stable', arrow: '→' },
  declining: { color: 'text-danger', label: 'Declining', arrow: '↓' },
  mixed: { color: 'text-gold-brand', label: 'Mixed', arrow: '↔' },
};

function getCacheKey(clientName: string) {
  return `peak360_ai_assessment_${clientName}`;
}

function getCachedAssessment(clientName: string, assessmentCount: number): AiAssessment | null {
  try {
    const raw = localStorage.getItem(getCacheKey(clientName));
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (cached.assessmentCount === assessmentCount && cached.data) {
      return cached.data as AiAssessment;
    }
    return null;
  } catch {
    return null;
  }
}

function setCachedAssessment(clientName: string, assessmentCount: number, data: AiAssessment) {
  try {
    localStorage.setItem(getCacheKey(clientName), JSON.stringify({ assessmentCount, data }));
  } catch {
    // storage full — ignore
  }
}

function AiAssessmentPanel({ clientName, timelines }: { clientName: string; timelines: AssessmentTimeline[] }) {
  const assessmentCount = timelines.length;
  const [assessment, setAssessment] = useState<AiAssessment | null>(() =>
    getCachedAssessment(clientName, assessmentCount)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(() => getCachedAssessment(clientName, assessmentCount) !== null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const summaryTimelines = timelines.map((tl) => ({
        date: tl.assessmentDate,
        markers: Object.entries(tl.markers).reduce((acc, [key, m]) => {
          const marker = REPORT_MARKERS.find((rm) => rm.testKey === key);
          acc[marker?.label || key] = { value: m.value, unit: m.unit, tier: m.tier };
          return acc;
        }, {} as Record<string, { value: number; unit: string; tier: string | null }>),
      }));

      const res = await fetch('/api/ai/client-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, timelines: summaryTimelines }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate');
      setAssessment(json.data);
      setFromCache(false);
      setCachedAssessment(clientName, assessmentCount, json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const hasTriggered = useState(false);
  if (!hasTriggered[0] && !assessment && !loading && !error) {
    hasTriggered[1](true);
    generate();
  }

  if (loading) {
    return (
      <div className="bg-bg-3 border border-line rounded-xl p-8 mb-8 text-center">
        <div className="w-6 h-6 border-2 border-line border-t-gold-brand rounded-full animate-spin mx-auto mb-3" />
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-brand">Analyzing {timelines.length} assessments…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-bg-3 rounded-xl border border-danger/40 p-5 mb-8">
        <p className="text-[13px] text-danger mb-2">Failed to generate AI assessment: {error}</p>
        <button onClick={generate} className="text-[13px] font-medium text-text hover:text-gold-brand transition-colors">
          Try again
        </button>
      </div>
    );
  }

  if (!assessment) return null;

  const traj = TRAJECTORY_ICON[assessment.trajectory] || TRAJECTORY_ICON.stable;
  const scoreColor = assessment.overallScore >= 75 ? 'text-status-good' : assessment.overallScore >= 50 ? 'text-gold-brand' : 'text-danger';
  const scoreRing = assessment.overallScore >= 75 ? 'border-status-good' : assessment.overallScore >= 50 ? 'border-gold-brand' : 'border-danger';

  return (
    <div className="mb-8 space-y-4">
      {/* Score + Summary */}
      <div className="bg-bg-3 rounded-xl border border-line p-6">
        <div className="flex items-start gap-6">
          {/* Score circle */}
          <div className="shrink-0">
            <div className={`w-20 h-20 rounded-full border-4 ${scoreRing} flex items-center justify-center`}>
              <div className="text-center">
                <p className={`font-mono text-[20px] font-medium ${scoreColor}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{assessment.overallScore}</p>
                <p className="font-mono text-[11px] text-text-faint uppercase font-medium tracking-[0.16em]">Score</p>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <MonoEyebrow variant="meta" as="span">AI · HEALTH ASSESSMENT</MonoEyebrow>
              <span className={`font-mono text-[11px] uppercase tracking-[0.16em] ${traj.color} flex items-center gap-1`}>
                <span>{traj.arrow}</span> {traj.label.toUpperCase()}
              </span>
              {fromCache && (
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-faint bg-bg-2 px-2 py-0.5 rounded-full">Cached</span>
              )}
            </div>
            <p className="text-[13px] text-text leading-[1.55]">{assessment.summary}</p>
          </div>

          <button
            onClick={generate}
            aria-label="Regenerate AI assessment"
            className="shrink-0 p-2 rounded-lg text-text-dim hover:text-gold-brand hover:bg-bg-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
        </div>
      </div>

      {/* Strengths + Concerns */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-bg-3 rounded-xl border border-line p-5">
          <MonoEyebrow variant="hero" as="div" className="mb-3">STRENGTHS</MonoEyebrow>
          <ul className="space-y-2">
            {assessment.strengths.map((s, i) => (
              <li key={i} className="text-[13px] text-text flex items-start gap-2 leading-[1.55]">
                <span className="text-status-good mt-1 shrink-0">&bull;</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-bg-3 rounded-xl border border-line p-5">
          <MonoEyebrow variant="hero" as="div" className="mb-3">AREAS OF CONCERN</MonoEyebrow>
          <ul className="space-y-2">
            {assessment.concerns.length === 0 ? (
              <li className="text-[13px] text-text-dim">No significant concerns identified.</li>
            ) : (
              assessment.concerns.map((c, i) => (
                <li key={i} className="text-[13px] text-text flex items-start gap-2 leading-[1.55]">
                  <span className="text-gold-brand mt-1 shrink-0">&bull;</span>
                  {c}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-bg-3 rounded-xl border border-line p-5">
        <MonoEyebrow variant="hero" as="div" className="mb-3">RECOMMENDATIONS</MonoEyebrow>
        <ol className="space-y-2">
          {assessment.recommendations.map((r, i) => (
            <li key={i} className="text-[13px] text-text flex items-start gap-3 leading-[1.55]">
              <span className="w-5 h-5 rounded-full bg-gold-brand/10 text-gold-brand font-mono text-[11px] font-medium flex items-center justify-center shrink-0 mt-0.5" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {i + 1}
              </span>
              {r}
            </li>
          ))}
        </ol>
      </div>

      {/* Category insights */}
      {Object.keys(assessment.categoryInsights).length > 0 && (
        <div className="bg-bg-3 rounded-xl border border-line p-5">
          <MonoEyebrow variant="hero" as="div" className="mb-3">CATEGORY INSIGHTS</MonoEyebrow>
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(assessment.categoryInsights).map(([cat, insight]) => (
              <div key={cat} className="bg-bg-2 rounded-lg p-3">
                <p className="text-[13px] font-medium text-text mb-1">{cat}</p>
                <p className="text-[13px] text-text-dim leading-[1.55]">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrendsTab({ timelines, clientName }: TrendsTabProps) {
  const [activeCategory, setActiveCategory] = useState(REPORT_CATEGORIES[0]);

  const chartData = useMemo(() => {
    const result: { testKey: string; label: string; unit: string; data: ChartPoint[] }[] = [];

    const categoryMarkers = REPORT_MARKERS.filter((m) => m.category === activeCategory);

    for (const marker of categoryMarkers) {
      const points: ChartPoint[] = [];
      for (const tl of timelines) {
        const entry = tl.markers[marker.testKey];
        if (entry) {
          points.push({
            date: tl.assessmentDate,
            value: entry.value,
            tier: entry.tier,
          });
        }
      }
      if (points.length >= 2) {
        result.push({
          testKey: marker.testKey,
          label: marker.label,
          unit: points[0]?.tier ? '' : (marker.fallbackUnit || ''),
          data: points,
        });
      }
    }

    return result;
  }, [timelines, activeCategory]);

  const singlePoints = useMemo(() => {
    const result: { label: string; value: number; unit: string; tier: RatingTier | null }[] = [];
    const categoryMarkers = REPORT_MARKERS.filter((m) => m.category === activeCategory);

    for (const marker of categoryMarkers) {
      const points: { value: number; tier: RatingTier | null; unit: string }[] = [];
      for (const tl of timelines) {
        const entry = tl.markers[marker.testKey];
        if (entry) points.push(entry);
      }
      if (points.length === 1) {
        result.push({
          label: marker.label,
          value: points[0].value,
          unit: points[0].unit || marker.fallbackUnit || '',
          tier: points[0].tier,
        });
      }
    }
    return result;
  }, [timelines, activeCategory]);

  return (
    <div>
      <AiAssessmentPanel clientName={clientName} timelines={timelines} />

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {REPORT_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium tracking-[0.02em] transition-colors ${
              activeCategory === cat
                ? 'bg-gold-brand text-bg'
                : 'bg-bg-2 text-text-dim hover:text-text hover:bg-line'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {chartData.length === 0 && singlePoints.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[13px] text-text-dim">No recorded metrics in this category across assessments.</p>
        </div>
      ) : (
        <>
          {chartData.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
              {chartData.map((chart) => (
                <MetricChart
                  key={chart.testKey}
                  label={chart.label}
                  unit={chart.unit}
                  data={chart.data}
                />
              ))}
            </div>
          )}

          {singlePoints.length > 0 && (
            <div>
              <p className="font-mono text-[11px] font-medium text-text-faint mb-3 uppercase tracking-[0.18em]">
                Single measurement — need 2+ for trends
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {singlePoints.map((sp) => (
                  <div
                    key={sp.label}
                    className={`bg-bg-3 rounded-xl border border-line border-l-[3px] ${sp.tier ? TIER_ACCENT[sp.tier].replace('border-t-', 'border-l-') : 'border-l-line'} p-3.5`}
                  >
                    <p className="font-mono text-[11px] text-text-faint font-medium uppercase tracking-[0.18em] mb-1.5">{sp.label}</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-[20px] font-medium text-text tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{sp.value}</span>
                      <span className="text-[11px] text-text-dim font-medium">{sp.unit}</span>
                    </div>
                    {sp.tier && (
                      <span className={`text-[11px] font-medium px-2 py-[3px] rounded-md mt-2 inline-flex items-center gap-1 ${TIER_PILL[sp.tier]}`}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TIER_HEX[sp.tier] }} />
                        {TIER_LABELS[sp.tier]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
