import { Page, View, Text, Svg, Circle } from '@react-pdf/renderer';
import {
  COLORS,
  TIER_COLORS_PDF,
  TRAFFIC_LIGHT_HEX,
} from '@/lib/pdf/colors';
import { FONT } from '@/lib/pdf/fonts';
import { styles } from '@/lib/pdf/styles';
import { computeAllPillarScores } from '@/lib/pillars/mapping';
import { markerToPillar } from '@/lib/pillars/mapping';
import type {
  PillarDefinition,
  PillarPageCopy,
  PillarPrescription,
  PillarKey,
  PillarStatus,
} from '@/lib/pillars/types';
import type { ReportMarker } from '@/lib/pdf/types';
import type { RatingTier } from '@/types/normative';

/**
 * Phase 8 — D-26 Pillars page (Option 2 visual — see
 * mockups/pillar-options.html lines 162-245).
 *
 * Single A4 mirror of the portal's Peak Living module. Each card mimics
 * the portal Option 2 design:
 *   - Mono "P · NN" eyebrow keyed to sortOrder
 *   - SVG ring gauge driven by the pillar score (no conic-gradient — we
 *     use stroke-dasharray on a Circle rotated -90° so the arc starts at
 *     12-o'clock)
 *   - Pillar name + uppercase status label coloured by traffic-light state
 *   - Top-3 worst-tier-first contributor rows (dot + label + tier name)
 *
 * D-11 anti-pattern: ring accent uses ONLY the traffic-light palette
 * (TRAFFIC_LIGHT_HEX). The 5-tier marker palette (TIER_COLORS_PDF) is
 * reserved for the contributor chips — it lives at the marker layer, not
 * the pillar layer.
 *
 * Defensive: any computeScore edge case yields '—' rather than throwing —
 * never hard-fail PDF generation.
 *
 * Inserted BEFORE TierSummary by Peak360Report.tsx (D-26, D-27 — existing
 * blocks unchanged in shape and order).
 */

// Worst-tier-first ranking for contributor chip selection
const TIER_RANK: Record<RatingTier, number> = {
  poor: 0,
  cautious: 1,
  normal: 2,
  great: 3,
  elite: 4,
};

// Status labels match the portal Option 2 wording (PillarsDisplay.tsx)
const STATUS_LABEL: Record<PillarStatus, string> = {
  green: 'Strong',
  amber: 'Needs focus',
  red: 'Priority',
  pending: 'Awaiting data',
};

// Dark-portal status text — brightened 300-shade equivalents for legibility on dark page.
const STATUS_TEXT: Record<PillarStatus, string> = {
  green: '#6ee7b7', // emerald-300
  amber: '#fcd34d', // amber-300
  red: '#fca5a5', // red-300
  pending: COLORS.textSecondary,
};

// Pending ring on dark — faint cream (matches in-app rgba(255,255,255,0.06) conic neutral).
const PENDING_RING = '#23221f'; // matches COLORS.border

function getTopContributors(
  pillarKey: PillarKey,
  markers: ReportMarker[],
): ReportMarker[] {
  return markers
    .filter((m) => {
      const cls = markerToPillar(m);
      return cls.pillar === pillarKey && !cls.supporting;
    })
    .slice() // copy before sort
    .sort((a, b) => {
      const ra = a.tier ? TIER_RANK[a.tier] : 99;
      const rb = b.tier ? TIER_RANK[b.tier] : 99;
      return ra - rb;
    })
    .slice(0, 3);
}

interface RingGaugeProps {
  score: number | null;
  status: PillarStatus;
  size?: number;
}

/**
 * Ring gauge built with @react-pdf/renderer's Svg + Circle. We use
 * `strokeDasharray` on the progress circle to draw an arc whose length
 * is `pct%` of the circumference; rotating the circle by -90° starts
 * the arc at 12-o'clock (mirroring the portal conic-gradient).
 *
 * Because @react-pdf/renderer's SVG <Text> rendering is unreliable, the
 * centre numeric is laid out as a positioned <Text> overlay inside a
 * wrapping <View> rather than as an SVG element.
 */
function RingGauge({ score, status, size = 60 }: RingGaugeProps) {
  const isPending = status === 'pending';
  const pct = isPending || score === null ? 0 : Math.max(0, Math.min(100, score));
  const accent = isPending ? PENDING_RING : TRAFFIC_LIGHT_HEX[status];

  const strokeWidth = 6;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const arcLen = (pct / 100) * circumference;

  return (
    <View
      style={{
        width: size,
        height: size,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={COLORS.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc — rotated -90° so it starts at 12-o'clock */}
        {pct > 0 ? (
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={accent}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${arcLen} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ) : null}
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontFamily: FONT.bold,
            color: COLORS.textPrimary,
          }}
        >
          {isPending || score === null ? '—' : `${score}`}
        </Text>
      </View>
    </View>
  );
}

export interface PillarsPageProps {
  definitions: PillarDefinition[];
  pageCopy: PillarPageCopy | null;
  prescriptions: PillarPrescription[];
  markers: ReportMarker[];
}

export default function PillarsPage({
  definitions,
  pageCopy,
  // prescriptions is intentionally unused now: per Option 2 the card has
  // no prescription summary block. Recommendations live in the portal
  // drawer (Section 7) and any future dedicated PDF page.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prescriptions: _prescriptions,
  markers,
}: PillarsPageProps) {
  // Defensive: never throw in PDF generation
  let scores: ReturnType<typeof computeAllPillarScores>;
  try {
    scores = computeAllPillarScores(markers);
  } catch {
    // Synthesise an all-pending result so each card simply shows "—"
    scores = {
      cardiometabolic: { score: null, status: 'pending', contributingCount: 0, tierCounts: { elite: 0, great: 0, normal: 0, cautious: 0, poor: 0 } },
      bodyComposition: { score: null, status: 'pending', contributingCount: 0, tierCounts: { elite: 0, great: 0, normal: 0, cautious: 0, poor: 0 } },
      strength: { score: null, status: 'pending', contributingCount: 0, tierCounts: { elite: 0, great: 0, normal: 0, cautious: 0, poor: 0 } },
      balance: { score: null, status: 'pending', contributingCount: 0, tierCounts: { elite: 0, great: 0, normal: 0, cautious: 0, poor: 0 } },
      vo2: { score: null, status: 'pending', contributingCount: 0, tierCounts: { elite: 0, great: 0, normal: 0, cautious: 0, poor: 0 } },
    };
  }

  const heading = pageCopy?.heading ?? 'The Peak Living Pillars';
  const intro = pageCopy?.intro ?? '';
  const sorted = [...definitions].sort((a, b) => a.sortOrder - b.sortOrder);

  const renderCard = (d: PillarDefinition) => {
    const r = scores[d.pillarKey];
    const isPending = r.status === 'pending';
    const top = getTopContributors(d.pillarKey, markers);
    const eyebrow = `P · ${String(d.sortOrder).padStart(2, '0')}`;

    return (
      <View
        key={d.pillarKey}
        style={{
          flex: 1,
          minWidth: 0,
          borderWidth: isPending ? 1 : 0.5,
          borderStyle: isPending ? 'dashed' : 'solid',
          borderColor: COLORS.border,
          borderRadius: 8,
          padding: 6,
          backgroundColor: COLORS.bgLighter,
          alignItems: 'center',
        }}
      >
        {/* 1. Mono eyebrow — left-aligned via self-start equivalent */}
        <Text
          style={{
            fontSize: 7,
            fontFamily: FONT.bold,
            color: COLORS.textSecondary,
            letterSpacing: 0.6,
            alignSelf: 'flex-start',
          }}
        >
          {eyebrow.toUpperCase()}
        </Text>

        {/* 2. Ring gauge */}
        <View style={{ marginTop: 4, marginBottom: 4 }}>
          <RingGauge score={r.score} status={r.status} size={48} />
        </View>

        {/* 3. Pillar name + status label */}
        <Text
          style={{
            fontSize: 8,
            fontFamily: FONT.bold,
            color: COLORS.textPrimary,
            textAlign: 'center',
          }}
        >
          {d.label}
        </Text>
        <Text
          style={{
            marginTop: 2,
            fontSize: 7,
            fontFamily: FONT.bold,
            color: STATUS_TEXT[r.status],
            letterSpacing: 0.6,
            textAlign: 'center',
          }}
        >
          {STATUS_LABEL[r.status].toUpperCase()}
        </Text>

        {/* 4. Top-3 contributor rows */}
        <View
          style={{
            marginTop: 8,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {top.length === 0 ? (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: PENDING_RING,
                }}
              />
              <Text
                style={{ fontSize: 7, color: COLORS.textSecondary, flex: 1 }}
              >
                Awaiting data
              </Text>
            </View>
          ) : (
            top.map((m) => {
              const dotColor = m.tier ? TIER_COLORS_PDF[m.tier] : PENDING_RING;
              const tierName = m.tier ?? 'pending';
              return (
                <View
                  key={m.key}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 2,
                  }}
                >
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: dotColor,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 7,
                      color: COLORS.textPrimary,
                      flex: 1,
                    }}
                  >
                    {m.label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 7,
                      fontFamily: FONT.bold,
                      color: COLORS.textSecondary,
                    }}
                  >
                    {tierName}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </View>
    );
  };

  return (
    <Page size="A4" style={styles.page}>
      <View style={{ marginBottom: 10 }}>
        <Text style={{ fontSize: 16, fontFamily: FONT.bold, color: COLORS.textPrimary }}>
          {heading}
        </Text>
        {intro ? (
          <Text
            style={{
              fontSize: 9,
              color: COLORS.textSecondary,
              marginTop: 4,
              lineHeight: 1.4,
            }}
          >
            {intro}
          </Text>
        ) : null}
      </View>

      {/* Single row — 5 cards (Option 2 layout, force 5-across) */}
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {sorted.slice(0, 5).map((d) => renderCard(d))}
      </View>

      <Text
        style={{
          fontSize: 7,
          color: COLORS.textSecondary,
          marginTop: 14,
          fontStyle: 'italic',
        }}
      >
        Open this report in your portal to drill into each pillar and see your coach&apos;s recommendations.
      </Text>
    </Page>
  );
}
