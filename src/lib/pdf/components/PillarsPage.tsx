import { Page, View, Text } from '@react-pdf/renderer';
import {
  COLORS,
  TRAFFIC_LIGHT_HEX,
  TRAFFIC_LIGHT_TEXT,
  STATUS_LABEL,
} from '@/lib/pdf/colors';
import { FONT } from '@/lib/pdf/fonts';
import { styles } from '@/lib/pdf/styles';
import { computeAllPillarScores } from '@/lib/pillars/mapping';
import type {
  PillarDefinition,
  PillarPageCopy,
  PillarPrescription,
  PillarKey,
} from '@/lib/pillars/types';
import type { ReportMarker } from '@/lib/pdf/types';

/**
 * Phase 8 — D-26 Pillars page.
 *
 * Single A4 mirror of the portal's Peak Living module:
 *   - Heading from pageCopy.heading (admin-editable; defensive fallback)
 *   - 3-2 grid of 5 pillar cards in sortOrder
 *   - Per-card status badge sourced from TRAFFIC_LIGHT_HEX (D-28 SSOT —
 *     no inline traffic-light hex anywhere in this file)
 *   - Optional Recommended next steps block per card (omitted when no
 *     prescription summary exists)
 *   - Footnote pointing back to the portal
 *
 * Inserted BEFORE TierSummary by Peak360Report.tsx (D-26, D-27 — existing
 * blocks unchanged in shape and order).
 *
 * Pitfall A5 mitigation: per-card prescription summary truncated to
 * ~140 characters so a long admin summary cannot push the page past A4.
 */

function truncate(s: string, max = 140): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
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
  prescriptions,
  markers,
}: PillarsPageProps) {
  const scores = computeAllPillarScores(markers);
  const heading = pageCopy?.heading ?? 'The Peak Living Pillars';
  const intro = pageCopy?.intro ?? '';
  const sorted = [...definitions].sort((a, b) => a.sortOrder - b.sortOrder);
  const row1 = sorted.slice(0, 3);
  const row2 = sorted.slice(3, 5);
  const findRx = (k: PillarKey) =>
    prescriptions.find((p) => p.pillarKey === k) ?? null;

  const renderCard = (d: PillarDefinition, width: string) => {
    const r = scores[d.pillarKey];
    const rx = findRx(d.pillarKey);
    const isPending = r.status === 'pending';
    return (
      <View
        key={d.pillarKey}
        style={{
          width,
          borderWidth: isPending ? 1 : 0.5,
          borderStyle: isPending ? 'dashed' : 'solid',
          borderColor: isPending ? COLORS.border : COLORS.border,
          borderRadius: 6,
          padding: 10,
          backgroundColor: COLORS.white,
        }}
      >
        <Text style={{ fontSize: 10, fontFamily: FONT.bold, color: COLORS.navy }}>
          {d.label}
        </Text>
        <Text
          style={{
            fontSize: 22,
            fontFamily: FONT.bold,
            color: COLORS.navy,
            marginTop: 4,
            lineHeight: 1,
          }}
        >
          {r.score === null ? '—' : r.score}
          <Text
            style={{
              fontSize: 9,
              fontFamily: FONT.regular,
              color: COLORS.textSecondary,
            }}
          >
            {' '}/100
          </Text>
        </Text>
        <View
          style={{
            marginTop: 4,
            paddingHorizontal: 6,
            paddingVertical: 2,
            backgroundColor: isPending ? COLORS.white : TRAFFIC_LIGHT_HEX[r.status],
            borderWidth: isPending ? 0.5 : 0,
            borderColor: COLORS.border,
            alignSelf: 'flex-start',
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              fontSize: 8,
              color: TRAFFIC_LIGHT_TEXT[r.status],
              fontFamily: FONT.bold,
            }}
          >
            {STATUS_LABEL[r.status]}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 8,
            color: COLORS.textSecondary,
            marginTop: 6,
            lineHeight: 1.4,
          }}
        >
          {d.shortSummary}
        </Text>
        {rx?.summary ? (
          <View
            style={{
              marginTop: 6,
              paddingTop: 4,
              borderTopWidth: 0.5,
              borderTopColor: COLORS.border,
            }}
          >
            <Text style={{ fontSize: 8, fontFamily: FONT.bold, color: COLORS.navy }}>
              Recommended next steps
            </Text>
            <Text
              style={{
                fontSize: 8,
                marginTop: 2,
                color: COLORS.textPrimary,
                lineHeight: 1.35,
              }}
            >
              {truncate(rx.summary, 140)}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Page size="A4" style={styles.page}>
      <View style={{ marginBottom: 10 }}>
        <Text style={{ fontSize: 16, fontFamily: FONT.bold, color: COLORS.navy }}>
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

      {/* Row 1 — 3 cards */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {row1.map((d) => renderCard(d, '32%'))}
      </View>
      {/* Row 2 — 2 cards */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        {row2.map((d) => renderCard(d, '48%'))}
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
