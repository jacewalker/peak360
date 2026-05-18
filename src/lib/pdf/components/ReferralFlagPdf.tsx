import { View, Text } from '@react-pdf/renderer';
import { FONT } from '@/lib/pdf/fonts';

interface ReferralFlagPdfProps {
  level: 'monitor' | 'urgent';
}

export function ReferralFlagPdf({ level }: ReferralFlagPdfProps) {
  if (level === 'urgent') {
    // Dark-portal red callout (red-500 @ 15% baked on bg-2 + bright red-300 text).
    return (
      <View
        style={{
          backgroundColor: '#2f1617',
          borderWidth: 0.5,
          borderColor: '#fca5a5',
          borderRadius: 3,
          paddingHorizontal: 6,
          paddingVertical: 2,
          marginTop: 2,
        }}
      >
        <Text style={{ fontSize: 7, fontFamily: FONT.bold, textTransform: 'uppercase', color: '#fca5a5' }}>
          Refer to GP for further investigation
        </Text>
      </View>
    );
  }

  // Dark-portal amber callout (amber-500 @ 15% baked on bg-2 + bright amber-300 text).
  return (
    <View
      style={{
        backgroundColor: '#30240f',
        borderWidth: 0.5,
        borderColor: '#fcd34d',
        borderRadius: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginTop: 2,
      }}
    >
      <Text style={{ fontSize: 7, fontFamily: FONT.bold, textTransform: 'uppercase', color: '#fcd34d' }}>
        Monitor -- retest in 3-6 months
      </Text>
    </View>
  );
}
