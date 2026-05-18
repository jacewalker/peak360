'use client';

import type { ReportMarker } from '@/lib/pdf/types';
import type { RatingTier } from '@/types/normative';
import { TIER_LABELS } from '@/types/normative';

/**
 * Phase 8 — DetailedMarkerResultsDisclosure.
 *
 * Wraps the previously-Section-11 dense marker grid in a collapsed
 * native <details> element. For coaches and curious clients only.
 *
 * The lifted dense grid preserves the original visual (category headers,
 * Blood Tests subcategory subgrouping, tier-coloured row chrome, TierPill).
 * Helpers below (TIER_DOT, TIER_ROW_BG, TIER_ROW_BORDER, TIER_TEXT, TierPill)
 * are lifted verbatim from src/components/sections/Section11.tsx so this
 * component is self-contained — Section11 itself becomes dead code after
 * Plan 03 ships and can be removed in a follow-up quick task.
 */

interface DetailedMarkerResultsDisclosureProps {
  markers: ReportMarker[];
}

const TIER_DOT: Record<RatingTier, string> = {
  elite: '#10b981',
  great: '#3b82f6',
  normal: '#6b7280',
  cautious: '#f59e0b',
  poor: '#ef4444',
};

// Dark-portal tier palette (hue-preserving; mirrors Section 11).
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

function renderMarkerRow(m: ReportMarker, i: number) {
  return (
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
}

export default function DetailedMarkerResultsDisclosure({
  markers,
}: DetailedMarkerResultsDisclosureProps) {
  // Distinct categories in encounter order
  const categories = Array.from(new Set(markers.map((m) => m.category)));

  return (
    <details className="group mt-12 border border-line rounded-2xl bg-bg-3 overflow-hidden">
      <summary className="flex items-start justify-between gap-4 px-5 py-4 cursor-pointer list-none select-none hover:bg-bg">
        <div>
          <h3 className="text-[16px] font-semibold text-text">Detailed marker results</h3>
          <p className="mt-1 text-sm text-text-dim">
            For coaches and curious clients — every rated marker with raw values and ranges.
          </p>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          className="mt-1 text-text-dim transition-transform group-open:rotate-90"
        >
          <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>

      <div className="px-5 pb-5">
        <div className="space-y-5">
          {categories.map((cat) => {
            const catMarkers = markers.filter((m) => m.category === cat);
            // Show rated markers always; non-rated only if they have a value
            const visibleMarkers = catMarkers.filter((m) => m.hasNorms || m.value !== null);
            if (visibleMarkers.length === 0) return null;

            const isBloodTests = cat === 'Blood Tests & Biomarkers';
            const subcategories = isBloodTests
              ? Array.from(new Set(visibleMarkers.map((m) => m.subcategory).filter(Boolean)))
              : [];

            return (
              <div key={cat}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#1a365d]/70">{cat}</span>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-[#e2e8f0] to-transparent" />
                </div>

                {isBloodTests ? (
                  // Blood tests: grouped by subcategory
                  <div className="rounded-lg overflow-hidden border border-gray-100">
                    {subcategories.map((sub, si) => {
                      const subMarkers = visibleMarkers.filter((m) => m.subcategory === sub);
                      if (subMarkers.length === 0) return null;
                      return (
                        <div key={sub}>
                          <div className={`text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748b] px-4 py-1.5 bg-[#f1f5f9] ${si > 0 ? 'border-t border-gray-200' : ''}`}>
                            {sub}
                          </div>
                          {subMarkers.map((m, i) => renderMarkerRow(m, i))}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg overflow-hidden border border-gray-100">
                    {visibleMarkers.map((m, i) => renderMarkerRow(m, i))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tier legend */}
        <div className="mt-5">
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
      </div>
    </details>
  );
}
