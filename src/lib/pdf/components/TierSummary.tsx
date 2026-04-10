import { View, Text } from '@react-pdf/renderer';
import type { RatingTier } from '@/types/normative';
import { TIER_LABELS } from '@/types/normative';
import { COLORS, TIER_COLORS_PDF } from '@/lib/pdf/colors';
import { FONT } from '@/lib/pdf/fonts';
import { styles } from '@/lib/pdf/styles';

interface TierSummaryProps {
  tierCounts: Record<RatingTier, number>;
  totalRated: number;
}

const TIER_ORDER: RatingTier[] = ['elite', 'great', 'normal', 'cautious', 'poor'];

export function TierSummary({ tierCounts, totalRated }: TierSummaryProps) {
  return (
    <View>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingBar} />
        <Text style={styles.sectionHeadingText}>Results Overview</Text>
        {totalRated > 0 && (
          <Text style={{ fontSize: 8, color: COLORS.textSecondary, marginLeft: 'auto' }}>
            {totalRated} markers evaluated
          </Text>
        )}
      </View>

      <View wrap={false} style={{ flexDirection: 'row', gap: 6 }}>
        {TIER_ORDER.map((tier) => {
          const pct = totalRated > 0 ? Math.round((tierCounts[tier] / totalRated) * 100) : 0;
          const color = TIER_COLORS_PDF[tier];

          return (
            <View
              key={tier}
              style={{
                flex: 1,
                borderWidth: 0.5,
                borderColor: COLORS.border,
                borderRadius: 6,
                overflow: 'hidden',
                backgroundColor: COLORS.white,
                padding: '6 8',
                alignItems: 'center',
              }}
            >
              {/* Top colored bar */}
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  backgroundColor: color,
                }}
              />

              {/* Tier label */}
              <Text
                style={{
                  fontSize: 7,
                  fontFamily: FONT.bold,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  color,
                  marginTop: 4,
                  marginBottom: 2,
                }}
              >
                {TIER_LABELS[tier]}
              </Text>

              {/* Count */}
              <Text
                style={{
                  fontSize: 22,
                  fontFamily: FONT.bold,
                  color: COLORS.navy,
                  lineHeight: 1,
                }}
              >
                {tierCounts[tier]}
              </Text>

              {/* Percentage bar */}
              <View
                style={{
                  width: '100%',
                  height: 3,
                  backgroundColor: COLORS.borderLight,
                  borderRadius: 2,
                  overflow: 'hidden',
                  marginTop: 4,
                }}
              >
                <View
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    backgroundColor: color,
                    borderRadius: 2,
                  }}
                />
              </View>

              {/* Percentage text */}
              <Text
                style={{
                  fontSize: 7,
                  color: COLORS.textSecondary,
                  fontFamily: FONT.bold,
                  marginTop: 2,
                }}
              >
                {pct}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
