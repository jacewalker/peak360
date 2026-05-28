import { Page, View, Text } from '@react-pdf/renderer';
import { COLORS } from '@/lib/pdf/colors';
import { FONT, WEIGHT } from '@/lib/pdf/fonts';
import { RingGauge } from '@/lib/pdf/components/RingGauge';
import { ReportFooter } from '@/lib/pdf/components/ReportFooter';
import { STATUS_LABEL } from '@/lib/pillars/colors';
import type { PillarStatus, PillarScoreResult, PillarKey } from '@/lib/pillars/types';
import type { ReportData } from '@/lib/pdf/types';
import {
  buildPillarPageModels,
  computeOverallComposite,
} from '@/lib/pdf/pillar-page-data';
import { computeAllPillarScores } from '@/lib/pillars/mapping';

// Brightened status text for legibility on the dark page (300-shades).
const STATUS_TEXT: Record<PillarStatus, string> = {
  green: '#6ee7b7',
  amber: '#fcd34d',
  red: '#fca5a5',
  pending: COLORS.textSecondary,
};

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function CornerBrackets() {
  const base = {
    position: 'absolute' as const,
    width: 14,
    height: 14,
    borderColor: 'rgba(201,162,74,0.5)',
  };
  return (
    <>
      <View style={{ ...base, top: 22, left: 22, borderLeftWidth: 0.8, borderTopWidth: 0.8 }} />
      <View style={{ ...base, top: 22, right: 22, borderRightWidth: 0.8, borderTopWidth: 0.8 }} />
      <View style={{ ...base, bottom: 22, left: 22, borderLeftWidth: 0.8, borderBottomWidth: 0.8 }} />
      <View style={{ ...base, bottom: 22, right: 22, borderRightWidth: 0.8, borderBottomWidth: 0.8 }} />
    </>
  );
}

function PillarCard({
  sortOrder,
  label,
  score,
}: {
  sortOrder: number;
  label: string;
  score: PillarScoreResult;
}) {
  const eyebrow = `P-${String(sortOrder).padStart(2, '0')}`;
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        borderRadius: 10,
        backgroundColor: COLORS.bgLight,
        paddingTop: 12,
        paddingBottom: 12,
        paddingHorizontal: 8,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          alignSelf: 'flex-start',
          fontFamily: FONT.mono,
          fontSize: 6.5,
          letterSpacing: 1,
          color: COLORS.textMuted,
        }}
      >
        {eyebrow}
      </Text>
      <View style={{ marginTop: 6, marginBottom: 8 }}>
        <RingGauge
          score={score.score}
          status={score.status}
          size={56}
          strokeWidth={5}
          fontSize={18}
          holeColor={COLORS.bgLight}
        />
      </View>
      <Text
        style={{
          fontFamily: FONT.sans,
          fontWeight: WEIGHT.semibold,
          fontSize: 9,
          color: COLORS.textPrimary,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          marginTop: 4,
          fontFamily: FONT.mono,
          fontWeight: WEIGHT.semibold,
          fontSize: 6.5,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          textAlign: 'center',
          color: STATUS_TEXT[score.status],
        }}
      >
        {STATUS_LABEL[score.status]}
      </Text>
    </View>
  );
}

export function CoverPage({ data }: { data: ReportData }) {
  const models = buildPillarPageModels(data);

  let scores: Record<PillarKey, PillarScoreResult> | null = null;
  try {
    scores = computeAllPillarScores(data.markers);
  } catch {
    scores = null;
  }
  const overall = scores ? computeOverallComposite(scores) : null;

  const sexLabel = data.clientGender
    ? data.clientGender.charAt(0).toUpperCase() + data.clientGender.slice(1)
    : '-';

  return (
    <Page size="A4" style={{ backgroundColor: COLORS.page, paddingTop: 0, paddingBottom: 0, paddingHorizontal: 0 }}>
      <CornerBrackets />

      {/* Top bar: wordmark + report issued */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingTop: 48,
          paddingHorizontal: 56,
        }}
      >
        <View>
          <Text style={{ fontFamily: FONT.sans, fontWeight: WEIGHT.bold, fontSize: 22, letterSpacing: -0.4 }}>
            <Text style={{ color: COLORS.textPrimary }}>Peak</Text>
            <Text style={{ color: COLORS.gold }}>360</Text>
          </Text>
          <Text
            style={{
              fontFamily: FONT.mono,
              fontSize: 7,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: COLORS.textMuted,
              marginTop: 6,
            }}
          >
            Longevity Assessment - Geelong
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={{
              fontFamily: FONT.mono,
              fontSize: 7.5,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: COLORS.textSecondary,
            }}
          >
            Report issued
          </Text>
          <Text
            style={{
              fontFamily: FONT.mono,
              fontSize: 9,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: COLORS.textPrimary,
              marginTop: 4,
            }}
          >
            {formatDate(new Date().toISOString())}
          </Text>
        </View>
      </View>

      {/* Centred hero + bands */}
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 56 }}>
        {/* Hero */}
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Text
              style={{
                fontFamily: FONT.mono,
                fontWeight: WEIGHT.semibold,
                fontSize: 8,
                letterSpacing: 1.8,
                textTransform: 'uppercase',
                color: COLORS.gold,
              }}
            >
              <Text style={{ color: COLORS.textMuted }}>01 -  </Text>
              Complete Longevity Analysis
            </Text>
          </View>
          <Text
            style={{
              fontFamily: FONT.sans,
              fontWeight: WEIGHT.light,
              fontSize: 46,
              lineHeight: 1.04,
              letterSpacing: -1,
              color: COLORS.textPrimary,
            }}
          >
            {'Your five pillars of '}
            <Text style={{ fontWeight: WEIGHT.semibold, color: COLORS.gold }}>peak.</Text>
          </Text>
          <Text
            style={{
              fontFamily: FONT.sans,
              fontWeight: WEIGHT.regular,
              fontSize: 11,
              lineHeight: 1.6,
              color: COLORS.textSecondary,
              marginTop: 16,
              maxWidth: 360,
            }}
          >
            A full read of where you stand today across the systems that most predict how well - and how long - you live. Each pillar that follows ranks your results from what needs attention to where you are already at your peak.
          </Text>
        </View>

        {/* Client band */}
        <View
          style={{
            flexDirection: 'row',
            marginTop: 28,
            borderWidth: 0.5,
            borderColor: COLORS.border,
            borderRadius: 11,
            backgroundColor: COLORS.bgLight,
            overflow: 'hidden',
          }}
        >
          {[
            { k: 'Client', v: data.clientName || '-' },
            { k: 'Age', v: data.clientAge != null ? String(data.clientAge) : '-' },
            { k: 'Biological sex', v: sexLabel },
            { k: 'Assessment date', v: formatDate(data.assessmentDate) },
          ].map((cell, i, arr) => (
            <View
              key={cell.k}
              style={{
                flex: 1,
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRightWidth: i < arr.length - 1 ? 0.5 : 0,
                borderRightColor: COLORS.border,
              }}
            >
              <Text
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 6.5,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: COLORS.textMuted,
                }}
              >
                {cell.k}
              </Text>
              <Text
                style={{
                  fontFamily: FONT.sans,
                  fontWeight: WEIGHT.semibold,
                  fontSize: 13,
                  color: COLORS.textPrimary,
                  marginTop: 6,
                }}
              >
                {cell.v}
              </Text>
            </View>
          ))}
        </View>

        {/* Scoreboard */}
        <View style={{ marginTop: 26 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontFamily: FONT.mono,
                fontSize: 8,
                letterSpacing: 1.6,
                textTransform: 'uppercase',
                color: COLORS.textSecondary,
              }}
            >
              Pillar scoreboard
            </Text>
            <Text
              style={{
                fontFamily: FONT.mono,
                fontSize: 8.5,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: COLORS.textSecondary,
              }}
            >
              {'Overall -  '}
              <Text style={{ fontWeight: WEIGHT.bold, fontSize: 12, color: COLORS.gold }}>
                {overall != null ? String(overall) : '-'}
              </Text>
              {' / 100'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 9 }}>
            {models.slice(0, 5).map((m) => (
              <PillarCard
                key={m.definition.pillarKey}
                sortOrder={m.definition.sortOrder}
                label={m.definition.label}
                score={m.score}
              />
            ))}
          </View>
        </View>

        {/* Tagline */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            marginTop: 28,
          }}
        >
          {['Know more.', 'Live longer.', 'Optimise everything.'].map((t, i) => (
            <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {i > 0 ? (
                <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: COLORS.gold }} />
              ) : null}
              <Text
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 8,
                  letterSpacing: 1.8,
                  textTransform: 'uppercase',
                  color: COLORS.textSecondary,
                }}
              >
                {t}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <ReportFooter context="Strong Bodies Geelong" />
    </Page>
  );
}
