import { View, Text, Image } from '@react-pdf/renderer';
import path from 'node:path';
import type { ReportData } from '@/lib/pdf/types';
import { COLORS } from '@/lib/pdf/colors';
import { FONT } from '@/lib/pdf/fonts';

interface ReportHeaderProps {
  data: ReportData;
}

export function ReportHeader({ data }: ReportHeaderProps) {
  const reportDate = data.assessmentDate
    ? new Date(data.assessmentDate).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  return (
    <View
      style={{
        backgroundColor: COLORS.navy,
        borderRadius: 8,
        padding: '24 28',
        overflow: 'hidden',
      }}
    >
      {/* Logo + divider + subtitle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Image
          src={path.join(process.cwd(), 'public', 'logo.png')}
          style={{ height: 28, width: 'auto' }}
        />
        <View style={{ height: 20, width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
        <Text
          style={{
            fontSize: 7,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            fontFamily: FONT.regular,
          }}
        >
          Longevity Assessment Report
        </Text>
      </View>

      {/* Title */}
      <Text
        style={{
          fontSize: 22,
          fontFamily: FONT.bold,
          color: COLORS.white,
          letterSpacing: -0.3,
        }}
      >
        Complete Longevity Analysis
      </Text>

      {/* Gold accent bar */}
      <View
        style={{
          height: 3,
          width: 40,
          backgroundColor: COLORS.gold,
          borderRadius: 2,
          marginTop: 6,
          marginBottom: 14,
        }}
      />

      {/* 4-column grid */}
      <View style={{ flexDirection: 'row', gap: 20 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.textFaint }}>
            Client
          </Text>
          <Text style={{ fontSize: 9, fontFamily: FONT.bold, color: COLORS.white, marginTop: 2 }}>
            {data.clientName || 'N/A'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.textFaint }}>
            Date
          </Text>
          <Text style={{ fontSize: 9, fontFamily: FONT.bold, color: COLORS.white, marginTop: 2 }}>
            {reportDate}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.textFaint }}>
            Age
          </Text>
          <Text style={{ fontSize: 9, fontFamily: FONT.bold, color: COLORS.white, marginTop: 2 }}>
            {data.clientAge != null ? String(data.clientAge) : '\u2014'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 1, color: COLORS.textFaint }}>
            Biological Sex
          </Text>
          <Text style={{ fontSize: 9, fontFamily: FONT.bold, color: COLORS.white, marginTop: 2, textTransform: 'capitalize' }}>
            {data.clientGender || '\u2014'}
          </Text>
        </View>
      </View>
    </View>
  );
}
