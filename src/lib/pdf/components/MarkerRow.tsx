import { View, Text } from '@react-pdf/renderer';
import type { ReportMarker } from '@/lib/pdf/types';
import { COLORS, TIER_ROW_BG_PDF, TIER_BORDER_PDF } from '@/lib/pdf/colors';
import { FONT } from '@/lib/pdf/fonts';
import { TierPillPdf } from './TierPillPdf';
import { RangeBarPdf } from './RangeBarPdf';
import { ReferralFlagPdf } from './ReferralFlagPdf';

interface MarkerRowProps {
  marker: ReportMarker;
  age?: number | null;
  gender?: string | null;
}

export function MarkerRow({ marker }: MarkerRowProps) {
  return (
    <View
      wrap={false}
      style={{
        flexDirection: 'column',
        paddingTop: 4,
        paddingBottom: 4,
        paddingRight: 6,
        paddingLeft: 10,
        backgroundColor: marker.tier ? TIER_ROW_BG_PDF[marker.tier] : '#f9fafb',
        borderLeftWidth: 3,
        borderLeftColor: marker.tier ? TIER_BORDER_PDF[marker.tier] : '#e5e7eb',
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.borderLight,
      }}
    >
      {/* Row 1: Label + value + tier pill */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 9, fontFamily: FONT.regular }}>
          {marker.label}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {marker.value !== null ? (
            <>
              <Text style={{ fontSize: 9, fontFamily: FONT.bold }}>
                {marker.value}
              </Text>
              <Text style={{ fontSize: 7, fontFamily: FONT.regular, color: COLORS.textSecondary }}>
                {marker.unit}
              </Text>
              {marker.tier && <TierPillPdf tier={marker.tier} />}
            </>
          ) : (
            <Text style={{ fontSize: 7, fontFamily: FONT.italic, color: COLORS.textMuted }}>
              Not recorded
            </Text>
          )}
        </View>
      </View>

      {/* Row 2: Range bar */}
      {marker.hasNorms && marker.value !== null && marker.resolvedStandards && (
        <View style={{ marginTop: 3 }}>
          <RangeBarPdf value={marker.value} standards={marker.resolvedStandards} />
        </View>
      )}

      {/* Row 3: Referral flags */}
      {marker.tier === 'poor' && <ReferralFlagPdf level="urgent" />}
      {marker.tier === 'cautious' && <ReferralFlagPdf level="monitor" />}
    </View>
  );
}
