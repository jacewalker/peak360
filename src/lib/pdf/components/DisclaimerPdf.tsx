import { View, Text } from '@react-pdf/renderer';
import { COLORS } from '@/lib/pdf/colors';
import { FONT } from '@/lib/pdf/fonts';

export function DisclaimerPdf() {
  return (
    <View
      style={{
        borderWidth: 0.5,
        borderColor: COLORS.border,
        borderRadius: 4,
        padding: 8,
        backgroundColor: COLORS.bgLight,
      }}
    >
      <Text style={{ fontSize: 8, fontFamily: FONT.bold, color: COLORS.textSecondary, marginBottom: 3 }}>
        Medical Disclaimer
      </Text>
      <Text style={{ fontSize: 7, fontFamily: FONT.regular, color: COLORS.textSecondary, lineHeight: 1.5 }}>
        This report is generated for informational and educational purposes only. It does not constitute medical advice, diagnosis, or treatment. Normative ranges are based on published clinical reference data for the general adult population and may not reflect individual health circumstances. All results should be reviewed in consultation with a qualified healthcare professional. If any markers are flagged as critically out of range, seek prompt medical advice.
      </Text>
      <Text style={{ fontSize: 7, fontFamily: FONT.italic, color: COLORS.textMuted, marginTop: 3 }}>
        Normative ranges are based on biological sex reference data.
      </Text>
    </View>
  );
}
