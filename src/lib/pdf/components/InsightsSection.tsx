import { View, Text } from '@react-pdf/renderer';
import type { Insight } from '@/lib/pdf/types';
import { COLORS } from '@/lib/pdf/colors';
import { FONT } from '@/lib/pdf/fonts';
import { styles } from '@/lib/pdf/styles';

interface InsightsSectionProps {
  insights: Insight[];
}

export function InsightsSection({ insights }: InsightsSectionProps) {
  // generatePeak360Insights returns one insight per triggering marker so the
  // portal can route each into the matching pillar modal. The PDF wants a
  // single flat list, so collapse duplicates by title here.
  const seenTitles = new Set<string>();
  const deduped = insights.filter((i) => {
    if (seenTitles.has(i.title)) return false;
    seenTitles.add(i.title);
    return true;
  });

  if (deduped.length === 0) return null;

  return (
    <View break>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingBar} />
        <Text style={styles.sectionHeadingText}>Insights & Recommendations</Text>
      </View>

      {deduped.map((insight, i) => (
        <View
          key={i}
          wrap={false}
          style={{
            borderWidth: 0.5,
            borderColor: COLORS.border,
            borderRadius: 6,
            overflow: 'hidden',
            marginBottom: 6,
          }}
        >
          {/* Gold accent bar */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              backgroundColor: COLORS.gold,
            }}
          />

          {/* Content */}
          <View style={{ paddingLeft: 12, paddingRight: 10, paddingVertical: 8 }}>
            <Text style={{ fontSize: 10, fontFamily: FONT.bold, color: COLORS.textPrimary }}>
              {insight.title}
            </Text>
            <Text style={{ fontSize: 8, color: COLORS.textSecondary, marginTop: 3 }}>
              {insight.why}
            </Text>

            {insight.doNow.length > 0 && (
              <View style={{ marginTop: 4 }}>
                {insight.doNow.map((item, j) => (
                  <View key={j} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 2 }}>
                    <View
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: 1.5,
                        backgroundColor: COLORS.gold,
                        marginTop: 3.5,
                      }}
                    />
                    <Text style={{ fontSize: 8, color: COLORS.textPrimary, flex: 1 }}>
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
