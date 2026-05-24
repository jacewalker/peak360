'use client';

import Image from 'next/image';

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
  secondaryLeft?: number | null;
  secondaryRight?: number | null;
  secondaryMetric?: string;
  secondaryDecimals?: number;
  showAsymmetryPercent?: boolean;
  unit: string;
  lowerIsBetter?: boolean;
  date?: string;
}

function asymmetryPct(l: number, r: number): number {
  const max = Math.max(l, r);
  return max > 0 ? (Math.abs(l - r) / max) * 100 : 0;
}

const CATEGORY_STYLES = {
  Strength: 'bg-gold-brand/15 text-gold-brand border border-gold-brand/30',
  Balance: 'bg-status-good/15 text-status-good border border-status-good/30',
  Jump: 'bg-bg-2 text-text border border-line-2',
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
      <line x1="8" y1="10" x2="112" y2="10" stroke="var(--color-line-2)" strokeWidth="1.5" strokeDasharray="4 3" />
      {/* Lower dashed line */}
      <line x1="8" y1="38" x2="112" y2="38" stroke="var(--color-line-2)" strokeWidth="1.5" strokeDasharray="4 3" />
      {/* Baseline */}
      <line x1="8" y1="50" x2="112" y2="50" stroke="var(--color-text-faint)" strokeWidth="2" />
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
  secondaryLeft,
  secondaryRight,
  secondaryMetric,
  secondaryDecimals,
  showAsymmetryPercent,
  unit,
  lowerIsBetter = false,
  date,
}: ValdResultCardProps) {
  const hasLR = left != null && right != null && (left !== 0 || right !== 0);
  const hasSingle = singleValue != null && singleValue !== 0;
  const hasSecondaryLR =
    secondaryLeft != null && secondaryRight != null && (secondaryLeft !== 0 || secondaryRight !== 0);

  if (!hasLR && !hasSingle) return null;

  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const formatVal = (v: number) => {
    if (Number.isInteger(v)) return v.toString();
    return v % 1 === 0 ? v.toString() : v.toFixed(1);
  };

  // Secondary metrics (e.g. Modified RSI) may need finer precision than the
  // 1-decimal default — RSI is conventionally read to 2 decimals.
  const formatSecondary = (v: number) =>
    secondaryDecimals != null ? v.toFixed(secondaryDecimals) : formatVal(v);

  return (
    <div className="bg-bg-3 rounded-2xl border border-line px-5 py-3.5 space-y-2.5 transition-colors hover:border-gold-brand/30 h-full flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h4 className="text-base font-bold text-text tracking-tight leading-tight">{title}</h4>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${CATEGORY_STYLES[category]}`}>
              {category}
            </span>
            {subtitle && (
              <span className="text-xs text-text-faint font-medium">&middot; {subtitle}</span>
            )}
          </div>
        </div>
        {isForceDecks && (
          <div className="flex items-center gap-1.5 border border-line-2 rounded-full px-3 py-1 shrink-0 bg-bg-2">
            <Image src="/images/forcedecks.png" alt="" width={20} height={14} className="object-contain" />
            <span className="font-mono text-[11px] font-medium text-text uppercase tracking-[0.16em]">ForceDecks</span>
          </div>
        )}
      </div>

      {/* Metric label */}
      <p className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">{metric}</p>

      {/* Values */}
      {hasLR && hasSingle ? (
        /* Combined: overall max force + L/R split (e.g., IMTP) */
        <div className="space-y-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-extrabold text-text tabular-nums leading-none">
              {formatVal(singleValue!)}
            </span>
            <span className="text-base font-medium text-text-faint">{unit}</span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-end gap-6 sm:gap-8 min-w-0">
              <div>
                <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-0.5">Left</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-text tabular-nums leading-none">{formatVal(left!)}</span>
                  <span className="text-sm font-medium text-text-faint">{unit}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-0.5">Right</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-text tabular-nums leading-none">{formatVal(right!)}</span>
                  <span className="text-sm font-medium text-text-faint">{unit}</span>
                </div>
              </div>
            </div>
            <div className="shrink-0 hidden sm:block">
              <AsymmetryGraph left={left!} right={right!} />
            </div>
          </div>
          {showAsymmetryPercent && (
            <div>
              <p className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">Max Force Asymmetry</p>
              <span className="text-lg font-bold text-text tabular-nums">{asymmetryPct(left!, right!).toFixed(1)}%</span>
            </div>
          )}
        </div>
      ) : hasLR ? (
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-end gap-6 sm:gap-8 min-w-0">
              {/* Left */}
              <div>
                <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-0.5">Left</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-text tabular-nums leading-none">
                    {formatVal(left!)}
                  </span>
                  <span className="text-sm font-medium text-text-faint">{unit}</span>
                </div>
              </div>
              {/* Right */}
              <div>
                <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-0.5">Right</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-text tabular-nums leading-none">
                    {formatVal(right!)}
                  </span>
                  <span className="text-sm font-medium text-text-faint">{unit}</span>
                </div>
              </div>
            </div>
            {/* Asymmetry graph */}
            <div className="shrink-0 hidden sm:block">
              <AsymmetryGraph left={left!} right={right!} />
            </div>
          </div>
          {/* Secondary L/R row (e.g. Modified RSI) */}
          {hasSecondaryLR && (
            <div className="flex items-end gap-6 sm:gap-8 min-w-0">
              <div>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Left {secondaryMetric}</p>
                <span className="text-lg font-bold text-text tabular-nums leading-none">{formatSecondary(secondaryLeft!)}</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-0.5">Right {secondaryMetric}</p>
                <span className="text-lg font-bold text-text tabular-nums leading-none">{formatSecondary(secondaryRight!)}</span>
              </div>
            </div>
          )}
          {/* Computed asymmetry % */}
          {showAsymmetryPercent && (
            <div>
              <p className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">Max Force Asymmetry</p>
              <span className="text-lg font-bold text-text tabular-nums">{asymmetryPct(left!, right!).toFixed(1)}%</span>
            </div>
          )}
        </div>
      ) : hasSingle ? (
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold text-text tabular-nums leading-none">
                {formatVal(singleValue!)}
              </span>
              <span className="text-base font-medium text-text-faint">{unit}</span>
            </div>
            {secondaryValue != null && secondaryValue !== 0 && (
              <div className="pb-1">
                <p className="text-[10px] text-text-faint uppercase tracking-wider font-medium">{secondaryLabel}</p>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-lg font-bold text-text tabular-nums">{formatSecondary(secondaryValue)}</span>
                  <span className="text-xs text-text-faint">{secondaryUnit}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Description + Date */}
      <div className="flex items-end justify-between gap-4 pt-1 border-t border-line">
        <p className="text-sm text-text-dim leading-relaxed">
          {hasLR
            ? generateDescription(metric, unit, left!, right!, lowerIsBetter)
            : '\u00A0'
          }
        </p>
        {formattedDate && (
          <div className="flex items-center gap-1.5 shrink-0 text-xs text-text-faint">
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
