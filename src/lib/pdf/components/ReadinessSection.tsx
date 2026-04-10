import { View, Text } from '@react-pdf/renderer';
import { COLORS } from '@/lib/pdf/colors';
import { FONT } from '@/lib/pdf/fonts';
import { styles } from '@/lib/pdf/styles';

interface ReadinessSectionProps {
  readiness: Record<string, unknown>;
}

const CAFFEINE_LABELS: Record<string, string> = {
  none: 'None',
  low: '1-2 cups',
  moderate: '3-4 cups',
  high: '5+ cups',
};

const ALCOHOL_LABELS: Record<string, string> = {
  none: 'None',
  light: '1-2 drinks',
  moderate: '3-5 drinks',
  heavy: '6+ drinks',
};

function ReadinessCell({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 4, paddingVertical: 4 }}>
      <Text style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.textSecondary }}>
        {label}
      </Text>
      {value ? (
        <Text style={{ fontSize: 9, fontFamily: FONT.bold, color: COLORS.textPrimary, marginTop: 2 }}>
          {value}
        </Text>
      ) : (
        <Text style={{ fontSize: 9, fontFamily: FONT.italic, color: COLORS.textMuted, marginTop: 2 }}>
          N/A
        </Text>
      )}
    </View>
  );
}

export function ReadinessSection({ readiness }: ReadinessSectionProps) {
  const sleep = readiness.sleepHours != null ? `${readiness.sleepHours} hrs` : null;
  const stress = readiness.stressLevel != null ? `${readiness.stressLevel}/10` : null;
  const energy = readiness.energyLevel != null ? `${readiness.energyLevel}/10` : null;
  const soreness = readiness.sorenessLevel != null ? `${readiness.sorenessLevel}/10` : null;
  const caffeine = CAFFEINE_LABELS[readiness.caffeineToday as string] || null;
  const alcohol = ALCOHOL_LABELS[readiness.alcoholLast48 as string] || null;

  return (
    <View>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingBar} />
        <Text style={styles.sectionHeadingText}>Assessment Day Readiness</Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          borderWidth: 0.5,
          borderColor: COLORS.border,
          borderRadius: 6,
          backgroundColor: COLORS.bgLight,
          overflow: 'hidden',
        }}
      >
        <ReadinessCell label="Sleep" value={sleep} />
        <ReadinessCell label="Stress" value={stress} />
        <ReadinessCell label="Energy" value={energy} />
        <ReadinessCell label="Soreness" value={soreness} />
        <ReadinessCell label="Caffeine" value={caffeine} />
        <ReadinessCell label="Alcohol (48h)" value={alcohol} />
      </View>
    </View>
  );
}
