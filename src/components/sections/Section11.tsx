'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getPeak360Rating } from '@/lib/normative/ratings';
import { generatePeak360Insights } from '@/lib/normative/insights';
import type { RatingTier } from '@/types/normative';
import { TIER_LABELS } from '@/types/normative';

interface ReportMarker {
  key: string;
  label: string;
  value: number | null;
  tier: RatingTier | null;
  unit: string;
  category: string;
}

interface Insight {
  title: string;
  why: string;
  doNow: string[];
}

interface Section11Props {
  assessmentId: string;
}

const TIER_DOT: Record<RatingTier, string> = {
  elite: '#10b981',
  great: '#3b82f6',
  normal: '#6b7280',
  cautious: '#f59e0b',
  poor: '#ef4444',
};

const TIER_ROW_BG: Record<RatingTier, string> = {
  elite: 'bg-emerald-50/80',
  great: 'bg-blue-50/80',
  normal: 'bg-gray-50/60',
  cautious: 'bg-amber-50/80',
  poor: 'bg-red-50/80',
};

const TIER_ROW_BORDER: Record<RatingTier, string> = {
  elite: 'border-l-emerald-500',
  great: 'border-l-blue-500',
  normal: 'border-l-gray-300',
  cautious: 'border-l-amber-500',
  poor: 'border-l-red-500',
};

const TIER_TEXT: Record<RatingTier, string> = {
  elite: 'text-emerald-700',
  great: 'text-blue-700',
  normal: 'text-gray-600',
  cautious: 'text-amber-700',
  poor: 'text-red-700',
};

// Map of testKey -> { label, sectionNumber, dataKey, category }
const REPORT_MARKERS: { testKey: string; label: string; section: number; dataKey: string; category: string }[] = [
  // Blood tests
  { testKey: 'cholesterol_total', label: 'Total Cholesterol', section: 5, dataKey: 'cholesterolTotal', category: 'Blood Tests & Biomarkers' },
  { testKey: 'ldl_cholesterol', label: 'LDL Cholesterol', section: 5, dataKey: 'ldl', category: 'Blood Tests & Biomarkers' },
  { testKey: 'hdl_cholesterol', label: 'HDL Cholesterol', section: 5, dataKey: 'hdl', category: 'Blood Tests & Biomarkers' },
  { testKey: 'triglycerides', label: 'Triglycerides', section: 5, dataKey: 'triglycerides', category: 'Blood Tests & Biomarkers' },
  { testKey: 'fasting_glucose', label: 'Fasting Glucose', section: 5, dataKey: 'glucose', category: 'Blood Tests & Biomarkers' },
  { testKey: 'hba1c', label: 'HbA1c', section: 5, dataKey: 'hba1c', category: 'Blood Tests & Biomarkers' },
  { testKey: 'crp_hs', label: 'hs-CRP', section: 5, dataKey: 'hsCRP', category: 'Blood Tests & Biomarkers' },
  { testKey: 'vitamin_d_25oh', label: 'Vitamin D', section: 5, dataKey: 'vitaminD', category: 'Blood Tests & Biomarkers' },
  // Body comp
  { testKey: 'bwi', label: 'Evolt360 BWI', section: 6, dataKey: 'bwi', category: 'Body Composition' },
  { testKey: 'body_fat_percent', label: 'Body Fat %', section: 6, dataKey: 'bodyFatPercentage', category: 'Body Composition' },
  { testKey: 'waist_to_hip', label: 'Waist-to-Hip Ratio', section: 6, dataKey: 'waistToHipRatio', category: 'Body Composition' },
  // Fitness
  { testKey: 'vo2max', label: 'VO2 Max', section: 7, dataKey: 'vo2max', category: 'Cardiovascular Fitness' },
  { testKey: 'resting_hr', label: 'Resting Heart Rate', section: 7, dataKey: 'restingHR', category: 'Cardiovascular Fitness' },
  { testKey: 'blood_pressure_systolic', label: 'Blood Pressure (Systolic)', section: 7, dataKey: 'bpSystolic', category: 'Cardiovascular Fitness' },
  // Strength
  { testKey: 'grip_strength_left', label: 'Grip Strength (Left)', section: 8, dataKey: 'gripStrengthLeft', category: 'Strength Testing' },
  { testKey: 'grip_strength_right', label: 'Grip Strength (Right)', section: 8, dataKey: 'gripStrengthRight', category: 'Strength Testing' },
  { testKey: 'cmj_left', label: 'CMJ (Left)', section: 8, dataKey: 'cmjLeft', category: 'Strength Testing' },
  { testKey: 'cmj_right', label: 'CMJ (Right)', section: 8, dataKey: 'cmjRight', category: 'Strength Testing' },
  { testKey: 'imtp_max_force', label: 'IMTP Max Force', section: 8, dataKey: 'imtpMaxForce', category: 'Strength Testing' },
  { testKey: 'single_leg_hop_left', label: 'Single Leg Hop (Left)', section: 8, dataKey: 'singleLegHopLeft', category: 'Strength Testing' },
  { testKey: 'single_leg_hop_right', label: 'Single Leg Hop (Right)', section: 8, dataKey: 'singleLegHopRight', category: 'Strength Testing' },
  { testKey: 'single_leg_balance_left', label: 'SL Balance (Left)', section: 8, dataKey: 'singleLegBalanceLeft', category: 'Strength Testing' },
  { testKey: 'single_leg_balance_right', label: 'SL Balance (Right)', section: 8, dataKey: 'singleLegBalanceRight', category: 'Strength Testing' },
  { testKey: 'shoulder_iso_y_left', label: 'Shoulder Iso-Y (Left)', section: 8, dataKey: 'shoulderIsoYLeft', category: 'Strength Testing' },
  { testKey: 'shoulder_iso_y_right', label: 'Shoulder Iso-Y (Right)', section: 8, dataKey: 'shoulderIsoYRight', category: 'Strength Testing' },
  { testKey: 'pushups_max', label: 'Push-Up Max', section: 8, dataKey: 'pushupsMax', category: 'Strength Testing' },
  { testKey: 'dead_man_hang', label: 'Dead Man Hang', section: 8, dataKey: 'deadManHang', category: 'Strength Testing' },
  { testKey: 'farmers_carry_distance', label: 'Farmers Carry', section: 8, dataKey: 'farmersCarryDistance', category: 'Strength Testing' },
  // Mobility
  { testKey: 'hip_mobility_left', label: 'Hip Mobility (Left)', section: 9, dataKey: 'hipMobilityLeft', category: 'Mobility & Flexibility' },
  { testKey: 'hip_mobility_right', label: 'Hip Mobility (Right)', section: 9, dataKey: 'hipMobilityRight', category: 'Mobility & Flexibility' },
];

function TierPill({ tier }: { tier: RatingTier }) {
  const bg: Record<RatingTier, string> = {
    elite: 'bg-emerald-600',
    great: 'bg-blue-600',
    normal: 'bg-gray-500',
    cautious: 'bg-amber-500',
    poor: 'bg-red-600',
  };
  return (
    <span className={`report-tier-pill inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase text-white ${bg[tier]}`}>
      {TIER_LABELS[tier]}
    </span>
  );
}

export default function Section11({ assessmentId }: Section11Props) {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [clientInfo, setClientInfo] = useState<Record<string, unknown>>({});
  const [markers, setMarkers] = useState<ReportMarker[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [tierCounts, setTierCounts] = useState<Record<RatingTier, number>>({
    elite: 0, great: 0, normal: 0, cautious: 0, poor: 0,
  });
  const reportRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const exportPdf = useCallback(async () => {
    if (!reportRef.current || exporting) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ]);

      // Hide action buttons during capture
      if (actionsRef.current) actionsRef.current.style.display = 'none';

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      if (actionsRef.current) actionsRef.current.style.display = '';

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Collect forced page-break positions (in mm) from data-pdf-break elements
      const forcedBreaks: number[] = [];
      const containerRect = reportRef.current.getBoundingClientRect();
      reportRef.current.querySelectorAll('[data-pdf-break]').forEach((el) => {
        const elRect = (el as HTMLElement).getBoundingClientRect();
        const relativeTop = elRect.top - containerRect.top;
        const mm = (relativeTop / containerRect.height) * imgHeight;
        forcedBreaks.push(mm);
      });
      forcedBreaks.sort((a, b) => a - b);

      // Build page start positions respecting forced breaks
      const pageStarts: number[] = [0];
      let cursor = 0;
      while (cursor < imgHeight) {
        let nextEnd = cursor + pageHeight;
        const breakInPage = forcedBreaks.find((bp) => bp > cursor && bp < nextEnd);
        if (breakInPage) nextEnd = breakInPage;
        cursor = nextEnd;
        if (cursor < imgHeight) pageStarts.push(cursor);
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pageStarts.forEach((startY, i) => {
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -startY, imgWidth, imgHeight);
      });

      const clientName = ((clientInfo.clientName as string) || 'Client').replace(/\s+/g, '_');
      pdf.save(`Peak360_Report_${clientName}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [exporting, clientInfo]);

  useEffect(() => {
    const loadReport = async () => {
      const sections: Record<number, Record<string, unknown>> = {};
      const fetches = [1, 5, 6, 7, 8, 9].map(async (num) => {
        const res = await fetch(`/api/assessments/${assessmentId}/sections/${num}`);
        const { data } = await res.json();
        sections[num] = (data || {}) as Record<string, unknown>;
      });
      await Promise.all(fetches);

      const info = sections[1] || {};
      setClientInfo(info);

      const age = info.clientAge as number || null;
      const gender = info.clientGender as string || null;

      const evaluated: ReportMarker[] = [];
      const counts: Record<RatingTier, number> = { elite: 0, great: 0, normal: 0, cautious: 0, poor: 0 };

      for (const m of REPORT_MARKERS) {
        const sectionData = sections[m.section] || {};
        const rawValue = sectionData[m.dataKey];
        const value = rawValue != null ? Number(rawValue) : null;

        if (value === null || isNaN(value)) {
          evaluated.push({ key: m.testKey, label: m.label, value: null, tier: null, unit: '', category: m.category });
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
          category: m.category,
        });
      }

      setMarkers(evaluated);
      setTierCounts(counts);

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
  const categories = [...new Set(REPORT_MARKERS.map((m) => m.category))];
  const reportDate = clientInfo.assessmentDate
    ? new Date(clientInfo.assessmentDate as string).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div ref={reportRef} className="report-container bg-white">
      {/* ─── REPORT COVER / HEADER ─── */}
      <div className="report-header relative overflow-hidden rounded-2xl print:rounded-none bg-gradient-to-br from-[#0f2440] via-[#1a365d] to-[#2d5986] text-white p-8 sm:p-10">
        {/* Decorative geometry */}
        <div className="absolute top-0 right-0 w-72 h-72 opacity-[0.07]" style={{
          background: 'radial-gradient(circle at 70% 30%, #F5A623 0%, transparent 60%)',
        }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 opacity-[0.05]" style={{
          background: 'radial-gradient(circle at 30% 70%, #F5A623 0%, transparent 60%)',
        }} />
        <div className="absolute top-6 right-8 w-20 h-[2px] bg-gradient-to-r from-[#F5A623] to-transparent" />
        <div className="absolute bottom-6 left-8 w-16 h-[2px] bg-gradient-to-r from-[#F5A623] to-transparent" />

        <div className="relative z-10">
          {/* Logo row */}
          <div className="flex items-center gap-4 mb-8">
            <img src="/logo.png" alt="Peak360" className="h-10 sm:h-12 w-auto object-contain drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]" />
            <div className="h-8 w-[1px] bg-white/20" />
            <span className="text-xs tracking-[0.25em] uppercase text-white/60 font-medium">Longevity Assessment Report</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight mb-1">
            Complete Longevity Analysis
          </h1>
          <div className="h-1 w-16 bg-[#F5A623] rounded-full mt-3 mb-6" />

          {/* Client info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-0.5">Client</p>
              <p className="text-sm font-semibold">{(clientInfo.clientName as string) || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-0.5">Date</p>
              <p className="text-sm font-semibold">{reportDate}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-0.5">Age</p>
              <p className="text-sm font-semibold">{(clientInfo.clientAge as number) || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-0.5">Gender</p>
              <p className="text-sm font-semibold capitalize">{(clientInfo.clientGender as string) || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── REPORT BODY (padded for PDF margins) ─── */}
      <div className="px-6">

      {/* ─── TIER SUMMARY ─── */}
      <div className="report-section mt-8 print:mt-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-6 bg-[#F5A623] rounded-full" />
          <h2 className="text-lg font-bold text-[#1a365d] tracking-tight">Results Overview</h2>
          {totalRated > 0 && (
            <span className="text-xs text-[#64748b] ml-auto">{totalRated} markers evaluated</span>
          )}
        </div>

        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {(['elite', 'great', 'normal', 'cautious', 'poor'] as RatingTier[]).map((tier) => {
            const pct = totalRated > 0 ? Math.round((tierCounts[tier] / totalRated) * 100) : 0;
            return (
              <div key={tier} className="report-tier-card relative overflow-hidden rounded-xl border border-gray-100 bg-white p-3 sm:p-4 text-center">
                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: TIER_DOT[tier] }} />
                {/* Tier label */}
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mt-1 mb-1" style={{ color: TIER_DOT[tier] }}>
                  {TIER_LABELS[tier]}
                </p>
                {/* Count */}
                <p className="text-3xl sm:text-4xl font-black text-[#1a365d] leading-none">
                  {tierCounts[tier]}
                </p>
                {/* Percentage bar */}
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: TIER_DOT[tier] }}
                  />
                </div>
                <p className="text-[10px] text-[#64748b] mt-1 font-medium">{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── DETAILED RESULTS BY CATEGORY ─── */}
      <div className="report-section mt-8 print:mt-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-6 bg-[#F5A623] rounded-full" />
          <h2 className="text-lg font-bold text-[#1a365d] tracking-tight">Detailed Results</h2>
        </div>

        <div className="space-y-5">
          {categories.map((cat) => {
            const catMarkers = markers.filter((m) => m.category === cat);
            return (
              <div key={cat} className="report-category" {...(cat === 'Strength Testing' ? { 'data-pdf-break': true } : {})}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#1a365d]/70">{cat}</span>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-[#e2e8f0] to-transparent" />
                </div>

                {/* Marker rows */}
                <div className="rounded-lg overflow-hidden border border-gray-100">
                  {catMarkers.map((m, i) => (
                    <div
                      key={m.key}
                      className={`report-marker-row flex items-center justify-between py-2.5 px-4 border-l-[3px] ${
                        m.tier ? `${TIER_ROW_BG[m.tier]} ${TIER_ROW_BORDER[m.tier]}` : 'bg-gray-50/40 border-l-gray-200'
                      } ${i > 0 ? 'border-t border-gray-100' : ''}`}
                    >
                      <span className="text-[13px] font-medium text-[#1a202c]">{m.label}</span>
                      <div className="flex items-center gap-3">
                        {m.value !== null ? (
                          <>
                            <span className="text-[13px] font-semibold text-[#1a202c] tabular-nums tracking-tight">
                              {m.value}
                              <span className="text-[11px] font-normal text-[#64748b] ml-1">{m.unit}</span>
                            </span>
                            {m.tier && <TierPill tier={m.tier} />}
                          </>
                        ) : (
                          <span className="text-[11px] text-[#94a3b8] italic">Not recorded</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── TIER LEGEND ─── */}
      <div className="report-section mt-6 print:mt-4">
        <div className="flex items-center justify-center gap-5 py-3 px-4 bg-[#f8fafc] rounded-lg border border-gray-100">
          {(['elite', 'great', 'normal', 'cautious', 'poor'] as RatingTier[]).map((tier) => (
            <div key={tier} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TIER_DOT[tier] }} />
              <span className={`text-[10px] font-bold uppercase tracking-wide ${TIER_TEXT[tier]}`}>
                {TIER_LABELS[tier]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── INSIGHTS & RECOMMENDATIONS ─── */}
      {insights.length > 0 && (
        <div className="report-section report-insights mt-8 print:mt-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-6 bg-[#F5A623] rounded-full" />
            <h2 className="text-lg font-bold text-[#1a365d] tracking-tight">Insights & Recommendations</h2>
          </div>

          <div className="space-y-4">
            {insights.map((insight, i) => (
              <div key={i} className="report-insight-card relative bg-white rounded-xl border border-gray-100 overflow-hidden">
                {/* Gold left accent */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#F5A623] to-[#d4891a]" />
                <div className="pl-5 pr-5 py-4">
                  <h4 className="text-sm font-bold text-[#1a365d] mb-1.5">{insight.title}</h4>
                  <p className="text-[12px] leading-relaxed text-[#64748b] mb-3">{insight.why}</p>
                  {insight.doNow.length > 0 && (
                    <div className="space-y-1.5">
                      {insight.doNow.map((item, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-[#F5A623] mt-[7px] shrink-0" />
                          <p className="text-[12px] leading-relaxed text-[#1a202c]">{item}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── REPORT FOOTER ─── */}
      <div className="report-footer mt-10 pt-5 border-t border-gray-200 print:mt-6">
        <div className="flex items-center justify-between text-[10px] text-[#94a3b8]">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Peak360" className="h-5 w-auto object-contain opacity-40" />
            <span>Generated by Peak360 Longevity Program</span>
          </div>
          <span>{reportDate}</span>
        </div>
        <p className="text-[9px] text-[#cbd5e1] mt-2 leading-relaxed">
          This report is for informational purposes only and does not constitute medical advice.
          Always consult with a qualified healthcare professional before making changes to your health regimen.
        </p>
      </div>

      </div>{/* end px-6 report body wrapper */}

      {/* ─── ACTION BUTTONS (hidden in PDF) ─── */}
      <div ref={actionsRef} className="flex flex-col sm:flex-row gap-3 justify-center pt-8 pb-4">
        <button
          onClick={exportPdf}
          disabled={exporting}
          className="group px-8 py-3 bg-[#1a365d] text-white rounded-xl font-semibold hover:bg-[#2d5986] transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
        >
          <span className="flex items-center justify-center gap-2">
            {exporting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </>
            )}
          </span>
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
          className="px-8 py-3 bg-[#F5A623] text-[#1a365d] rounded-xl font-semibold hover:bg-[#f7bc5a] transition-all hover:shadow-lg active:scale-[0.98]"
        >
          Save & Complete Assessment
        </button>
      </div>
    </div>
  );
}
