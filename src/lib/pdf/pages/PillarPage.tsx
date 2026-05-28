import { Page, View, Text } from '@react-pdf/renderer';
import { COLORS } from '@/lib/pdf/colors';
import { FONT, WEIGHT } from '@/lib/pdf/fonts';
import { TIER_COLORS_PDF } from '@/lib/pdf/colors';
import { RingGauge } from '@/lib/pdf/components/RingGauge';
import { SectionEyebrow } from '@/lib/pdf/components/SectionEyebrow';
import { MarkerTierRow } from '@/lib/pdf/components/MarkerTierRow';
import { ReportFooter } from '@/lib/pdf/components/ReportFooter';
import { STATUS_LABEL, TRAFFIC_LIGHT_HEX } from '@/lib/pillars/colors';
import type { PillarStatus, PillarKey } from '@/lib/pillars/types';
import { TIER_LABELS, type RatingTier } from '@/types/normative';
import type { PillarPageModel } from '@/lib/pdf/pillar-page-data';
import { TIER_ORDER } from '@/lib/pdf/pillar-page-data';

// Static plain-meaning fallback per pillar, used when the DB definition has no
// plainMeaning. Mirrors the mockup copy.
const PLAIN_MEANING_FALLBACK: Record<PillarKey, string> = {
  cardiometabolic:
    'How your heart, vessels and metabolism are ageing - driven by lipids, blood sugar and inflammation. The pillar that most predicts heart-attack and stroke risk.',
  vo2:
    'Your engine capacity - how efficiently your body delivers and uses oxygen. VO2 max is the single strongest fitness predictor of all-cause mortality we measure.',
  bodyComposition:
    'The balance of muscle, fat and where that fat sits. Visceral fat and lean mass are powerful, modifiable signals for metabolic health and how robustly you age.',
  strength:
    'Force, power and muscular endurance - grip, lower-body drive and pushing capacity. Strength in mid-life is one of the clearest predictors of independence and longevity later.',
  balance:
    'Single-leg stability - your neuromuscular control and fall resilience. An underrated longevity marker: balance at mid-life strongly predicts injury-free, independent later years.',
};

// Chip text colour on the solid status fill (amber needs dark ink).
const CHIP_TEXT: Record<PillarStatus, string> = {
  green: '#ffffff',
  amber: '#0a0a0b',
  red: '#ffffff',
  pending: COLORS.textPrimary,
};

function StatusChip({ status }: { status: PillarStatus }) {
  if (status === 'pending') {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          borderRadius: 999,
          borderWidth: 0.5,
          borderColor: COLORS.border,
          backgroundColor: COLORS.bgLight,
          paddingVertical: 5,
          paddingHorizontal: 12,
        }}
      >
        <Text
          style={{
            fontFamily: FONT.mono,
            fontWeight: WEIGHT.semibold,
            fontSize: 7.5,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            color: COLORS.textSecondary,
          }}
        >
          {STATUS_LABEL.pending}
        </Text>
      </View>
    );
  }
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        backgroundColor: TRAFFIC_LIGHT_HEX[status],
        paddingVertical: 5,
        paddingHorizontal: 12,
      }}
    >
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)' }} />
      <Text
        style={{
          fontFamily: FONT.mono,
          fontWeight: WEIGHT.semibold,
          fontSize: 7.5,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          color: CHIP_TEXT[status],
        }}
      >
        {STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

function DistributionBar({
  tierCounts,
  total,
}: {
  tierCounts: Record<RatingTier, number>;
  total: number;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, marginBottom: 4 }}>
      <View
        style={{
          flex: 1,
          height: 8,
          borderRadius: 999,
          overflow: 'hidden',
          flexDirection: 'row',
          backgroundColor: COLORS.bgLighter,
        }}
      >
        {TIER_ORDER.map((tier) => {
          const count = tierCounts[tier] ?? 0;
          if (count === 0) return null;
          return (
            <View
              key={tier}
              style={{
                flexGrow: count,
                flexBasis: 0,
                height: '100%',
                backgroundColor: TIER_COLORS_PDF[tier],
              }}
            />
          );
        })}
      </View>
      <Text style={{ fontFamily: FONT.mono, fontSize: 8, letterSpacing: 0.4, color: COLORS.textSecondary }}>
        <Text style={{ color: COLORS.textPrimary, fontWeight: WEIGHT.semibold }}>{total}</Text>
        {total === 1 ? ' marker scored' : ' markers scored'}
      </Text>
    </View>
  );
}

function GroupHead({ tier, count }: { tier: RatingTier; count: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: TIER_COLORS_PDF[tier] }} />
      <Text
        style={{
          fontFamily: FONT.mono,
          fontWeight: WEIGHT.semibold,
          fontSize: 8,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: COLORS.textPrimary,
        }}
      >
        {TIER_LABELS[tier]}
      </Text>
      <Text style={{ fontFamily: FONT.mono, fontSize: 7.5, letterSpacing: 0.6, color: COLORS.textSecondary }}>
        {`- ${count}`}
      </Text>
      <View style={{ flex: 1, height: 0.6, backgroundColor: COLORS.border }} />
    </View>
  );
}

function CoachNote({
  summary,
  bullets,
  status,
}: {
  summary: string;
  bullets: string[] | null | undefined;
  status: PillarStatus;
}) {
  const byline =
    status === 'red'
      ? 'Priority pillar'
      : status === 'amber'
        ? 'Focus area'
        : status === 'green'
          ? 'A genuine strength'
          : 'Coach note';
  return (
    <View
      style={{
        marginTop: 12,
        borderRadius: 11,
        borderWidth: 0.5,
        borderColor: '#3a3320',
        backgroundColor: '#181509',
        flexDirection: 'row',
        overflow: 'hidden',
      }}
      wrap={false}
    >
      <View style={{ width: 3, backgroundColor: COLORS.gold }} />
      <View style={{ flex: 1, paddingVertical: 13, paddingHorizontal: 18 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text
            style={{
              fontFamily: FONT.mono,
              fontWeight: WEIGHT.semibold,
              fontSize: 8,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: COLORS.goldDark,
            }}
          >
            Coach focus
          </Text>
          <View
            style={{
              borderWidth: 0.5,
              borderColor: '#3a3320',
              borderRadius: 999,
              paddingVertical: 3,
              paddingHorizontal: 9,
            }}
          >
            <Text
              style={{
                fontFamily: FONT.mono,
                fontSize: 6.5,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: COLORS.textSecondary,
              }}
            >
              {byline}
            </Text>
          </View>
        </View>
        {summary ? (
          <Text style={{ fontFamily: FONT.sans, fontWeight: WEIGHT.regular, fontSize: 10, lineHeight: 1.55, color: COLORS.textPrimary }}>
            {summary}
          </Text>
        ) : null}
        {bullets && bullets.length > 0 ? (
          <View style={{ marginTop: 8, gap: 5 }}>
            {bullets.map((b, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.gold, marginTop: 5 }} />
                <Text style={{ flex: 1, fontFamily: FONT.sans, fontWeight: WEIGHT.regular, fontSize: 9.5, lineHeight: 1.45, color: COLORS.textPrimary }}>
                  {b}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function PillarPage({ model }: { model: PillarPageModel }) {
  const { definition, score, groups, prescription } = model;
  const plainMeaning =
    definition.plainMeaning?.trim() || PLAIN_MEANING_FALLBACK[definition.pillarKey] || '';
  const isPending = score.status === 'pending' || score.score === null;
  const totalScored = score.contributingCount;

  return (
    <Page size="A4" style={{ backgroundColor: COLORS.page, paddingTop: 42, paddingBottom: 48, paddingHorizontal: 56 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 20,
          paddingBottom: 14,
          borderBottomWidth: 0.5,
          borderBottomColor: COLORS.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <View style={{ marginBottom: 10 }}>
            <SectionEyebrow prefix={`Pillar ${String(definition.sortOrder).padStart(2, '0')} / 05`} />
          </View>
          <Text
            style={{
              fontFamily: FONT.sans,
              fontWeight: WEIGHT.semibold,
              fontSize: 30,
              letterSpacing: -0.8,
              lineHeight: 1,
              color: COLORS.textPrimary,
            }}
          >
            {definition.label}
          </Text>
          {plainMeaning ? (
            <Text
              style={{
                marginTop: 9,
                fontFamily: FONT.sans,
                fontWeight: WEIGHT.regular,
                fontSize: 10,
                lineHeight: 1.5,
                color: COLORS.textSecondary,
                maxWidth: 330,
              }}
            >
              {plainMeaning}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'center', gap: 9 }}>
          <RingGauge
            score={score.score}
            status={score.status}
            size={92}
            strokeWidth={8}
            fontSize={30}
            showDenominator
            holeColor={COLORS.page}
          />
          <StatusChip status={score.status} />
        </View>
      </View>

      {isPending ? (
        <View style={{ marginTop: 40, alignItems: 'center' }}>
          <Text style={{ fontFamily: FONT.sans, fontWeight: WEIGHT.regular, fontSize: 11, color: COLORS.textSecondary }}>
            Awaiting data for this pillar.
          </Text>
          <Text style={{ marginTop: 6, fontFamily: FONT.sans, fontSize: 9.5, color: COLORS.textMuted, maxWidth: 320, textAlign: 'center', lineHeight: 1.5 }}>
            No scored markers were recorded for {definition.label.toLowerCase()} in this assessment. Complete the relevant section to populate this pillar.
          </Text>
        </View>
      ) : (
        <>
          <DistributionBar tierCounts={score.tierCounts} total={totalScored} />

          <View style={{ marginTop: 10, gap: 10 }}>
            {groups.map((g) => (
              <View key={g.tier} wrap={false}>
                <GroupHead tier={g.tier} count={g.markers.length} />
                <View style={{ gap: 4 }}>
                  {g.markers.map((m) => (
                    <MarkerTierRow key={m.key} marker={m} />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Coach focus note */}
      {prescription && (prescription.summary || (prescription.bullets && prescription.bullets.length > 0)) ? (
        <CoachNote
          summary={prescription.summary}
          bullets={prescription.bullets}
          status={score.status}
        />
      ) : null}

      <ReportFooter context={definition.label} />
    </Page>
  );
}
