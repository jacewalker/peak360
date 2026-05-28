import { View, Text } from '@react-pdf/renderer';
import { COLORS } from '@/lib/pdf/colors';
import { FONT, WEIGHT } from '@/lib/pdf/fonts';

interface SectionEyebrowProps {
  /** Faint leading token, e.g. "Pillar 01 / 05" or "Reference". */
  prefix: string;
  /** Optional gold label after the prefix (cover hero only). */
  label?: string;
  /** Draw the fading rule line that fills the remaining width. */
  rule?: boolean;
}

/**
 * Mono eyebrow motif from the mockup (.eyebrow): a small uppercase mono line,
 * optionally followed by a fading horizontal rule. Used at the top of pillar,
 * blood-panel and appendix pages.
 */
export function SectionEyebrow({ prefix, label, rule = true }: SectionEyebrowProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text
        style={{
          fontFamily: FONT.mono,
          fontWeight: WEIGHT.semibold,
          fontSize: 8,
          letterSpacing: 1.6,
          textTransform: 'uppercase',
          color: label ? COLORS.textMuted : COLORS.gold,
        }}
      >
        {prefix}
        {label ? (
          <Text style={{ color: COLORS.gold }}>{`  ${label}`}</Text>
        ) : null}
      </Text>
      {rule ? (
        <View style={{ flex: 1, height: 0.6, backgroundColor: COLORS.border }} />
      ) : null}
    </View>
  );
}
