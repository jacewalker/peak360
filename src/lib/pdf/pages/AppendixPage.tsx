import { Page, View, Text, Svg, Path } from '@react-pdf/renderer';
import { COLORS } from '@/lib/pdf/colors';
import { FONT, WEIGHT } from '@/lib/pdf/fonts';
import { SectionEyebrow } from '@/lib/pdf/components/SectionEyebrow';
import { ReportFooter } from '@/lib/pdf/components/ReportFooter';
import type { ReportData } from '@/lib/pdf/types';

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

function BlockHead({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 }}>
      <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: COLORS.gold }} />
      <Text
        style={{
          fontFamily: FONT.mono,
          fontWeight: WEIGHT.semibold,
          fontSize: 8.5,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: COLORS.textSecondary,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

function ReadinessCell({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <View
      style={{
        width: '33.333%',
        paddingHorizontal: 5,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          borderWidth: 0.5,
          borderColor: COLORS.border,
          borderRadius: 9,
          backgroundColor: COLORS.bgLight,
          paddingVertical: 12,
          paddingHorizontal: 14,
        }}
      >
        <Text
          style={{
            fontFamily: FONT.mono,
            fontSize: 6.5,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: COLORS.textMuted,
          }}
        >
          {label}
        </Text>
        <Text style={{ marginTop: 5, fontFamily: FONT.sans, fontWeight: WEIGHT.semibold, fontSize: 15, color: COLORS.textPrimary }}>
          {value}
          {suffix ? (
            <Text style={{ fontSize: 8, fontWeight: WEIGHT.regular, color: COLORS.textSecondary }}>{` ${suffix}`}</Text>
          ) : null}
        </Text>
      </View>
    </View>
  );
}

function Flag({ label, yes }: { label: string; yes: boolean | null }) {
  const valueText = yes === null ? 'Not recorded' : yes ? 'Yes' : 'No';
  const valueColor = yes === null ? COLORS.textMuted : yes ? '#fcd34d' : '#6ee7b7';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        borderRadius: 9,
        backgroundColor: COLORS.bgLight,
      }}
    >
      <Text style={{ flex: 1, fontFamily: FONT.sans, fontWeight: WEIGHT.regular, fontSize: 10, color: COLORS.textSecondary }}>
        {label}
      </Text>
      <Text
        style={{
          fontFamily: FONT.mono,
          fontWeight: WEIGHT.semibold,
          fontSize: 8,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: valueColor,
        }}
      >
        {valueText}
      </Text>
    </View>
  );
}

function ConsentCard({ who, signed, date }: { who: string; signed: boolean; date: string | null }) {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 0.5,
        borderColor: COLORS.border,
        borderRadius: 9,
        backgroundColor: COLORS.bgLight,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: signed ? '#0e2821' : COLORS.bgLighter,
        }}
      >
        {signed ? (
          <Svg width={14} height={14} viewBox="0 0 24 24">
            <Path d="M20 6L9 17l-5-5" stroke="#6ee7b7" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        ) : (
          <Text style={{ fontFamily: FONT.sans, fontWeight: WEIGHT.bold, fontSize: 12, color: COLORS.textMuted }}>-</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: FONT.sans, fontWeight: WEIGHT.semibold, fontSize: 10.5, color: COLORS.textPrimary }}>
          {who}
        </Text>
        <Text
          style={{
            marginTop: 3,
            fontFamily: FONT.mono,
            fontSize: 7,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: COLORS.textSecondary,
          }}
        >
          {signed ? `Signed${date ? ` - ${date}` : ''}` : 'Not signed'}
        </Text>
      </View>
    </View>
  );
}

function asYesNo(v: unknown): boolean | null {
  if (v == null || v === '') return null;
  const s = String(v).toLowerCase();
  if (s === 'yes' || s === 'true') return true;
  if (s === 'no' || s === 'false') return false;
  return null;
}

export function AppendixPage({ data }: { data: ReportData }) {
  const r = data.readiness ?? {};
  const m = data.medical ?? {};
  const c = data.consent ?? {};

  const sleep = r.sleepHours != null ? String(r.sleepHours) : r.sleepQuality != null ? String(r.sleepQuality) : null;
  const sleepSuffix = r.sleepHours != null ? 'hrs' : r.sleepQuality != null ? '/ 10' : undefined;
  const stress = r.stressLevel != null ? String(r.stressLevel) : null;
  const energy = r.energyLevel != null ? String(r.energyLevel) : null;
  const soreness = r.sorenessLevel != null ? String(r.sorenessLevel) : null;
  const caffeine = CAFFEINE_LABELS[r.caffeineToday as string] ?? null;
  const alcohol = ALCOHOL_LABELS[r.alcoholLast48 as string] ?? null;

  const readinessCells: { label: string; value: string; suffix?: string }[] = [];
  if (sleep) readinessCells.push({ label: 'Sleep', value: sleep, suffix: sleepSuffix });
  if (stress) readinessCells.push({ label: 'Stress', value: stress, suffix: '/ 10' });
  if (energy) readinessCells.push({ label: 'Energy', value: energy, suffix: '/ 10' });
  if (soreness) readinessCells.push({ label: 'Soreness', value: soreness, suffix: '/ 10' });
  if (caffeine) readinessCells.push({ label: 'Caffeine', value: caffeine });
  if (alcohol) readinessCells.push({ label: 'Alcohol (48h)', value: alcohol });

  const flags: { label: string; yes: boolean | null }[] = [
    { label: 'Known heart condition', yes: asYesNo(m.heartCondition) },
    { label: 'Chest pain on exertion', yes: asYesNo(m.chestPain) },
    { label: 'Dizziness or fainting', yes: asYesNo(m.dizziness) },
    { label: 'Currently taking prescription medication', yes: asYesNo(m.medication) },
    { label: 'Recent surgery or injury', yes: asYesNo(m.recentSurgery) },
  ].filter((f) => f.yes !== null);

  const clientSigned = !!c.clientSignatureName || !!c.clientSignature;
  const coachSigned = !!c.coachSignatureName || !!c.coachSignature;
  const clientName = c.clientSignatureName ? String(c.clientSignatureName) : data.clientName || 'Client';
  const coachName = c.coachSignatureName ? String(c.coachSignatureName) : 'Coach';
  const clientDate = c.clientSignatureDate ? String(c.clientSignatureDate) : null;
  const coachDate = c.coachSignatureDate ? String(c.coachSignatureDate) : null;

  return (
    <Page size="A4" style={{ backgroundColor: COLORS.page, paddingTop: 42, paddingBottom: 48, paddingHorizontal: 56 }}>
      <SectionEyebrow prefix="Appendix" />
      <Text
        style={{
          fontFamily: FONT.sans,
          fontWeight: WEIGHT.semibold,
          fontSize: 28,
          letterSpacing: -0.6,
          color: COLORS.textPrimary,
          marginTop: 12,
        }}
      >
        Assessment record
      </Text>
      <Text
        style={{
          fontFamily: FONT.sans,
          fontWeight: WEIGHT.regular,
          fontSize: 10,
          lineHeight: 1.5,
          color: COLORS.textSecondary,
          marginTop: 8,
          maxWidth: 380,
        }}
      >
        Context captured on the day of testing - readiness, medical screening and consent. Held for your record and your coach reference.
      </Text>

      {/* Readiness */}
      <View style={{ marginTop: 24 }}>
        <BlockHead title="Assessment-day readiness" />
        {readinessCells.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 }}>
            {readinessCells.map((cell) => (
              <ReadinessCell key={cell.label} label={cell.label} value={cell.value} suffix={cell.suffix} />
            ))}
          </View>
        ) : (
          <Text style={{ fontFamily: FONT.sans, fontSize: 9.5, color: COLORS.textMuted }}>No readiness data recorded.</Text>
        )}
      </View>

      {/* Medical */}
      <View style={{ marginTop: 18 }}>
        <BlockHead title="Medical screening" />
        {flags.length > 0 ? (
          <View style={{ gap: 7 }}>
            {flags.map((f) => (
              <Flag key={f.label} label={f.label} yes={f.yes} />
            ))}
          </View>
        ) : (
          <Text style={{ fontFamily: FONT.sans, fontSize: 9.5, color: COLORS.textMuted }}>No medical screening flags recorded.</Text>
        )}
      </View>

      {/* Consent */}
      <View style={{ marginTop: 18 }}>
        <BlockHead title="Consent" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <ConsentCard who={`Client - ${clientName}`} signed={clientSigned} date={clientDate} />
          <ConsentCard who={`Coach - ${coachName}`} signed={coachSigned} date={coachDate} />
        </View>
      </View>

      {/* Disclaimer */}
      <View
        style={{
          marginTop: 24,
          borderWidth: 0.5,
          borderColor: '#3a2620',
          borderRadius: 9,
          backgroundColor: '#1a110d',
          paddingVertical: 14,
          paddingHorizontal: 16,
        }}
      >
        <Text
          style={{
            fontFamily: FONT.mono,
            fontWeight: WEIGHT.semibold,
            fontSize: 7.5,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: '#d99b86',
            marginBottom: 7,
          }}
        >
          Important - not medical advice
        </Text>
        <Text style={{ fontFamily: FONT.sans, fontWeight: WEIGHT.regular, fontSize: 9, lineHeight: 1.6, color: COLORS.textSecondary }}>
          This report is an educational longevity assessment, not a diagnosis. Normative ranges are reference values adjusted for age and biological sex and may not account for your individual medical history. Always consult a qualified healthcare professional before making changes to medication, training or diet. Peak360 is operated by Strong Bodies Geelong.
        </Text>
      </View>

      <ReportFooter context="Assessment record" />
    </Page>
  );
}
