'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type {
  PillarDefinition,
  PillarPrescription,
  PillarStatus,
} from '@/lib/pillars/types';
import { TRAFFIC_LIGHT_HEX, TRAFFIC_LIGHT_TEXT, STATUS_LABEL } from '@/lib/pillars/colors';
import type { ReportMarker } from '@/lib/pdf/types';
import type { RatingTier } from '@/types/normative';
import { TIER_LABELS } from '@/types/normative';

/**
 * Phase 8 — PillarModal — seven-section drill-down rendered as a
 * right-slide side drawer (matches PillarsDisplayModal — see commit
 * b856f13). The seven content sections are unchanged in shape and
 * order:
 *
 *   1. Header (no label)         5. What needs attention
 *   2. What this pillar means    6. Score breakdown
 *   3. Your results              7. Recommended plan
 *   4. What you are doing well
 *
 * D-11 anti-pattern: 5-tier marker palette is used inside the drawer
 * (TierPill / TIER_DOT) for marker rows; the traffic-light palette is
 * used ONLY for the header status pill.
 */

interface PillarModalProps {
  open: boolean;
  onClose: () => void;
  definition: PillarDefinition;
  prescription: PillarPrescription | null;
  score: number | null;
  status: PillarStatus;
  primaryMarkers: ReportMarker[];
  supportingMarkers: ReportMarker[];
}

// 5-tier marker dot palette (lifted from Section11.tsx)
const TIER_DOT: Record<RatingTier, string> = {
  elite: '#10b981',
  great: '#3b82f6',
  normal: '#6b7280',
  cautious: '#f59e0b',
  poor: '#ef4444',
};

// D-08 — tier-rollup score values (mirrors src/lib/pillars/mapping.ts TIER_VALUE).
const TIER_VALUE: Record<RatingTier, number> = {
  elite: 100,
  great: 80,
  normal: 60,
  cautious: 40,
  poor: 20,
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

function relativeTime(epochMs: number): string {
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - epochMs) / 1000));
  if (diffSec < 60) return diffSec === 1 ? '1 second ago' : `${diffSec} seconds ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr === 1 ? '1 hour ago' : `${diffHr} hours ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
  const diffMon = Math.floor(diffDay / 30);
  if (diffMon < 12) return diffMon === 1 ? '1 month ago' : `${diffMon} months ago`;
  const diffYr = Math.floor(diffMon / 12);
  return diffYr === 1 ? '1 year ago' : `${diffYr} years ago`;
}

function formatValue(m: ReportMarker): string {
  if (m.value === null) return '—';
  return m.unit ? `${m.value} ${m.unit}` : `${m.value}`;
}

const TABBABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getTabbables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(
    root.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR),
  ).filter((el) => el.offsetParent !== null);
}

export default function PillarModal({
  open,
  onClose,
  definition,
  prescription,
  score,
  status,
  primaryMarkers,
  supportingMarkers,
}: PillarModalProps) {
  const panelRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const headingId = `pillar-modal-heading-${definition.pillarKey}`;

  // Body scroll lock + initial focus + focus restoration
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    if (panel) {
      const autofocusTarget = panel.querySelector<HTMLElement>('[data-autofocus]');
      if (autofocusTarget) autofocusTarget.focus();
      else {
        const tabbables = getTabbables(panel);
        if (tabbables.length > 0) tabbables[0].focus();
        else panel.focus();
      }
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [open]);

  // Escape closes + Tab focus trap
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const tabbables = getTabbables(panelRef.current);
        if (tabbables.length === 0) {
          e.preventDefault();
          panelRef.current?.focus();
          return;
        }
        const first = tabbables[0];
        const last = tabbables[tabbables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !panelRef.current?.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === 'undefined') return null; // SSR guard

  const isPending = status === 'pending';
  const pillBg = isPending ? 'transparent' : TRAFFIC_LIGHT_HEX[status];
  const pillText = TRAFFIC_LIGHT_TEXT[status];
  const dotColor = isPending ? '#94a3b8' : TRAFFIC_LIGHT_TEXT[status];

  // Rated markers only contribute to score; filter once for sections 3/4/5/6
  const ratedPrimary = primaryMarkers.filter((m) => m.tier !== null);
  const doingWell = ratedPrimary.filter((m) => m.tier === 'great' || m.tier === 'elite');
  const needsAttention = ratedPrimary.filter((m) => m.tier === 'cautious' || m.tier === 'poor');

  const breakdownCount = ratedPrimary.length;
  const breakdownFooter = `Pillar score is the average tier value across ${breakdownCount} rated marker${breakdownCount === 1 ? '' : 's'}. Markers without normative ranges are excluded.`;

  const drawer = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm motion-safe:transition-opacity duration-200"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer panel — right-slide on desktop, full-screen on mobile */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        className="fixed top-0 right-0 z-50 h-full w-full md:w-[520px] bg-white shadow-2xl
                   overflow-y-auto outline-none
                   motion-safe:transition-transform duration-300 ease-out
                   translate-x-0"
      >
        {/* Sticky top close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          data-autofocus
          className="absolute top-3 right-3 w-11 h-11 inline-flex items-center justify-center rounded-full text-navy/70 hover:text-navy hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(245,166,35,0.25)] z-10"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="px-6 py-6 space-y-6">
          {/* ── Section 1: Header (no heading label) ── */}
          <header className="pr-12">
            <h2
              id={headingId}
              className="font-semibold leading-[1.15] text-navy"
              style={{ fontSize: 'clamp(24px, 4vw, 28px)' }}
            >
              {definition.label}
            </h2>
            <div className="mt-2 flex items-center gap-3">
              <div
                className="text-navy font-semibold leading-none"
                style={{ fontSize: '48px', fontVariantNumeric: 'tabular-nums' }}
              >
                {score === null ? '—' : score}
                <span className="text-base font-normal text-muted ml-1 align-baseline">/100</span>
              </div>
              <span
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold"
                style={{
                  backgroundColor: pillBg,
                  color: pillText,
                  border: isPending ? '1px solid #e2e8f0' : undefined,
                }}
              >
                <span
                  aria-hidden="true"
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: dotColor }}
                />
                {STATUS_LABEL[status]}
              </span>
            </div>
          </header>

          {/* ── Section 2: What this pillar means ── */}
          <section>
            <h3 className="text-[20px] font-semibold leading-[1.25] text-navy">
              What this pillar means
            </h3>
            <p className="mt-2 text-base leading-[1.5] text-muted">
              {definition.plainMeaning}
            </p>
          </section>

          {/* ── Section 3: Your results ── */}
          <section>
            <h3 className="text-[20px] font-semibold leading-[1.25] text-navy">
              Your results
            </h3>
            {ratedPrimary.length === 0 ? (
              <p className="mt-2 text-base leading-[1.5] text-muted">
                We don&apos;t have any rated markers for this pillar in this assessment yet. Check the detailed marker results below the pillars grid for any raw values your coach has entered.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {ratedPrimary.map((m) => (
                  <li key={m.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-navy font-medium">{m.label}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-navy tabular-nums">{formatValue(m)}</span>
                      {m.tier && <TierPill tier={m.tier} />}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Section 4: What you are doing well ── */}
          <section>
            <h3 className="text-[20px] font-semibold leading-[1.25] text-navy">
              What you are doing well
            </h3>
            {doingWell.length === 0 ? (
              <p className="mt-2 text-base leading-[1.5] text-muted">
                No standout strengths in this pillar yet — every score below tells you where momentum can build.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {doingWell.map((m) => (
                  <li key={m.key} className="flex items-center gap-2 text-sm text-navy">
                    <span
                      aria-hidden="true"
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: m.tier ? TIER_DOT[m.tier] : '#94a3b8' }}
                    />
                    {m.label}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Section 5: What needs attention ── */}
          <section>
            <h3 className="text-[20px] font-semibold leading-[1.25] text-navy">
              What needs attention
            </h3>
            {needsAttention.length === 0 ? (
              <p className="mt-2 text-base leading-[1.5] text-muted">
                Nothing in this pillar is flagged for attention right now — keep it up.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {needsAttention.map((m) => (
                  <li key={m.key} className="flex items-center gap-2 text-sm text-navy">
                    <span
                      aria-hidden="true"
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: m.tier ? TIER_DOT[m.tier] : '#94a3b8' }}
                    />
                    {m.label}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Section 6: Score breakdown ── */}
          <section>
            <h3 className="text-[20px] font-semibold leading-[1.25] text-navy">
              Score breakdown
            </h3>
            {ratedPrimary.length > 0 && (
              <table className="w-full text-sm mt-3">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-1 pr-2 font-semibold">Marker</th>
                    <th className="py-1 px-2 font-semibold">Value</th>
                    <th className="py-1 px-2 font-semibold">Tier</th>
                    <th className="py-1 pl-2 font-semibold text-right">Contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {ratedPrimary.map((m) => (
                    <tr key={m.key} className="border-t border-border">
                      <td className="py-2 pr-2 text-navy font-medium">{m.label}</td>
                      <td className="py-2 px-2 text-navy tabular-nums">{formatValue(m)}</td>
                      <td className="py-2 px-2">{m.tier && <TierPill tier={m.tier} />}</td>
                      <td className="py-2 pl-2 text-right text-navy tabular-nums">
                        {m.tier ? `+${TIER_VALUE[m.tier]}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-3 text-sm text-muted">{breakdownFooter}</p>

            {supportingMarkers.length > 0 && (
              <div className="mt-5">
                <h4 className="text-base font-semibold text-navy">Supporting markers</h4>
                <p className="mt-1 text-sm text-muted">
                  Surfaced for transparency — these markers are NOT included in the pillar score.
                </p>
                <ul className="mt-3 space-y-2">
                  {supportingMarkers.map((m) => (
                    <li key={m.key} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-navy font-medium">{m.label}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-navy tabular-nums">{formatValue(m)}</span>
                        {m.tier && <TierPill tier={m.tier} />}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* ── Section 7: Recommended plan ── */}
          <section>
            <h3 className="text-[20px] font-semibold leading-[1.25] text-navy">
              Recommended plan
            </h3>
            {!prescription ? (
              <p className="mt-2 text-base leading-[1.5] text-muted">
                Your coach hasn&apos;t written a recommendation for this pillar yet. Check back soon.
              </p>
            ) : (
              <div className="mt-2">
                <p className="text-base leading-[1.5] text-navy">{prescription.summary}</p>
                {prescription.bullets && prescription.bullets.length > 0 && (
                  <ul className="mt-3 space-y-1.5 list-disc list-inside text-sm text-navy">
                    {prescription.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
                {prescription.fullPlanHref && (
                  <div className="mt-4">
                    <a
                      href={prescription.fullPlanHref}
                      className="inline-block px-4 py-2 bg-navy text-white text-sm font-semibold rounded-lg hover:bg-navy/90"
                    >
                      Open full plan
                    </a>
                  </div>
                )}
                {prescription.updatedBy?.name && prescription.updatedAt && (
                  <p className="mt-4 pl-3 border-l-4 border-gold text-xs text-muted">
                    Updated by {prescription.updatedBy.name} · {relativeTime(prescription.updatedAt)}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </aside>
    </>
  );

  return createPortal(drawer, document.body);
}
