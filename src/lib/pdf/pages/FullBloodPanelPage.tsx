import { Page, View, Text } from '@react-pdf/renderer';
import { COLORS } from '@/lib/pdf/colors';
import { FONT, WEIGHT } from '@/lib/pdf/fonts';
import { TIER_COLORS_PDF } from '@/lib/pdf/colors';
import { SectionEyebrow } from '@/lib/pdf/components/SectionEyebrow';
import { ReportFooter } from '@/lib/pdf/components/ReportFooter';
import { formatValue } from '@/lib/pdf/components/MarkerTierRow';
import { TIER_LABELS, type RatingTier } from '@/types/normative';
import type { ReportData, ReportMarker } from '@/lib/pdf/types';
import { buildBloodPanelGroups, TIER_ORDER } from '@/lib/pdf/pillar-page-data';

function BloodRow({ marker }: { marker: ReportMarker }) {
  const tier: RatingTier = marker.tier ?? 'normal';
  return (
    <View
      style={{
        width: '50%',
        paddingHorizontal: 7,
        marginBottom: 5,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 6,
          paddingHorizontal: 11,
          borderRadius: 7,
          backgroundColor: COLORS.bgLight,
          borderWidth: 0.5,
          borderColor: COLORS.border,
        }}
        wrap={false}
      >
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: TIER_COLORS_PDF[tier] }} />
        <Text
          style={{
            flex: 1,
            fontFamily: FONT.sans,
            fontWeight: WEIGHT.medium,
            fontSize: 9.5,
            color: COLORS.textPrimary,
          }}
        >
          {marker.label}
        </Text>
        <Text
          style={{
            fontFamily: FONT.mono,
            fontWeight: WEIGHT.semibold,
            fontSize: 9,
            color: COLORS.textPrimary,
          }}
        >
          {formatValue(marker.value)}
          {marker.unit ? (
            <Text style={{ fontSize: 7, fontWeight: WEIGHT.regular, color: COLORS.textSecondary }}>
              {` ${marker.unit}`}
            </Text>
          ) : null}
        </Text>
      </View>
    </View>
  );
}

export function FullBloodPanelPage({ data }: { data: ReportData }) {
  const panels = buildBloodPanelGroups(data.markers);

  return (
    <Page size="A4" style={{ backgroundColor: COLORS.page, paddingTop: 42, paddingBottom: 48, paddingHorizontal: 56 }}>
      <SectionEyebrow prefix="Reference" />
      <Text
        style={{
          fontFamily: FONT.sans,
          fontWeight: WEIGHT.semibold,
          fontSize: 28,
          letterSpacing: -0.6,
          color: COLORS.textPrimary,
          marginTop: 12,
        }}
      >
        Full blood panel
      </Text>
      <Text
        style={{
          fontFamily: FONT.sans,
          fontWeight: WEIGHT.regular,
          fontSize: 10,
          lineHeight: 1.5,
          color: COLORS.textSecondary,
          marginTop: 8,
          maxWidth: 400,
        }}
      >
        Every biomarker from your blood draw, grouped by panel and rated for your age and sex. Markers shown here inform the pillars above; the lipid, glucose and inflammation panels also drive your Cardiometabolic score.
      </Text>

      {panels.length === 0 ? (
        <Text style={{ marginTop: 28, fontFamily: FONT.sans, fontSize: 10, color: COLORS.textMuted }}>
          No blood markers with recorded values for this assessment.
        </Text>
      ) : (
        panels.map((panel) => (
          <View key={panel.name} style={{ marginTop: 16 }} wrap={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <Text
                style={{
                  fontFamily: FONT.mono,
                  fontWeight: WEIGHT.semibold,
                  fontSize: 8.5,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: COLORS.textPrimary,
                }}
              >
                {panel.name}
              </Text>
              <Text style={{ fontFamily: FONT.mono, fontSize: 7.5, letterSpacing: 0.6, color: COLORS.textMuted }}>
                {`- ${panel.markers.length}`}
              </Text>
              <View style={{ flex: 1, height: 0.6, backgroundColor: COLORS.border }} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -7 }}>
              {panel.markers.map((m) => (
                <BloodRow key={m.key} marker={m} />
              ))}
            </View>
          </View>
        ))
      )}

      {/* Tier legend */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 18,
          marginTop: 22,
          paddingTop: 14,
          borderTopWidth: 0.5,
          borderTopColor: COLORS.border,
        }}
      >
        {TIER_ORDER.map((tier) => (
          <View key={tier} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: TIER_COLORS_PDF[tier] }} />
            <Text
              style={{
                fontFamily: FONT.mono,
                fontSize: 7.5,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                color: COLORS.textSecondary,
              }}
            >
              {TIER_LABELS[tier]}
            </Text>
          </View>
        ))}
      </View>

      <ReportFooter context="Full blood panel" />
    </Page>
  );
}
