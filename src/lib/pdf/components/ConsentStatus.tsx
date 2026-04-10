import { View, Text } from '@react-pdf/renderer';
import { COLORS } from '@/lib/pdf/colors';
import { FONT } from '@/lib/pdf/fonts';

interface ConsentStatusProps {
  consent: Record<string, unknown>;
}

export function ConsentStatus({ consent }: ConsentStatusProps) {
  const consentSigned = !!consent.clientSignatureName || !!consent.coachSignatureName;
  const clientSigCaptured = !!consent.clientSignature;
  const coachSigCaptured = !!consent.coachSignature;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 6,
        backgroundColor: COLORS.bgLight,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        borderRadius: 4,
        gap: 8,
      }}
    >
      {/* Consent status */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: consentSigned ? '#10b981' : '#9ca3af',
          }}
        />
        <Text style={{ fontSize: 8, fontFamily: FONT.bold, color: COLORS.textPrimary }}>
          {consentSigned ? 'Consent Provided' : 'Consent Not Recorded'}
        </Text>
      </View>

      {/* Divider */}
      <View style={{ width: 0.5, height: 10, backgroundColor: COLORS.border }} />

      {/* Client signature */}
      <Text style={{ fontSize: 7, color: COLORS.textSecondary }}>
        Client: {consent.clientSignatureName ? String(consent.clientSignatureName) : '\u2014'}
        {consent.clientSignatureDate ? ` (${consent.clientSignatureDate})` : ''}
        {clientSigCaptured ? ' \u2014 Signed' : ''}
      </Text>

      {/* Divider */}
      <View style={{ width: 0.5, height: 10, backgroundColor: COLORS.border }} />

      {/* Coach signature */}
      <Text style={{ fontSize: 7, color: COLORS.textSecondary }}>
        Coach: {consent.coachSignatureName ? String(consent.coachSignatureName) : '\u2014'}
        {consent.coachSignatureDate ? ` (${consent.coachSignatureDate})` : ''}
        {coachSigCaptured ? ' \u2014 Signed' : ''}
      </Text>
    </View>
  );
}
