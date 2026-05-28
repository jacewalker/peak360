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
  const subcat = buildInlineSubcat(marker);
  const value = formatMarkerValue(marker);
  const showUnit = !isPassFailKey(marker.key);

  // Single-line compact row: rail | name (with optional inline muted subcat) |
  // value+unit | tier pill. Inlining the subcat halves the row height vs the
  // previous two-line layout so a pillar page comfortably fits ~15 markers
  // when the rows-gap and group spacing are also tightened.
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 3.5,
        paddingHorizontal: 10,
        borderRadius: 6,
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

      {/* name + inline subcategory */}
      <Text
        style={{
          flex: 1,
          fontFamily: FONT.sans,
          fontWeight: WEIGHT.medium,
          fontSize: 10.5,
          color: COLORS.textPrimary,
        }}
      >
        {marker.label}
        {subcat ? (
          <Text
            style={{
              fontFamily: FONT.mono,
              fontWeight: WEIGHT.regular,
              fontSize: 7,
              letterSpacing: 0.8,
              color: COLORS.textMuted,
            }}
          >
            {`   ${subcat.toUpperCase()}`}
          </Text>
        ) : null}
      </Text>

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
        {showUnit && marker.unit ? (
          <Text style={{ fontSize: 8, fontWeight: WEIGHT.regular, color: COLORS.textSecondary }}>
            {` ${marker.unit}`}
          </Text>
        ) : null}
      </Text>

      {/* tier pill */}
      <View
        style={{
          width: 56,
          paddingVertical: 2.5,
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
 * Short, informative inline subcategory tag. Returns the marker's subcategory
 * (eg "Lipid Panel", "Hormones") when present and distinct from the category,
 * else returns an empty string so we don't add a noisy "STRENGTH" tag to every
 * row on the strength pillar page where the pillar header already conveys it.
 * Blood subcategories add real value (lipids vs hormones vs thyroid) so they
 * are surfaced; single-category pillars don't need the redundant prefix.
 */
function buildInlineSubcat(m: ReportMarker): string {
  if (m.subcategory && m.subcategory.trim() && m.subcategory !== m.category) {
    return m.subcategory;
  }
  return '';
}

/** Render a numeric value compactly: drop trailing ".0" but keep precision. */
export function formatValue(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '-';
  if (Number.isInteger(value)) return String(value);
  // up to 2 dp, trimmed
  return String(Number(value.toFixed(2)));
}

/**
 * Some markers are encoded as 1/0 (e.g. FABER outcome) but should render as
 * Pass / Fail in the PDF. Detected purely by testKey prefix so we don't need
 * to thread a separate "display kind" through the marker pipeline.
 */
export function isPassFailKey(key: string | undefined): boolean {
  if (!key) return false;
  return key.startsWith('faber_outcome_');
}

/** Marker-aware value formatter: routes pass/fail keys to Pass/Fail labels. */
export function formatMarkerValue(marker: { key?: string; value: number | null }): string {
  if (isPassFailKey(marker.key)) {
    if (marker.value === 1) return 'Pass';
    if (marker.value === 0) return 'Fail';
    return '-';
  }
  return formatValue(marker.value);
}
