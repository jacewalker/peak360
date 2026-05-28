import { View, Text } from '@react-pdf/renderer';
import { COLORS } from '@/lib/pdf/colors';
import { FONT, WEIGHT } from '@/lib/pdf/fonts';

interface ReportFooterProps {
  /**
   * Right-hand brand context shown after "Peak360 -" (e.g. "Cardiometabolic",
   * "Full blood panel"). Defaults to the program name on the cover.
   */
  context?: string;
}

/**
 * Per-page footer matching the mockup .foot: a thin top rule, a mono brand
 * line on the left ("Peak360" in gold + context), and the page number on the
 * right. `fixed` so it repeats if a pillar flows onto a continuation page.
 */
export function ReportFooter({ context = 'Strong Bodies Geelong' }: ReportFooterProps) {
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 14,
        left: 56,
        right: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 0.5,
        borderTopColor: COLORS.border,
        paddingTop: 8,
      }}
      fixed
    >
      <Text
        style={{
          fontSize: 7,
          fontFamily: FONT.mono,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: COLORS.textMuted,
        }}
      >
        <Text style={{ fontFamily: FONT.mono, fontWeight: WEIGHT.semibold, color: COLORS.gold }}>Peak360</Text>
        {`  -  ${context}`}
      </Text>
      <Text
        style={{
          fontSize: 7,
          fontFamily: FONT.mono,
          letterSpacing: 1,
          color: COLORS.textSecondary,
        }}
        render={({ pageNumber, totalPages }) =>
          `${String(pageNumber).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`
        }
      />
    </View>
  );
}
