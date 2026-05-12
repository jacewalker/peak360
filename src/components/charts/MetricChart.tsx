'use client';

/* eslint-disable react/no-unescaped-entities */
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Dot } from 'recharts';
import { TIER_LABELS } from '@/types/normative';
import type { RatingTier } from '@/types/normative';

// Rating-tier marker palette — preserved verbatim per Phase 9 UI-SPEC §Color
// "Rating tier palette (5-tier marker colours) — preserved verbatim". These are
// domain-specific (poor/cautious/normal/great/elite) and NOT Phase 9 design tokens.
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

const TIER_GLOW: Record<string, string> = {
  elite: 'shadow-emerald-500/8',
  great: 'shadow-blue-500/8',
  normal: 'shadow-gray-400/8',
  cautious: 'shadow-amber-400/8',
  poor: 'shadow-red-500/8',
};

const DELTA_STYLE: Record<string, { bg: string; text: string; icon: string }> = {
  up: { bg: 'bg-status-good/10', text: 'text-status-good', icon: '↗' },
  down: { bg: 'bg-danger/10', text: 'text-danger', icon: '↘' },
  flat: { bg: 'bg-bg-2', text: 'text-text-dim', icon: '→' },
};

export interface ChartPoint {
  date: string;
  value: number;
  tier: RatingTier | null;
}

export default function MetricChart({ label, unit, data }: { label: string; unit: string; data: ChartPoint[] }) {
  const latest = data[data.length - 1];
  const first = data[0];
  const prev = data.length >= 2 ? data[data.length - 2] : null;
  const delta = prev ? latest.value - prev.value : 0;
  const deltaPercent = prev && prev.value !== 0 ? ((delta / prev.value) * 100).toFixed(1) : null;
  const overallDelta = first.value !== 0 ? ((latest.value - first.value) / first.value * 100).toFixed(1) : null;
  const deltaDir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const ds = DELTA_STYLE[deltaDir];

  const tierAccent = latest.tier ? TIER_ACCENT[latest.tier] : 'border-t-gold-brand';
  const tierGlow = latest.tier ? TIER_GLOW[latest.tier] : '';
  // Default series stroke resolves to gold-brand via CSS variable (RESEARCH §A7 — Recharts accepts var())
  const lineColor = latest.tier ? TIER_HEX[latest.tier] : 'var(--color-gold-brand)';
  const gradientId = `gradient-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className={`bg-bg-3 rounded-xl border border-line border-t-[3px] ${tierAccent} shadow-sm ${tierGlow} hover:shadow-md transition-shadow duration-200 overflow-hidden group`}>
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">{label}</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[20px] font-medium text-text leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>{latest.value}</span>
              <span className="text-[11px] text-text-dim font-medium">{unit}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {latest.tier && (
              <span className={`text-[11px] font-medium px-2 py-[3px] rounded-md ${TIER_PILL[latest.tier]} flex items-center gap-1`}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TIER_HEX[latest.tier] }} />
                {TIER_LABELS[latest.tier]}
              </span>
            )}
            {deltaPercent !== null && (
              <span className={`text-[11px] font-medium px-2 py-[3px] rounded-md ${ds.bg} ${ds.text} flex items-center gap-0.5`}>
                <span>{ds.icon}</span>
                {delta > 0 ? '+' : ''}{deltaPercent}%
              </span>
            )}
          </div>
        </div>
        {/* Overall change line */}
        {overallDelta !== null && data.length > 2 && (
          <p className="text-[11px] text-text-dim mt-2">
            Overall: <span className={`font-medium ${Number(overallDelta) > 0 ? 'text-status-good' : Number(overallDelta) < 0 ? 'text-danger' : 'text-text-dim'}`}>
              {Number(overallDelta) > 0 ? '+' : ''}{overallDelta}%
            </span>
            <span className="text-text-faint"> across {data.length} assessments</span>
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
              tick={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--color-text-faint)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: string) => {
                const d = new Date(v);
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                return `${months[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
              }}
            />
            <YAxis
              tick={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--color-text-faint)' }}
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
                  <div className="bg-bg-3 text-text text-[11px] rounded-lg px-3.5 py-2.5 shadow-xl border border-line-2">
                    <p className="font-medium text-[13px]">{p.value} <span className="font-normal text-text-dim">{unit}</span></p>
                    <p className="text-text-faint mt-0.5">{p.date}</p>
                    {p.tier && (
                      <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-line-2">
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
                const color = p.tier ? TIER_HEX[p.tier] : 'var(--color-gold-brand)';
                const isLast = (index as number) === data.length - 1;
                return (
                  <Dot
                    key={index as number}
                    cx={cx as number}
                    cy={cy as number}
                    r={isLast ? 4.5 : 3}
                    fill={color}
                    stroke="var(--color-bg-3)"
                    strokeWidth={isLast ? 2.5 : 1.5}
                  />
                );
              }}
              activeDot={{ r: 6, stroke: lineColor, strokeWidth: 2, fill: 'var(--color-bg-3)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
