import { View, Text } from '@react-pdf/renderer';
import { FONT } from '@/lib/pdf/fonts';

interface ReferralFlagPdfProps {
  level: 'monitor' | 'urgent';
}

export function ReferralFlagPdf({ level }: ReferralFlagPdfProps) {
  if (level === 'urgent') {
    return (
      <View
        style={{
          backgroundColor: '#fef2f2',
          borderWidth: 0.5,
          borderColor: '#fca5a5',
          borderRadius: 3,
          paddingHorizontal: 6,
          paddingVertical: 2,
          marginTop: 2,
        }}
      >
        <Text style={{ fontSize: 7, fontFamily: FONT.bold, textTransform: 'uppercase', color: '#dc2626' }}>
          Refer to GP for further investigation
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: '#fffbeb',
        borderWidth: 0.5,
        borderColor: '#fcd34d',
        borderRadius: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginTop: 2,
      }}
    >
      <Text style={{ fontSize: 7, fontFamily: FONT.bold, textTransform: 'uppercase', color: '#b45309' }}>
        Monitor -- retest in 3-6 months
      </Text>
    </View>
  );
}
