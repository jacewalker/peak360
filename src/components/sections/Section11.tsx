'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { getPeak360Rating } from '@/lib/normative/ratings';
import { generatePeak360Insights } from '@/lib/normative/insights';
import type { RatingTier } from '@/types/normative';
import { TIER_LABELS } from '@/types/normative';
import type { MarkerContent } from '@/lib/marker-content/queries';

interface ReportMarker {
  key: string;
  label: string;
  value: number | null;
  tier: RatingTier | null;
  unit: string;
  category: string;
  subcategory?: string;
  hasNorms: boolean;
}

interface Insight {
  markerKey: string;
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

// Tier palette — dark-portal equivalents (same hues, dark-tinted bg + bright fg).
// Adapts the Phase 8 sovereign 5-tier palette (D-16) to a dark surface; hues preserved.
const TIER_ROW_BG: Record<RatingTier, string> = {
  elite: 'bg-emerald-500/15',
  great: 'bg-blue-500/15',
  normal: 'bg-gray-500/15',
  cautious: 'bg-amber-500/15',
  poor: 'bg-red-500/15',
};

const TIER_ROW_BORDER: Record<RatingTier, string> = {
  elite: 'border-l-emerald-500',
  great: 'border-l-blue-500',
  normal: 'border-l-gray-400',
  cautious: 'border-l-amber-500',
  poor: 'border-l-red-500',
};

const TIER_TEXT: Record<RatingTier, string> = {
  elite: 'text-emerald-300',
  great: 'text-blue-300',
  normal: 'text-gray-300',
  cautious: 'text-amber-300',
  poor: 'text-red-300',
};

import type { MarkerDef } from '@/lib/report-markers';
import { computeAllPillarScoresLegacy, type PillarScore } from '@/lib/pillars/mapping';
import PillarsDisplay from '@/components/report/PillarsDisplay';

// ── Helpers ───────────────────────────────────────────────────────────────────

const CAFFEINE_LABELS: Record<string, string> = {
  none: 'None', '1-cup': '1 Cup', '2-cups': '2 Cups', '3-plus': '3+ Cups', 'energy-drink': 'Energy Drink',
};
const ALCOHOL_LABELS: Record<string, string> = {
  none: 'None', '1-2-drinks': '1-2 Drinks', '3-4-drinks': '3-4 Drinks', '5-plus': '5+ Drinks',
};

function TierPill({ tier }: { tier: RatingTier }) {
  const bg: Record<RatingTier, string> = {
    elite: 'bg-emerald-600',
    great: 'bg-blue-600',
    normal: 'bg-gray-500',
    cautious: 'bg-amber-500',
    poor: 'bg-red-600',
  };
  return (
    <span className={`report-tier-pill inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase text-paper ${bg[tier]}`}>
      {TIER_LABELS[tier]}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-6 bg-gold-brand rounded-full" />
      <h2 className="text-lg font-bold text-text tracking-tight">{children}</h2>
    </div>
  );
}

function ContextCell({ label, value, warn }: { label: string; value: string | number | null | undefined; warn?: boolean }) {
  const display = value != null && value !== '' ? String(value) : '—';
  return (
    <div className="py-2">
      <p className="text-[10px] uppercase tracking-[0.12em] text-text-dim mb-0.5">{label}</p>
      <p className={`text-[13px] font-semibold ${warn ? 'text-red-300' : 'text-text'}`}>{display}</p>
    </div>
  );
}

function YesNoDot({ value }: { value: unknown }) {
  const isYes = String(value).toLowerCase() === 'yes';
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isYes ? 'bg-red-500' : 'bg-emerald-500'}`} />
      <span className={`text-[12px] font-medium ${isYes ? 'text-red-300' : 'text-text-dim'}`}>
        {isYes ? 'Yes' : 'No'}
      </span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Section11({ assessmentId }: Section11Props) {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [detailedResultsOpen, setDetailedResultsOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [clientInfo, setClientInfo] = useState<Record<string, unknown>>({});
  const [readiness, setReadiness] = useState<Record<string, unknown>>({});
  const [medical, setMedical] = useState<Record<string, unknown>>({});
  const [consent, setConsent] = useState<Record<string, unknown>>({});
  const [markers, setMarkers] = useState<ReportMarker[]>([]);
  const [allMarkers, setAllMarkers] = useState<MarkerDef[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [tierCounts, setTierCounts] = useState<Record<RatingTier, number>>({
    elite: 0, great: 0, normal: 0, cautious: 0, poor: 0,
  });
  const [pillars, setPillars] = useState<PillarScore[]>([]);
  const [markerContentMap, setMarkerContentMap] = useState<
    Map<string, MarkerContent>
  >(new Map());
  const [gender, setGender] = useState<string | null>(null);
  // ── PDF Export ──────────────────────────────────────────────────────────────

  const exportPdf = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/pdf`);
      if (!response.ok) throw new Error('PDF generation failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Peak360_Report_${((clientInfo.clientName as string) || 'Client').replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [exporting, clientInfo, assessmentId]);

  // ── Data Loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    const loadReport = async () => {
      const sections: Record<number, Record<string, unknown>> = {};
      const fetches = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(async (num) => {
        const res = await fetch(`/api/assessments/${assessmentId}/sections/${num}`);
        const { data } = await res.json();
        sections[num] = (data || {}) as Record<string, unknown>;
      });

      // Fetch admin-authored marker content in parallel with the section
      // fetches (D-12). Build a Map keyed by testKey for O(1) lookup in the
      // pillar modal. A failed fetch leaves the map empty - the modal then
      // falls back to generatePeak360Insights output (D-06).
      const markerContentFetch = (async () => {
        try {
          const res = await fetch('/api/marker-content');
          const json = await res.json();
          const map = new Map<string, MarkerContent>();
          if (json.success) {
            for (const row of json.data as MarkerContent[]) {
              map.set(row.testKey, row);
            }
          }
          setMarkerContentMap(map);
        } catch {
          setMarkerContentMap(new Map());
        }
      })();

      // Phase 12 D-10 - fetch the merged registry (seed + admin DB markers)
      // in parallel with the section/content fetches. Falls back to an empty
      // array on failure so the report degrades gracefully (no DB markers
      // surface) instead of crashing.
      let mergedMarkers: MarkerDef[] = [];
      const markersFetch = (async () => {
        try {
          const res = await fetch('/api/markers');
          const json = await res.json();
          if (json.success && json.data && Array.isArray(json.data.markers)) {
            mergedMarkers = json.data.markers as MarkerDef[];
          }
        } catch {
          mergedMarkers = [];
        }
      })();

      await Promise.all([...fetches, markerContentFetch, markersFetch]);
      setAllMarkers(mergedMarkers);

      const info = sections[1] || {};
      setClientInfo(info);
      setReadiness(sections[2] || {});
      setMedical(sections[3] || {});
      setConsent(sections[4] || {});

      const age = info.clientAge as number || null;
      const gender = info.clientGender as string || null;
      setGender(gender);

      const evaluated: ReportMarker[] = [];
      const counts: Record<RatingTier, number> = { elite: 0, great: 0, normal: 0, cautious: 0, poor: 0 };

      for (const m of mergedMarkers) {
        const sectionData = sections[m.section] || {};
        const rawValue = sectionData[m.dataKey];
        const value = rawValue != null ? Number(rawValue) : null;

        if (value === null || isNaN(value)) {
          evaluated.push({ key: m.testKey, label: m.label, value: null, tier: null, unit: m.fallbackUnit || '', category: m.category, subcategory: m.subcategory, hasNorms: m.hasNorms });
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
          unit: rating?.unit || m.fallbackUnit || '',
          category: m.category,
          subcategory: m.subcategory,
          hasNorms: m.hasNorms,
        });
      }

      setMarkers(evaluated);
      setTierCounts(counts);

      const pillarMarkers = mergedMarkers.map((m) => {
        const ev = evaluated.find((e) => e.key === m.testKey);
        return {
          testKey: m.testKey,
          label: m.label,
          category: m.category,
          subcategory: m.subcategory,
          tier: ev?.tier ?? null,
        };
      });
      setPillars(computeAllPillarScoresLegacy(pillarMarkers));

      const insightMarkers = evaluated
        .filter((m) => m.value !== null)
        .map((m) => ({ testKey: m.key, label: m.label, value: m.value }));
      const generatedInsights = generatePeak360Insights({ age, gender, markers: insightMarkers });
      setInsights(generatedInsights);
      setLoading(false);
    };

    loadReport();
  }, [assessmentId]);

  // ── Loading State ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-3 border-gold-brand border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-brand">Generating report…</p>
            <p className="text-[13px] text-text-dim mt-1">Analyzing assessment data…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Derived Values ──────────────────────────────────────────────────────────

  const totalRated = Object.values(tierCounts).reduce((a, b) => a + b, 0);
  // Phase 12 W12 - derive from the merged registry once it has hydrated; wrap
  // in useMemo so the derivation re-runs when allMarkers arrives. The outer
  // `loading` short-circuit (return spinner until setLoading(false)) already
  // prevents an empty-pillar flash, but useMemo also avoids re-computing on
  // every unrelated state change.
  const categories = useMemo(
    () => [...new Set(allMarkers.map((m) => m.category))],
    [allMarkers],
  );
  const reportDate = clientInfo.assessmentDate
    ? new Date(clientInfo.assessmentDate as string).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  const hasMedicalFlags = ['chestPain', 'dizziness', 'heartCondition', 'uncontrolledBP', 'recentSurgery']
    .some((k) => String(medical[k]).toLowerCase() === 'yes');

  const consentSigned = consent.consentAgree === true || consent.consentAgree === 'true';
  const clientSigCaptured = !!consent.clientSignature;
  const coachSigCaptured = !!consent.coachSignature;

  // ── Render Marker Row ───────────────────────────────────────────────────────

  const renderMarkerRow = (m: ReportMarker, i: number) => (
    <div
      key={m.key}
      className={`flex items-center justify-between py-2 px-4 border-l-[3px] ${
        m.tier ? `${TIER_ROW_BG[m.tier]} ${TIER_ROW_BORDER[m.tier]}` : 'bg-bg-3 border-l-line'
      } ${i > 0 ? 'border-t border-line' : ''}`}
    >
      <span className="text-[13px] font-medium text-text">{m.label}</span>
      <div className="flex items-center gap-3">
        {m.value !== null ? (
          <>
            <span className="text-[13px] font-semibold text-text tabular-nums tracking-tight">
              {m.value}
              <span className="text-[11px] font-normal text-text-dim ml-1">{m.unit}</span>
            </span>
            {m.tier && <TierPill tier={m.tier} />}
          </>
        ) : (
          <span className="text-[11px] text-text-dim italic">Not recorded</span>
        )}
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="bg-bg-2 rounded-2xl border border-line">
      {/* ─── REPORT HEADER (dark portal chrome: logo LEFT, title RIGHT) ─── */}
      <div className="report-header px-6 sm:px-8 pt-8 pb-6 border-b border-line">
        <div className="flex items-center justify-between">
          <img src="/landing/peak360-logo.png" alt="Peak360" className="h-10 sm:h-12 w-auto object-contain" />
          <h1 className="text-[20px] sm:text-[24px] font-medium text-text leading-[1.1] tracking-[-0.015em] text-right">
            Complete Longevity Analysis
          </h1>
        </div>
        <div className="h-1 w-16 bg-gold-brand rounded-full mt-4 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-text-dim mb-0.5">Client</p>
            <p className="text-sm font-semibold text-text">{(clientInfo.clientName as string) || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-text-dim mb-0.5">Date</p>
            <p className="text-sm font-semibold text-text">{reportDate}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-text-dim mb-0.5">Age</p>
            <p className="text-sm font-semibold text-text">{(clientInfo.clientAge as number) || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-text-dim mb-0.5">Gender</p>
            <p className="text-sm font-semibold text-text capitalize">{(clientInfo.clientGender as string) || '—'}</p>
          </div>
        </div>
      </div>

      {/* ─── REPORT BODY ─── */}
      <div className="px-6 sm:px-8 pb-8">

      {/* ─── PEAK LIVING PILLARS ─── */}
      <PillarsDisplay
        pillars={pillars}
        markers={markers}
        insights={insights}
        markerContentMap={markerContentMap}
        gender={gender}
      />

      {/* ─── SECTION 2: DAILY READINESS ─── */}
      <div className="mt-8 print:mt-6">
        <SectionHeading>Assessment Day Readiness</SectionHeading>
        <div className="rounded-xl border border-line bg-bg-3 overflow-hidden">
          <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-line">
            <div className="px-4"><ContextCell label="Sleep" value={readiness.sleepHours != null ? `${readiness.sleepHours} hrs` : null} /></div>
            <div className="px-4"><ContextCell label="Stress" value={readiness.stressLevel != null ? `${readiness.stressLevel}/10` : null} /></div>
            <div className="px-4"><ContextCell label="Energy" value={readiness.energyLevel != null ? `${readiness.energyLevel}/10` : null} /></div>
            <div className="px-4"><ContextCell label="Soreness" value={readiness.sorenessLevel != null ? `${readiness.sorenessLevel}/10` : null} /></div>
            <div className="px-4"><ContextCell label="Caffeine" value={CAFFEINE_LABELS[readiness.caffeineToday as string] || null} /></div>
            <div className="px-4"><ContextCell label="Alcohol (48h)" value={ALCOHOL_LABELS[readiness.alcoholLast48 as string] || null} /></div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 3: MEDICAL SCREENING ─── */}
      <div className="mt-6 print:mt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-gold-brand rounded-full" />
          <h2 className="text-lg font-bold text-text tracking-tight">Medical Screening</h2>
          {hasMedicalFlags && (
            <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wide text-amber-300">
              Flag(s) Detected
            </span>
          )}
        </div>
        <div className="rounded-xl border border-line overflow-hidden">
          {/* Safety screening */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-2 px-4 py-3 bg-bg-3">
            {([
              { key: 'chestPain', label: 'Chest Pain' },
              { key: 'dizziness', label: 'Dizziness' },
              { key: 'heartCondition', label: 'Heart Condition' },
              { key: 'uncontrolledBP', label: 'Uncontrolled BP' },
              { key: 'recentSurgery', label: 'Recent Surgery' },
            ] as const).map((item) => {
              const val = medical[item.key];
              return (
                <div key={item.key} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-text-dim">{item.label}</span>
                  {val != null ? (
                    <YesNoDot value={val} />
                  ) : (
                    <span className="text-[11px] text-text-dim italic">—</span>
                  )}
                </div>
              );
            })}
          </div>
          {/* Surgery details */}
          {String(medical.recentSurgery ?? '').toLowerCase() === 'yes' && !!medical.surgeryDetailsText && (
            <div className="px-4 py-2 border-t border-line bg-red-500/10 border-l-2 border-l-red-500/50">
              <p className="text-[10px] uppercase tracking-wide text-text-dim mb-0.5">Surgery / Injury Details</p>
              <p className="text-[12px] text-text">{String(medical.surgeryDetailsText)}</p>
            </div>
          )}
          {/* Additional medical info */}
          {!!(medical.currentMedications || medical.diagnosedConditions || medical.otherConcerns) && (
            <div className="px-4 py-3 border-t border-line space-y-2">
              {medical.currentMedications ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-dim mb-0.5">Medications</p>
                  <p className="text-[12px] text-text">{String(medical.currentMedications)}</p>
                </div>
              ) : null}
              {medical.diagnosedConditions ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-dim mb-0.5">Diagnosed Conditions</p>
                  <p className="text-[12px] text-text">{String(medical.diagnosedConditions)}</p>
                </div>
              ) : null}
              {medical.otherConcerns ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-text-dim mb-0.5">Other Concerns</p>
                  <p className="text-[12px] text-text">{String(medical.otherConcerns)}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ─── SECTION 4: CONSENT STATUS ─── */}
      <div className="mt-6 print:mt-4">
        <div className="flex items-center gap-4 px-4 py-3 bg-bg-3 rounded-lg border border-line text-[12px]">
          <div className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${consentSigned ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            <span className="font-medium text-text">{consentSigned ? 'Consent Provided' : 'Consent Not Recorded'}</span>
          </div>
          <div className="h-4 w-px bg-line" />
          <span className="text-text-dim">
            Client: {consent.clientSignatureName ? `${consent.clientSignatureName}` : '—'}
            {consent.clientSignatureDate ? ` (${consent.clientSignatureDate})` : ''}
            {clientSigCaptured ? ' — Signed' : ''}
          </span>
          <div className="h-4 w-px bg-line" />
          <span className="text-text-dim">
            Coach: {consent.coachSignatureName ? `${consent.coachSignatureName}` : '—'}
            {consent.coachSignatureDate ? ` (${consent.coachSignatureDate})` : ''}
            {coachSigCaptured ? ' — Signed' : ''}
          </span>
        </div>
      </div>

      {/* ─── TIER SUMMARY ─── */}
      <div className="mt-8 print:mt-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-6 bg-gold-brand rounded-full" />
          <h2 className="text-lg font-bold text-text tracking-tight">Results Overview</h2>
          {totalRated > 0 && (
            <span className="text-xs text-text-dim ml-auto">{totalRated} markers evaluated</span>
          )}
        </div>

        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {(['elite', 'great', 'normal', 'cautious', 'poor'] as RatingTier[]).map((tier) => {
            const pct = totalRated > 0 ? Math.round((tierCounts[tier] / totalRated) * 100) : 0;
            return (
              <div key={tier} className="report-tier-card relative overflow-hidden rounded-xl border border-line bg-bg-3 p-3 sm:p-4 text-center">
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: TIER_DOT[tier] }} />
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mt-1 mb-1" style={{ color: TIER_DOT[tier] }}>
                  {TIER_LABELS[tier]}
                </p>
                <p className="text-3xl sm:text-4xl font-black text-text leading-none">
                  {tierCounts[tier]}
                </p>
                <div className="mt-2 h-1.5 bg-line rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: TIER_DOT[tier] }}
                  />
                </div>
                <p className="text-[10px] text-text-dim mt-1 font-medium">{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── TIER LEGEND ─── */}
      <div className="mt-6 print:mt-4">
        <div className="flex items-center justify-center gap-5 py-3 px-4 bg-bg-3 rounded-lg border border-line">
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

      {/* ─── DETAILED RESULTS BY CATEGORY ─── */}
      <div className="mt-8 print:mt-6">
        <button
          type="button"
          onClick={() => setDetailedResultsOpen((v) => !v)}
          aria-expanded={detailedResultsOpen}
          aria-controls="detailed-results-panel"
          className="group flex items-center gap-3 mb-5 w-full text-left rounded-lg px-3 py-2 -mx-3 hover:bg-bg-3 motion-safe:transition-colors print:cursor-default print:hover:bg-transparent print:px-0 print:mx-0 print:py-0"
        >
          <div className="w-1 h-6 bg-gold-brand rounded-full" />
          <h2 className="text-lg font-bold text-text tracking-tight">All Detailed Results</h2>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text group-hover:border-gold-brand group-hover:text-gold-brand motion-safe:transition-colors print:hidden">
            {detailedResultsOpen ? 'Hide' : 'Show'}
            <svg
              className={`w-3.5 h-3.5 motion-safe:transition-transform duration-200 ${detailedResultsOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 4.5L6 7.5L9 4.5" />
            </svg>
          </span>
        </button>

        <div
          id="detailed-results-panel"
          hidden={!detailedResultsOpen}
          className="space-y-5 print:!block"
        >
          {categories.map((cat) => {
            const catMarkers = markers.filter((m) => m.category === cat);
            // Filter: show rated markers always, show non-rated only if they have a value
            const visibleMarkers = catMarkers.filter((m) => m.hasNorms || m.value !== null);
            if (visibleMarkers.length === 0) return null;

            const isBloodTests = cat === 'Blood Tests & Biomarkers';
            const subcategories = isBloodTests
              ? [...new Set(visibleMarkers.map((m) => m.subcategory).filter(Boolean))]
              : [];

            return (
              <div key={cat}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text/70">{cat}</span>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-line to-transparent" />
                </div>

                {isBloodTests ? (
                  // Blood tests: grouped by subcategory
                  <div className="rounded-lg overflow-hidden border border-line">
                    {subcategories.map((sub, si) => {
                      const subMarkers = visibleMarkers.filter((m) => m.subcategory === sub);
                      if (subMarkers.length === 0) return null;
                      return (
                        <div key={sub}>
                          <div className={`text-[10px] font-bold uppercase tracking-[0.1em] text-text-dim px-4 py-1.5 bg-bg-3 ${si > 0 ? 'border-t border-line' : ''}`}>
                            {sub}
                          </div>
                          {subMarkers.map((m, i) => renderMarkerRow(m, i))}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // All other categories: flat list
                  <div className="rounded-lg overflow-hidden border border-line">
                    {visibleMarkers.map((m, i) => renderMarkerRow(m, i))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── INSIGHTS & RECOMMENDATIONS ─── */}
      {insights.length > 0 && (
        <div className="mt-8 print:mt-6">
          <button
            type="button"
            onClick={() => setInsightsOpen((v) => !v)}
            aria-expanded={insightsOpen}
            aria-controls="insights-panel"
            className="group flex items-center gap-3 mb-4 w-full text-left rounded-lg px-3 py-2 -mx-3 hover:bg-bg-3 motion-safe:transition-colors print:cursor-default print:hover:bg-transparent print:px-0 print:mx-0 print:py-0"
          >
            <div className="w-1 h-6 bg-gold-brand rounded-full" />
            <h2 className="text-lg font-bold text-text tracking-tight">All Insights &amp; Recommendations</h2>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-text group-hover:border-gold-brand group-hover:text-gold-brand motion-safe:transition-colors print:hidden">
              {insightsOpen ? 'Hide' : 'Show'}
              <svg
                className={`w-3.5 h-3.5 motion-safe:transition-transform duration-200 ${insightsOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 4.5L6 7.5L9 4.5" />
              </svg>
            </span>
          </button>

          <div
            id="insights-panel"
            hidden={!insightsOpen}
            className="space-y-4 print:!block"
          >
            {insights.map((insight, i) => (
              <div key={i} className="report-insight-card relative bg-bg-3 rounded-xl border border-line overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gold-brand to-champagne" />
                <div className="pl-5 pr-5 py-4">
                  <h4 className="text-sm font-bold text-text mb-1.5">{insight.title}</h4>
                  <p className="text-[12px] leading-relaxed text-text-dim mb-3">{insight.why}</p>
                  {insight.doNow.length > 0 && (
                    <div className="space-y-1.5">
                      {insight.doNow.map((item, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-gold-brand mt-[7px] shrink-0" />
                          <p className="text-[12px] leading-relaxed text-text">{item}</p>
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
      <div className="report-footer mt-10 pt-5 border-t border-line print:mt-6">
        <div className="flex items-center justify-between text-[10px] text-text-dim">
          <div className="flex items-center gap-2">
            <img src="/landing/peak360-logo.png" alt="Peak360" className="h-5 w-auto object-contain opacity-40" />
            <span>Generated by Peak360 Longevity Program</span>
          </div>
          <span>{reportDate}</span>
        </div>
        <p className="text-[9px] text-text-dim/60 mt-2 leading-relaxed">
          This report is for informational purposes only and does not constitute medical advice.
          Always consult with a qualified healthcare professional before making changes to your health regimen.
        </p>
      </div>

      </div>{/* end px-6 report body wrapper */}

      {/* ─── ACTION BUTTONS (hidden in PDF) ─── */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-8 pb-4 px-6 sm:px-8">
        <button
          onClick={exportPdf}
          disabled={exporting}
          className="group px-8 py-3 bg-bg-3 border border-line-2 text-text rounded-xl font-semibold hover:bg-bg hover:border-gold-brand/40 transition-all active:scale-[0.98] disabled:opacity-60"
        >
          <span className="flex items-center justify-center gap-2">
            {exporting ? (
              <>
                <span className="w-4 h-4 border-2 border-text/30 border-t-text rounded-full animate-spin" />
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
            window.location.href = '/portal';
          }}
          className="px-8 py-3 bg-gold-brand text-bg rounded-xl font-semibold hover:bg-champagne transition-all active:scale-[0.98]"
        >
          Save & Complete Assessment
        </button>
      </div>
    </div>
  );
}
