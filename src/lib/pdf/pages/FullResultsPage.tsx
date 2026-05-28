import { Page, View, Text } from '@react-pdf/renderer';
import { COLORS } from '@/lib/pdf/colors';
import { FONT, WEIGHT } from '@/lib/pdf/fonts';
import { TIER_COLORS_PDF } from '@/lib/pdf/colors';
import { SectionEyebrow } from '@/lib/pdf/components/SectionEyebrow';
import { ReportFooter } from '@/lib/pdf/components/ReportFooter';
import { formatMarkerValue, isPassFailKey } from '@/lib/pdf/components/MarkerTierRow';
import { TIER_LABELS, type RatingTier } from '@/types/normative';
import type { ReportData, ReportMarker } from '@/lib/pdf/types';
import { buildFullResultsGroups, TIER_ORDER } from '@/lib/pdf/pillar-page-data';

function ResultRow({ marker }: { marker: ReportMarker }) {
  const tier: RatingTier = marker.tier ?? 'normal';
  const showUnit = !isPassFailKey(marker.key);
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
          {formatMarkerValue(marker)}
          {showUnit && marker.unit ? (
            <Text style={{ fontSize: 7, fontWeight: WEIGHT.regular, color: COLORS.textSecondary }}>
              {` ${marker.unit}`}
            </Text>
          ) : null}
        </Text>
      </View>
    </View>
  );
}

/**
 * Exhaustive results-reference page: every REPORT_MARKERS entry with a recorded
 * value, grouped by category (REPORT_CATEGORIES order) and then by subcategory
 * within each category when present. Replaces the old blood-only reference page
 * so newly added markers (FABER, eyes-closed CoP, mobility metrics) never get
 * silently dropped from the PDF.
 */
export function FullResultsPage({ data }: { data: ReportData }) {
  const groups = buildFullResultsGroups(data.markers);

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
        Full results reference
      </Text>
      <Text
        style={{
          fontFamily: FONT.sans,
          fontWeight: WEIGHT.regular,
          fontSize: 10,
          lineHeight: 1.5,
          color: COLORS.textSecondary,
          marginTop: 8,
          maxWidth: 420,
        }}
      >
        Every recorded marker from this assessment - blood, body composition, cardiovascular, strength, mobility - rated for your age and sex where norms exist. Markers shown here inform the pillars above; the lipid, glucose and inflammation panels also drive your Cardiometabolic score.
      </Text>

      {groups.length === 0 ? (
        <Text style={{ marginTop: 28, fontFamily: FONT.sans, fontSize: 10, color: COLORS.textMuted }}>
          No markers with recorded values for this assessment.
        </Text>
      ) : (
        groups.map((cat) => (
          <View key={cat.category} style={{ marginTop: 18 }}>
            <Text
              style={{
                fontFamily: FONT.sans,
                fontWeight: WEIGHT.semibold,
                fontSize: 13,
                color: COLORS.textPrimary,
                marginBottom: 8,
              }}
            >
              {cat.category}
            </Text>
            {cat.panels.map((panel) => (
              <View key={panel.name ?? '_'} style={{ marginTop: panel.name ? 10 : 4 }} wrap={false}>
                {panel.name ? (
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
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -7 }}>
                  {panel.markers.map((m) => (
                    <ResultRow key={m.key} marker={m} />
                  ))}
                </View>
              </View>
            ))}
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

      <ReportFooter context="Full results reference" />
    </Page>
  );
}
