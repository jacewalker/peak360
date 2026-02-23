'use client';

import { useEffect, useState } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import Badge from '@/components/ui/Badge';
import { getPeak360Rating } from '@/lib/normative/ratings';
import { generatePeak360Insights } from '@/lib/normative/insights';
import type { RatingTier } from '@/types/normative';

interface ReportMarker {
  key: string;
  label: string;
  value: number | null;
  tier: RatingTier | null;
  unit: string;
}

interface Insight {
  title: string;
  why: string;
  doNow: string[];
}

interface Section11Props {
  assessmentId: string;
}

// Map of testKey -> { label, sectionNumber, dataKey }
const REPORT_MARKERS: { testKey: string; label: string; section: number; dataKey: string }[] = [
  // Blood tests
  { testKey: 'cholesterol_total', label: 'Total Cholesterol', section: 5, dataKey: 'cholesterolTotal' },
  { testKey: 'ldl_cholesterol', label: 'LDL Cholesterol', section: 5, dataKey: 'ldl' },
  { testKey: 'hdl_cholesterol', label: 'HDL Cholesterol', section: 5, dataKey: 'hdl' },
  { testKey: 'triglycerides', label: 'Triglycerides', section: 5, dataKey: 'triglycerides' },
  { testKey: 'fasting_glucose', label: 'Fasting Glucose', section: 5, dataKey: 'glucose' },
  { testKey: 'hba1c', label: 'HbA1c', section: 5, dataKey: 'hba1c' },
  { testKey: 'crp_hs', label: 'hs-CRP', section: 5, dataKey: 'hsCRP' },
  { testKey: 'vitamin_d_25oh', label: 'Vitamin D', section: 5, dataKey: 'vitaminD' },
  // Body comp
  { testKey: 'bmi', label: 'BMI', section: 6, dataKey: 'bmi' },
  { testKey: 'body_fat_percent', label: 'Body Fat %', section: 6, dataKey: 'bodyFatPercentage' },
  { testKey: 'waist_to_hip', label: 'Waist-to-Hip Ratio', section: 6, dataKey: 'waistToHipRatio' },
  // Fitness
  { testKey: 'vo2max', label: 'VO2 Max', section: 7, dataKey: 'vo2max' },
  { testKey: 'resting_hr', label: 'Resting Heart Rate', section: 7, dataKey: 'restingHR' },
  { testKey: 'blood_pressure_systolic', label: 'Blood Pressure (Systolic)', section: 7, dataKey: 'bpSystolic' },
  // Mobility
  { testKey: 'hip_mobility_left', label: 'Hip Mobility (Left)', section: 9, dataKey: 'hipMobilityLeft' },
  { testKey: 'hip_mobility_right', label: 'Hip Mobility (Right)', section: 9, dataKey: 'hipMobilityRight' },
];

export default function Section11({ assessmentId }: Section11Props) {
  const [loading, setLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState<Record<string, unknown>>({});
  const [markers, setMarkers] = useState<ReportMarker[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [tierCounts, setTierCounts] = useState<Record<RatingTier, number>>({
    elite: 0, great: 0, normal: 0, cautious: 0, poor: 0,
  });

  useEffect(() => {
    const loadReport = async () => {
      // Load all sections
      const sections: Record<number, Record<string, unknown>> = {};
      const fetches = [1, 5, 6, 7, 9].map(async (num) => {
        const res = await fetch(`/api/assessments/${assessmentId}/sections/${num}`);
        const { data } = await res.json();
        sections[num] = (data || {}) as Record<string, unknown>;
      });
      await Promise.all(fetches);

      const info = sections[1] || {};
      setClientInfo(info);

      const age = info.clientAge as number || null;
      const gender = info.clientGender as string || null;

      // Evaluate markers
      const evaluated: ReportMarker[] = [];
      const counts: Record<RatingTier, number> = { elite: 0, great: 0, normal: 0, cautious: 0, poor: 0 };

      for (const m of REPORT_MARKERS) {
        const sectionData = sections[m.section] || {};
        const rawValue = sectionData[m.dataKey];
        const value = rawValue != null ? Number(rawValue) : null;

        if (value === null || isNaN(value)) {
          evaluated.push({ key: m.testKey, label: m.label, value: null, tier: null, unit: '' });
          continue;
        }

        const rating = getPeak360Rating(m.testKey, value, age, gender);
        const tier = rating?.tier || null;
        if (tier) counts[tier]++;

        evaluated.push({
          key: m.testKey,
          label: m.label,
          value,
          tier,
          unit: rating?.unit || '',
        });
      }

      setMarkers(evaluated);
      setTierCounts(counts);

      // Generate insights
      const insightMarkers = evaluated
        .filter((m) => m.value !== null)
        .map((m) => ({ testKey: m.key, label: m.label, value: m.value }));
      const generatedInsights = generatePeak360Insights({ age, gender, markers: insightMarkers });
      setInsights(generatedInsights);
      setLoading(false);
    };

    loadReport();
  }, [assessmentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-3 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <p className="text-navy font-semibold">Generating Report</p>
            <p className="text-sm text-muted mt-1">Analyzing assessment data...</p>
          </div>
        </div>
      </div>
    );
  }

  const totalRated = Object.values(tierCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <SectionHeader
        number={11}
        title="Complete Longevity Analysis"
        description={`Assessment report for ${clientInfo.clientName || 'Client'}`}
      />

      {/* Summary */}
      <div className="bg-white rounded-xl border border-border p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-navy mb-6">Overall Summary</h3>
        <div className="grid grid-cols-5 gap-2 sm:gap-4 text-center">
          {(['elite', 'great', 'normal', 'cautious', 'poor'] as RatingTier[]).map((tier) => (
            <div key={tier} className="space-y-2 p-2 sm:p-3 rounded-xl bg-surface-alt/50">
              <Badge tier={tier} />
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{tierCounts[tier]}</p>
              <p className="text-xs text-muted">
                {totalRated > 0 ? Math.round((tierCounts[tier] / totalRated) * 100) : 0}%
              </p>
            </div>
          ))}
        </div>
        {totalRated > 0 && (
          <p className="text-xs text-muted text-center mt-4">{totalRated} markers evaluated</p>
        )}
      </div>

      {/* Marker Results */}
      <div className="bg-white rounded-xl border border-border p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-navy mb-4">Detailed Results</h3>
        <div className="divide-y divide-border/50">
          {markers.map((m) => (
            <div
              key={m.key}
              className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-surface-alt/50 transition-colors"
            >
              <span className="text-sm font-medium text-foreground">{m.label}</span>
              <div className="flex items-center gap-3">
                {m.value !== null ? (
                  <>
                    <span className="text-sm text-muted tabular-nums">
                      {m.value} {m.unit}
                    </span>
                    {m.tier && <Badge tier={m.tier} />}
                  </>
                ) : (
                  <span className="text-xs text-muted/60 italic">Not recorded</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-navy mb-4">Peak360 Insights & Recommendations</h3>
          <div className="space-y-6">
            {insights.map((insight, i) => (
              <div key={i} className="border-l-4 border-gold pl-4 space-y-2">
                <h4 className="font-semibold text-navy">{insight.title}</h4>
                <p className="text-sm text-muted">{insight.why}</p>
                {insight.doNow.length > 0 && (
                  <ul className="text-sm text-foreground space-y-1">
                    {insight.doNow.map((item, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <span className="text-gold mt-1">&#8226;</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center no-print pt-4">
        <button
          onClick={() => window.print()}
          className="px-8 py-3 bg-navy text-white rounded-lg font-semibold hover:bg-navy-light transition-all hover:shadow-md"
        >
          Print Report
        </button>
        <button
          onClick={async () => {
            await fetch(`/api/assessments/${assessmentId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'completed' }),
            });
            window.location.href = '/';
          }}
          className="px-8 py-3 bg-gold text-navy rounded-lg font-semibold hover:bg-gold-light transition-all hover:shadow-md hover:-translate-y-px"
        >
          Save & Complete Assessment
        </button>
      </div>
    </div>
  );
}
