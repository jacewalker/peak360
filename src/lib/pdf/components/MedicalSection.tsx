import { View, Text } from '@react-pdf/renderer';
import { COLORS } from '@/lib/pdf/colors';
import { FONT } from '@/lib/pdf/fonts';
import { styles } from '@/lib/pdf/styles';

interface MedicalSectionProps {
  medical: Record<string, unknown>;
}

const SAFETY_ITEMS = [
  { key: 'chestPain', label: 'Chest Pain' },
  { key: 'dizziness', label: 'Dizziness' },
  { key: 'heartCondition', label: 'Heart Condition' },
  { key: 'uncontrolledBP', label: 'Uncontrolled BP' },
  { key: 'recentSurgery', label: 'Recent Surgery' },
] as const;

function SafetyDot({ value }: { value: unknown }) {
  if (value == null) {
    return (
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textMuted }} />
    );
  }
  const isYes = String(value).toLowerCase() === 'yes';
  return (
    <View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: isYes ? '#ef4444' : '#10b981',
      }}
    />
  );
}

export function MedicalSection({ medical }: MedicalSectionProps) {
  const hasMedicalFlags = SAFETY_ITEMS.some(
    (item) => String(medical[item.key] ?? '').toLowerCase() === 'yes'
  );

  const showSurgeryDetails =
    String(medical.recentSurgery ?? '').toLowerCase() === 'yes' && !!medical.surgeryDetailsText;

  const hasAdditionalInfo =
    !!medical.currentMedications || !!medical.diagnosedConditions || !!medical.otherConcerns;

  return (
    <View>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionHeadingBar} />
        <Text style={styles.sectionHeadingText}>Medical Screening</Text>
        {hasMedicalFlags && (
          <View
            style={{
              marginLeft: 'auto',
              paddingHorizontal: 6,
              paddingVertical: 2,
              backgroundColor: '#fffbeb',
              borderWidth: 0.5,
              borderColor: '#fcd34d',
              borderRadius: 3,
            }}
          >
            <Text style={{ fontSize: 7, fontFamily: FONT.bold, textTransform: 'uppercase', letterSpacing: 0.5, color: '#92400e' }}>
              Flag(s) Detected
            </Text>
          </View>
        )}
      </View>

      <View style={{ borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 6, overflow: 'hidden' }}>
        {/* Safety screening row */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 8,
            paddingVertical: 6,
            backgroundColor: COLORS.bgLight,
            gap: 8,
          }}
        >
          {SAFETY_ITEMS.map((item) => (
            <View
              key={item.key}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}
            >
              <Text style={{ fontSize: 7, color: COLORS.textSecondary }}>{item.label}</Text>
              <SafetyDot value={medical[item.key]} />
            </View>
          ))}
        </View>

        {/* Surgery details */}
        {showSurgeryDetails && (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderTopWidth: 0.5,
              borderTopColor: COLORS.border,
              backgroundColor: '#fef2f2',
            }}
          >
            <Text style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.textSecondary, marginBottom: 1 }}>
              Surgery / Injury Details
            </Text>
            <Text style={{ fontSize: 8, color: COLORS.textPrimary }}>
              {String(medical.surgeryDetailsText)}
            </Text>
          </View>
        )}

        {/* Additional medical info */}
        {hasAdditionalInfo && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 6, borderTopWidth: 0.5, borderTopColor: COLORS.border }}>
            {medical.currentMedications ? (
              <View style={{ marginBottom: 4 }}>
                <Text style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.textSecondary, marginBottom: 1 }}>
                  Medications
                </Text>
                <Text style={{ fontSize: 8, color: COLORS.textPrimary }}>
                  {String(medical.currentMedications)}
                </Text>
              </View>
            ) : null}
            {medical.diagnosedConditions ? (
              <View style={{ marginBottom: 4 }}>
                <Text style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.textSecondary, marginBottom: 1 }}>
                  Diagnosed Conditions
                </Text>
                <Text style={{ fontSize: 8, color: COLORS.textPrimary }}>
                  {String(medical.diagnosedConditions)}
                </Text>
              </View>
            ) : null}
            {medical.otherConcerns ? (
              <View>
                <Text style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.textSecondary, marginBottom: 1 }}>
                  Other Concerns
                </Text>
                <Text style={{ fontSize: 8, color: COLORS.textPrimary }}>
                  {String(medical.otherConcerns)}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}
