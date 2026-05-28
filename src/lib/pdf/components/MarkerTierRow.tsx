import { View, Text } from '@react-pdf/renderer';
import { COLORS } from '@/lib/pdf/colors';
import { FONT, WEIGHT } from '@/lib/pdf/fonts';
import {
  TIER_COLORS_PDF,
  TIER_ROW_BG_PDF,
  TIER_TEXT_PDF,
} from '@/lib/pdf/colors';
import { TIER_LABELS, type RatingTier } from '@/types/normative';
import type { ReportMarker } from '@/lib/pdf/types';

/**
 * Pillar-page marker row (.row in the mockup): a coloured tier rail, the
 * marker name with a mono sub-category line beneath, the value + unit, and a
 * fixed-width tier pill on the right. All tier colours come from the 5-tier
 * marker palette (TIER_COLORS_PDF / TIER_TEXT_PDF / TIER_ROW_BG_PDF) per D-16.
 */
export function MarkerTierRow({ marker }: { marker: ReportMarker }) {
  const tier: RatingTier = marker.tier ?? 'normal';
  const railColor = TIER_COLORS_PDF[tier];
  const subcat = buildSubcategoryLine(marker);
  const value = formatValue(marker.value);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 5,
        paddingHorizontal: 11,
        borderRadius: 7,
        backgroundColor: COLORS.bgLight,
        borderWidth: 0.5,
        borderColor: COLORS.border,
      }}
      wrap={false}
    >
      {/* tier rail */}
      <View
        style={{
          width: 2.5,
          alignSelf: 'stretch',
          borderRadius: 2,
          backgroundColor: railColor,
        }}
      />

      {/* name + sub-category */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: FONT.sans,
            fontWeight: WEIGHT.medium,
            fontSize: 10.5,
            color: COLORS.textPrimary,
          }}
        >
          {marker.label}
        </Text>
        {subcat ? (
          <Text
            style={{
              fontFamily: FONT.mono,
              fontSize: 6.5,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: COLORS.textMuted,
              marginTop: 2,
            }}
          >
            {subcat}
          </Text>
        ) : null}
      </View>

      {/* value + unit */}
      <Text
        style={{
          fontFamily: FONT.mono,
          fontWeight: WEIGHT.semibold,
          fontSize: 11,
          color: COLORS.textPrimary,
          textAlign: 'right',
        }}
      >
        {value}
        {marker.unit ? (
          <Text style={{ fontSize: 8, fontWeight: WEIGHT.regular, color: COLORS.textSecondary }}>
            {` ${marker.unit}`}
          </Text>
        ) : null}
      </Text>

      {/* tier pill */}
      <View
        style={{
          width: 58,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: TIER_ROW_BG_PDF[tier],
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            fontFamily: FONT.mono,
            fontWeight: WEIGHT.semibold,
            fontSize: 6.5,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: TIER_TEXT_PDF[tier],
          }}
        >
          {TIER_LABELS[tier]}
        </Text>
      </View>
    </View>
  );
}

/**
 * "Blood - Lipid Panel" / "Body Composition" style sub-category line. Maps the
 * verbose category to a short prefix and appends the subcategory when present.
 */
function buildSubcategoryLine(m: ReportMarker): string {
  const prefix = CATEGORY_PREFIX[m.category] ?? m.category;
  if (m.subcategory && m.subcategory.trim() && m.subcategory !== m.category) {
    return `${prefix} - ${m.subcategory}`;
  }
  return prefix;
}

const CATEGORY_PREFIX: Record<string, string> = {
  'Blood Tests & Biomarkers': 'Blood',
  'Body Composition': 'Body Composition',
  'Cardiovascular Fitness': 'Cardiovascular',
  'Strength Testing': 'Strength',
  'Mobility & Flexibility': 'Mobility',
};

/** Render a numeric value compactly: drop trailing ".0" but keep precision. */
export function formatValue(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '-';
  if (Number.isInteger(value)) return String(value);
  // up to 2 dp, trimmed
  return String(Number(value.toFixed(2)));
}
