import { Svg, Rect, Circle } from '@react-pdf/renderer';
import type { RatingTier, TierRanges } from '@/types/normative';
import { COLORS, TIER_COLORS_PDF } from '@/lib/pdf/colors';

interface RangeBarPdfProps {
  value: number;
  standards: TierRanges;
}

const TIERS: RatingTier[] = ['poor', 'cautious', 'normal', 'great', 'elite'];
const MIN_SEGMENT_PCT = 10;
const BAR_WIDTH = 200;
const BAR_HEIGHT = 12;

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
  const pcts = rawWidths.map((w) => (w / totalRange) * 100);

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

export function RangeBarPdf({ value, standards }: RangeBarPdfProps) {
  const { widths, fullMin, fullMax } = computeSegmentWidths(standards);
  const totalRange = fullMax - fullMin;
  if (totalRange <= 0) return null;

  // Calculate segment positions
  let cumulativeX = 0;
  const segments = TIERS.map((tier, i) => {
    const segWidth = (widths[i] / 100) * BAR_WIDTH;
    const x = cumulativeX;
    cumulativeX += segWidth;
    return { tier, x, width: segWidth };
  });

  // Calculate needle position
  const clamped = Math.max(fullMin, Math.min(fullMax, value));
  const needlePct = ((clamped - fullMin) / totalRange) * 100;
  const needleX = (needlePct / 100) * BAR_WIDTH;

  return (
    <Svg width={BAR_WIDTH} height={BAR_HEIGHT} viewBox={`0 0 ${BAR_WIDTH} ${BAR_HEIGHT}`}>
      {segments.map((seg, i) => (
        <Rect
          key={seg.tier}
          x={seg.x}
          y={2}
          width={seg.width}
          height={8}
          fill={TIER_COLORS_PDF[seg.tier]}
          rx={i === 0 ? 4 : i === segments.length - 1 ? 4 : 0}
        />
      ))}
      <Circle
        cx={needleX}
        cy={6}
        r={4}
        fill={COLORS.navy}
        stroke={COLORS.white}
        strokeWidth={1.5}
      />
    </Svg>
  );
}
