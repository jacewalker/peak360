'use client';

interface ValdResultCardProps {
  title: string;
  category: 'Strength' | 'Balance' | 'Jump';
  metric: string;
  subtitle?: string;
  isForceDecks?: boolean;
  left?: number | null;
  right?: number | null;
  singleValue?: number | null;
  secondaryLabel?: string;
  secondaryValue?: number | null;
  secondaryUnit?: string;
  unit: string;
  lowerIsBetter?: boolean;
  date?: string;
}

const CATEGORY_STYLES = {
  Strength: 'bg-navy text-white',
  Balance: 'bg-emerald-700 text-white',
  Jump: 'bg-red-400 text-white',
} as const;

function AsymmetryGraph({ left, right }: { left: number; right: number }) {
  const max = Math.max(left, right);
  const diff = max > 0 ? Math.abs(left - right) / max : 0;
  // Spread: 0 when equal, up to 16px apart each from center
  const spread = diff * 16;
  const centerY = 24;
  // Blue = left, Orange = right. Higher value goes up.
  const leftY = left >= right ? centerY - spread : centerY + spread;
  const rightY = right >= left ? centerY - spread : centerY + spread;

  return (
    <svg viewBox="0 0 120 56" className="w-[120px] h-[56px]" aria-hidden>
      {/* Upper dashed line */}
      <line x1="8" y1="10" x2="112" y2="10" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 3" />
      {/* Lower dashed line */}
      <line x1="8" y1="38" x2="112" y2="38" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 3" />
      {/* Baseline */}
      <line x1="8" y1="50" x2="112" y2="50" stroke="#94a3b8" strokeWidth="2" />
      {/* Left dot (blue) */}
      <circle cx={52} cy={leftY} r="5" fill="#3b82f6" />
      {/* Right dot (orange) */}
      <circle cx={68} cy={rightY} r="5" fill="#f59e0b" />
    </svg>
  );
}

function generateDescription(
  metric: string,
  unit: string,
  left: number,
  right: number,
  lowerIsBetter: boolean,
): string {
  const diff = Math.abs(left - right);
  const higher = Math.max(left, right);
  const pct = higher > 0 ? (diff / higher) * 100 : 0;
  const metricLower = metric.toLowerCase();

  // Format diff nicely
  const diffStr = Number.isInteger(diff) ? diff.toString() : diff.toFixed(1);

  if (pct < 5) {
    return `Your left ${metricLower} is similar to your right.`;
  }

  if (lowerIsBetter) {
    // For balance area: lower = better
    if (left < right) {
      return `Your left ${metricLower} is ${diffStr} ${unit} less than your right.`;
    }
    return `Your left ${metricLower} is ${diffStr} ${unit} more than your right.`;
  }

  if (left > right) {
    return `Your left ${metricLower} is ${diffStr} ${unit} more than your right.`;
  }
  return `Your left ${metricLower} is ${diffStr} ${unit} less than your right.`;
}

export default function ValdResultCard({
  title,
  category,
  metric,
  subtitle,
  isForceDecks,
  left,
  right,
  singleValue,
  secondaryLabel,
  secondaryValue,
  secondaryUnit,
  unit,
  lowerIsBetter = false,
  date,
}: ValdResultCardProps) {
  const hasLR = left != null && right != null && (left !== 0 || right !== 0);
  const hasSingle = singleValue != null && singleValue !== 0;

  if (!hasLR && !hasSingle) return null;

  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const formatVal = (v: number) => {
    if (Number.isInteger(v)) return v.toString();
    return v % 1 === 0 ? v.toString() : v.toFixed(1);
  };

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/80 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] px-5 py-3.5 space-y-2.5 transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.04)] h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h4 className="text-base font-bold text-slate-900 tracking-tight leading-tight">{title}</h4>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${CATEGORY_STYLES[category]}`}>
              {category}
            </span>
            {subtitle && (
              <span className="text-xs text-slate-400 font-medium">&middot; {subtitle}</span>
            )}
          </div>
        </div>
        {isForceDecks && (
          <div className="flex items-center gap-1.5 border border-slate-300 rounded-full px-3 py-1 shrink-0 bg-white">
            <img src="/images/forcedecks.png" alt="" width={20} height={14} className="object-contain" />
            <span className="text-xs font-bold text-navy tracking-tight">ForceDecks</span>
          </div>
        )}
      </div>

      {/* Metric label */}
      <p className="text-xs font-bold text-navy tracking-tight">{metric}</p>

      {/* Values */}
      {hasLR && hasSingle ? (
        /* Combined: overall max force + L/R split (e.g., IMTP) */
        <div className="space-y-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tabular-nums leading-none">
              {formatVal(singleValue!)}
            </span>
            <span className="text-base font-medium text-slate-400">{unit}</span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-end gap-6 sm:gap-8 min-w-0">
              <div>
                <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-0.5">Left</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums leading-none">{formatVal(left!)}</span>
                  <span className="text-sm font-medium text-slate-400">{unit}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-0.5">Right</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums leading-none">{formatVal(right!)}</span>
                  <span className="text-sm font-medium text-slate-400">{unit}</span>
                </div>
              </div>
            </div>
            <div className="shrink-0 hidden sm:block">
              <AsymmetryGraph left={left!} right={right!} />
            </div>
          </div>
        </div>
      ) : hasLR ? (
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-end gap-6 sm:gap-8 min-w-0">
            {/* Left */}
            <div>
              <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-0.5">Left</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums leading-none">
                  {formatVal(left!)}
                </span>
                <span className="text-sm font-medium text-slate-400">{unit}</span>
              </div>
            </div>
            {/* Right */}
            <div>
              <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-0.5">Right</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums leading-none">
                  {formatVal(right!)}
                </span>
                <span className="text-sm font-medium text-slate-400">{unit}</span>
              </div>
            </div>
          </div>
          {/* Asymmetry graph */}
          <div className="shrink-0 hidden sm:block">
            <AsymmetryGraph left={left!} right={right!} />
          </div>
        </div>
      ) : hasSingle ? (
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tabular-nums leading-none">
                {formatVal(singleValue!)}
              </span>
              <span className="text-base font-medium text-slate-400">{unit}</span>
            </div>
            {secondaryValue != null && secondaryValue !== 0 && (
              <div className="pb-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{secondaryLabel}</p>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-lg font-bold text-slate-700 tabular-nums">{formatVal(secondaryValue)}</span>
                  <span className="text-xs text-slate-400">{secondaryUnit}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Description + Date */}
      <div className="flex items-end justify-between gap-4 pt-1 border-t border-slate-100">
        <p className="text-sm text-slate-500 leading-relaxed">
          {hasLR
            ? generateDescription(metric, unit, left!, right!, lowerIsBetter)
            : '\u00A0'
          }
        </p>
        {formattedDate && (
          <div className="flex items-center gap-1.5 shrink-0 text-xs text-slate-400">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="12" height="11" rx="2" />
              <path d="M2 7h12M5 1v4M11 1v4" strokeLinecap="round" />
            </svg>
            <span className="font-medium">{formattedDate}</span>
          </div>
        )}
      </div>
    </div>
  );
}
