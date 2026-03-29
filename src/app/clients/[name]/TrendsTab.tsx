'use client';

import { useState, useMemo } from 'react';
/* eslint-disable react/no-unescaped-entities */
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Dot } from 'recharts';
import { REPORT_MARKERS, REPORT_CATEGORIES } from '@/lib/report-markers';
import { TIER_LABELS } from '@/types/normative';
import type { RatingTier } from '@/types/normative';
import type { AssessmentTimeline } from './page';

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

interface ChartPoint {
  date: string;
  value: number;
  tier: RatingTier | null;
}

const TIER_ACCENT: Record<string, string> = {
  elite: 'border-t-emerald-500',
  great: 'border-t-blue-500',
  normal: 'border-t-gray-300',
  cautious: 'border-t-amber-400',
  poor: 'border-t-red-500',
};

const TIER_GLOW: Record<string, string> = {
  elite: 'shadow-emerald-500/8',
  great: 'shadow-blue-500/8',
  normal: 'shadow-gray-400/8',
  cautious: 'shadow-amber-400/8',
  poor: 'shadow-red-500/8',
};

const DELTA_STYLE: Record<string, { bg: string; text: string; icon: string }> = {
  up: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '\u2197' },
  down: { bg: 'bg-red-50', text: 'text-red-600', icon: '\u2198' },
  flat: { bg: 'bg-gray-50', text: 'text-gray-500', icon: '\u2192' },
};

function MetricChart({ label, unit, data }: { label: string; unit: string; data: ChartPoint[] }) {
  const latest = data[data.length - 1];
  const first = data[0];
  const prev = data.length >= 2 ? data[data.length - 2] : null;
  const delta = prev ? latest.value - prev.value : 0;
  const deltaPercent = prev && prev.value !== 0 ? ((delta / prev.value) * 100).toFixed(1) : null;
  const overallDelta = first.value !== 0 ? ((latest.value - first.value) / first.value * 100).toFixed(1) : null;
  const deltaDir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const ds = DELTA_STYLE[deltaDir];

  const tierAccent = latest.tier ? TIER_ACCENT[latest.tier] : 'border-t-gold';
  const tierGlow = latest.tier ? TIER_GLOW[latest.tier] : '';
  const lineColor = latest.tier ? TIER_HEX[latest.tier] : '#F5A623';
  const gradientId = `gradient-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className={`bg-white rounded-xl border border-border border-t-[3px] ${tierAccent} shadow-sm ${tierGlow} hover:shadow-md transition-shadow duration-200 overflow-hidden group`}>
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted/70 uppercase tracking-[0.08em]">{label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-bold text-navy leading-none tracking-tight">{latest.value}</span>
              <span className="text-[11px] text-muted font-medium">{unit}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {latest.tier && (
              <span className={`text-[10px] font-semibold px-2 py-[3px] rounded-md ${TIER_PILL[latest.tier]} flex items-center gap-1`}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TIER_HEX[latest.tier] }} />
                {TIER_LABELS[latest.tier]}
              </span>
            )}
            {deltaPercent !== null && (
              <span className={`text-[10px] font-semibold px-2 py-[3px] rounded-md ${ds.bg} ${ds.text} flex items-center gap-0.5`}>
                <span>{ds.icon}</span>
                {delta > 0 ? '+' : ''}{deltaPercent}%
              </span>
            )}
          </div>
        </div>
        {/* Overall change line */}
        {overallDelta !== null && data.length > 2 && (
          <p className="text-[10px] text-muted mt-2">
            Overall: <span className={`font-medium ${Number(overallDelta) > 0 ? 'text-emerald-600' : Number(overallDelta) < 0 ? 'text-red-500' : 'text-muted'}`}>
              {Number(overallDelta) > 0 ? '+' : ''}{overallDelta}%
            </span>
            <span className="text-muted/40"> across {data.length} assessments</span>
          </p>
        )}
      </div>

      {/* Chart */}
      <div className="h-[110px] px-1 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.15} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: string) => {
                const d = new Date(v);
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                return `${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
              }}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#cbd5e1' }}
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']}
              width={35}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const p = payload[0].payload as ChartPoint;
                return (
                  <div className="bg-navy-dark text-white text-xs rounded-lg px-3.5 py-2.5 shadow-xl border border-white/10">
                    <p className="font-bold text-sm">{p.value} <span className="font-normal text-white/50">{unit}</span></p>
                    <p className="text-white/40 mt-0.5">{p.date}</p>
                    {p.tier && (
                      <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-white/10">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TIER_HEX[p.tier] }} />
                        <span style={{ color: TIER_HEX[p.tier] }} className="font-medium">{TIER_LABELS[p.tier]}</span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={({ cx, cy, payload, index }: Record<string, unknown>) => {
                if (cx == null || cy == null) return <></>;
                const p = payload as ChartPoint;
                const color = p.tier ? TIER_HEX[p.tier] : '#F5A623';
                const isLast = (index as number) === data.length - 1;
                return (
                  <Dot
                    key={index as number}
                    cx={cx as number}
                    cy={cy as number}
                    r={isLast ? 4.5 : 3}
                    fill={color}
                    stroke="white"
                    strokeWidth={isLast ? 2.5 : 1.5}
                  />
                );
              }}
              activeDot={{ r: 6, stroke: lineColor, strokeWidth: 2, fill: 'white' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const TRAJECTORY_ICON: Record<string, { color: string; label: string; arrow: string }> = {
  improving: { color: 'text-emerald-600', label: 'Improving', arrow: '\u2191' },
  stable: { color: 'text-blue-600', label: 'Stable', arrow: '\u2192' },
  declining: { color: 'text-red-500', label: 'Declining', arrow: '\u2193' },
  mixed: { color: 'text-amber-600', label: 'Mixed', arrow: '\u2194' },
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

  // Auto-generate on mount if no cached result
  const hasTriggered = useState(false);
  if (!hasTriggered[0] && !assessment && !loading && !error) {
    hasTriggered[1](true);
    generate();
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-navy-dark to-navy rounded-xl p-8 mb-8 text-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-gold rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-white/50">Analyzing {timelines.length} assessments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-5 mb-8">
        <p className="text-sm text-red-600 mb-2">Failed to generate AI assessment: {error}</p>
        <button onClick={generate} className="text-sm font-medium text-navy hover:text-gold transition-colors">
          Try again
        </button>
      </div>
    );
  }

  if (!assessment) return null;

  const traj = TRAJECTORY_ICON[assessment.trajectory] || TRAJECTORY_ICON.stable;
  const scoreColor = assessment.overallScore >= 75 ? 'text-emerald-500' : assessment.overallScore >= 50 ? 'text-gold' : 'text-red-500';
  const scoreRing = assessment.overallScore >= 75 ? 'border-emerald-500' : assessment.overallScore >= 50 ? 'border-gold' : 'border-red-500';

  return (
    <div className="mb-8 space-y-4">
      {/* Score + Summary */}
      <div className="bg-white rounded-xl border border-border p-4 sm:p-6">
        <div className="flex items-start gap-6">
          {/* Score circle */}
          <div className="shrink-0">
            <div className={`w-20 h-20 rounded-full border-4 ${scoreRing} flex items-center justify-center`}>
              <div className="text-center">
                <p className={`text-2xl font-bold ${scoreColor}`}>{assessment.overallScore}</p>
                <p className="text-[8px] text-muted uppercase font-medium tracking-wider">Score</p>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-navy">AI Health Assessment</h3>
              <span className={`text-xs font-medium ${traj.color} flex items-center gap-1`}>
                <span>{traj.arrow}</span> {traj.label}
              </span>
              {fromCache && (
                <span className="text-[10px] text-muted bg-surface-alt px-2 py-0.5 rounded-full">Cached</span>
              )}
            </div>
            <p className="text-sm text-foreground leading-relaxed">{assessment.summary}</p>
          </div>

          <button
            onClick={generate}
            className="shrink-0 p-2 rounded-lg text-muted hover:text-navy hover:bg-surface-alt transition-colors"
            title="Regenerate"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
        </div>
      </div>

      {/* Strengths + Concerns */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h4 className="text-xs font-semibold text-navy uppercase tracking-wider">Strengths</h4>
          </div>
          <ul className="space-y-2">
            {assessment.strengths.map((s, i) => (
              <li key={i} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-emerald-400 mt-1 shrink-0">&bull;</span>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h4 className="text-xs font-semibold text-navy uppercase tracking-wider">Areas of Concern</h4>
          </div>
          <ul className="space-y-2">
            {assessment.concerns.length === 0 ? (
              <li className="text-sm text-muted">No significant concerns identified</li>
            ) : (
              assessment.concerns.map((c, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-amber-400 mt-1 shrink-0">&bull;</span>
                  {c}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-navy/5 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-navy" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h4 className="text-xs font-semibold text-navy uppercase tracking-wider">Recommendations</h4>
        </div>
        <ol className="space-y-2">
          {assessment.recommendations.map((r, i) => (
            <li key={i} className="text-sm text-foreground flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-gold/10 text-gold-dark text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              {r}
            </li>
          ))}
        </ol>
      </div>

      {/* Category insights */}
      {Object.keys(assessment.categoryInsights).length > 0 && (
        <div className="bg-white rounded-xl border border-border p-5">
          <h4 className="text-xs font-semibold text-navy uppercase tracking-wider mb-3">Category Insights</h4>
          <div className="grid sm:grid-cols-2 gap-3">
            {Object.entries(assessment.categoryInsights).map(([cat, insight]) => (
              <div key={cat} className="bg-surface-alt rounded-lg p-3">
                <p className="text-xs font-medium text-navy mb-1">{cat}</p>
                <p className="text-xs text-muted leading-relaxed">{insight}</p>
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

  // Build time series for each marker that has 2+ data points
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

  // Also collect single-point metrics
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
      {/* AI Assessment */}
      <AiAssessmentPanel clientName={clientName} timelines={timelines} />

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {REPORT_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeCategory === cat
                ? 'bg-navy text-white'
                : 'bg-surface-alt text-muted hover:text-navy hover:bg-navy/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {chartData.length === 0 && singlePoints.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted">No recorded metrics in this category across assessments.</p>
        </div>
      ) : (
        <>
          {/* Charts grid */}
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

          {/* Single-point metrics */}
          {singlePoints.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted/60 mb-3 uppercase tracking-[0.1em]">
                Single measurement — need 2+ for trends
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {singlePoints.map((sp) => (
                  <div
                    key={sp.label}
                    className={`bg-white rounded-xl border border-border border-l-[3px] ${sp.tier ? TIER_ACCENT[sp.tier].replace('border-t-', 'border-l-') : 'border-l-border'} p-3.5 shadow-sm`}
                  >
                    <p className="text-[10px] text-muted/70 font-semibold uppercase tracking-[0.06em] mb-1.5">{sp.label}</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold text-navy tracking-tight">{sp.value}</span>
                      <span className="text-[10px] text-muted font-medium">{sp.unit}</span>
                    </div>
                    {sp.tier && (
                      <span className={`text-[9px] font-semibold px-2 py-[3px] rounded-md mt-2 inline-flex items-center gap-1 ${TIER_PILL[sp.tier]}`}>
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
