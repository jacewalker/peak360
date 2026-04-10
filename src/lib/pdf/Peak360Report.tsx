import { Document, Page, View, Text } from '@react-pdf/renderer';
import type { ReportData } from '@/lib/pdf/types';
import { COLORS } from '@/lib/pdf/colors';
import { FONT } from '@/lib/pdf/fonts';
import { styles } from '@/lib/pdf/styles';
import { ReportHeader } from './components/ReportHeader';
import { DisclaimerPdf } from './components/DisclaimerPdf';
import { ReadinessSection } from './components/ReadinessSection';
import { MedicalSection } from './components/MedicalSection';
import { ConsentStatus } from './components/ConsentStatus';
import { TierSummary } from './components/TierSummary';
import { MarkerTable } from './components/MarkerTable';
import { InsightsSection } from './components/InsightsSection';
import { ReportFooter } from './components/ReportFooter';

interface Peak360ReportProps {
  data: ReportData;
}

export function Peak360Report({ data }: Peak360ReportProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Fixed footer on every page */}
        <ReportFooter />

        {/* Report Header */}
        <ReportHeader data={data} />

        {/* Medical Disclaimer (top) */}
        <View style={{ marginTop: 10 }}>
          <DisclaimerPdf />
        </View>

        {/* Gender warning if not specified */}
        {!data.clientGender && (
          <View
            style={{
              marginTop: 6,
              padding: '4 8',
              backgroundColor: '#fffbeb',
              borderWidth: 0.5,
              borderColor: '#fcd34d',
              borderRadius: 4,
            }}
          >
            <Text style={{ fontSize: 8, fontFamily: FONT.regular, color: '#92400e' }}>
              Biological sex not specified — ranges shown are for male reference values. Provide biological sex in Section 1 for accurate normative ranges.
            </Text>
          </View>
        )}

        {/* Daily Readiness */}
        <ReadinessSection readiness={data.readiness} />

        {/* Medical Screening */}
        <MedicalSection medical={data.medical} />

        {/* Consent Status */}
        <View style={{ marginTop: 12 }}>
          <ConsentStatus consent={data.consent} />
        </View>

        {/* Tier Summary */}
        <TierSummary tierCounts={data.tierCounts} totalRated={data.totalRated} />

        {/* Detailed Marker Results */}
        <MarkerTable markers={data.markers} />

        {/* Insights & Recommendations (forced new page) */}
        <InsightsSection insights={data.insights} />

        {/* Medical Disclaimer (bottom) */}
        <View style={{ marginTop: 16 }}>
          <DisclaimerPdf />
        </View>
      </Page>
    </Document>
  );
}
