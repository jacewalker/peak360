'use client';

import { getStandards } from '@/lib/normative/ratings';
import type { RatingTier } from '@/types/normative';

interface RangeBarProps {
  value: number;
  testKey: string;
  age?: number | null;
  gender?: string | null;
}

const SEGMENT_COLORS: Record<RatingTier, string> = {
  poor: 'bg-red-500',
  cautious: 'bg-amber-400',
  normal: 'bg-gray-400',
  great: 'bg-blue-500',
  elite: 'bg-emerald-500',
};

const TIERS: RatingTier[] = ['poor', 'cautious', 'normal', 'great', 'elite'];
const MIN_SEGMENT_PCT = 10;

function computeSegmentWidths(
  ranges: Record<RatingTier, { min: number; max: number }>
): { widths: number[]; fullMin: number; fullMax: number } {
  const rawWidths: number[] = [];
  let fullMin = Infinity;
  let fullMax = -Infinity;

  for (const tier of TIERS) {
    const r = ranges[tier];
    if (r) {
      fullMin = Math.min(fullMin, r.min);
      fullMax = Math.max(fullMax, r.max);
      rawWidths.push(r.max - r.min);
    } else {
      rawWidths.push(0);
    }
  }

  const totalRange = fullMax - fullMin;
  if (totalRange <= 0) {
    return { widths: [20, 20, 20, 20, 20], fullMin, fullMax };
  }

  // Calculate proportional percentages
  let pcts = rawWidths.map((w) => (w / totalRange) * 100);

  // Enforce minimum width: redistribute from widest segments
  let deficit = 0;
  for (let i = 0; i < pcts.length; i++) {
    if (pcts[i] > 0 && pcts[i] < MIN_SEGMENT_PCT) {
      deficit += MIN_SEGMENT_PCT - pcts[i];
      pcts[i] = MIN_SEGMENT_PCT;
    }
  }

  if (deficit > 0) {
    // Collect segments that can shrink (above minimum)
    const shrinkable = pcts
      .map((p, i) => ({ i, p }))
      .filter((x) => x.p > MIN_SEGMENT_PCT)
      .sort((a, b) => b.p - a.p);

    const totalShrinkable = shrinkable.reduce((s, x) => s + (x.p - MIN_SEGMENT_PCT), 0);

    if (totalShrinkable > 0) {
      for (const seg of shrinkable) {
        const share = ((seg.p - MIN_SEGMENT_PCT) / totalShrinkable) * deficit;
        pcts[seg.i] -= share;
      }
    }
  }

  return { widths: pcts, fullMin, fullMax };
}

export function RangeBar({ value, testKey, age, gender }: RangeBarProps) {
  const { standards } = getStandards(testKey, age, gender);
  if (!standards) return null;

  const { widths, fullMin, fullMax } = computeSegmentWidths(standards);
  const totalRange = fullMax - fullMin;
  if (totalRange <= 0) return null;

  const clamped = Math.max(fullMin, Math.min(fullMax, value));
  const needlePct = ((clamped - fullMin) / totalRange) * 100;

  return (
    <div className="relative w-full h-3 mt-0.5">
      {/* Segmented bar */}
      <div className="flex w-full h-full rounded-full overflow-hidden">
        {TIERS.map((tier, i) => (
          <div
            key={tier}
            className={`${SEGMENT_COLORS[tier]} h-full ${i === 0 ? 'rounded-l-full' : ''} ${i === TIERS.length - 1 ? 'rounded-r-full' : ''}`}
            style={{ width: `${widths[i]}%` }}
          />
        ))}
      </div>
      {/* Needle indicator */}
      <div
        className="absolute top-0 h-full flex flex-col items-center"
        style={{ left: `${needlePct}%`, transform: 'translateX(-50%)' }}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-[#1a365d] border-2 border-white shadow-sm" style={{ marginTop: '-1px' }} />
        <div className="w-0.5 h-1.5 bg-[#1a365d]" style={{ marginTop: '-2px' }} />
      </div>
    </div>
  );
}
