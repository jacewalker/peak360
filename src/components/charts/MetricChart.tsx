'use client';

/* eslint-disable react/no-unescaped-entities */
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Dot } from 'recharts';
import { TIER_LABELS } from '@/types/normative';
import type { RatingTier } from '@/types/normative';

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
  up: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '↗' },
  down: { bg: 'bg-red-50', text: 'text-red-600', icon: '↘' },
  flat: { bg: 'bg-gray-50', text: 'text-gray-500', icon: '→' },
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
