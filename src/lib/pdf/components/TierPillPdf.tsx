import { View, Text } from '@react-pdf/renderer';
import type { RatingTier } from '@/types/normative';
import { TIER_LABELS } from '@/types/normative';
import { TIER_ROW_BG_PDF, TIER_TEXT_PDF } from '@/lib/pdf/colors';
import { FONT } from '@/lib/pdf/fonts';

interface TierPillPdfProps {
  tier: RatingTier;
}

export function TierPillPdf({ tier }: TierPillPdfProps) {
  return (
    <View
      style={{
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 3,
        backgroundColor: TIER_ROW_BG_PDF[tier],
      }}
    >
      <Text
        style={{
          fontSize: 6,
          fontFamily: FONT.bold,
          textTransform: 'uppercase',
          color: TIER_TEXT_PDF[tier],
        }}
      >
        {TIER_LABELS[tier]}
      </Text>
    </View>
  );
}
