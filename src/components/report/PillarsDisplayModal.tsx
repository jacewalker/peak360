'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  PILLARS,
  markerToPillar,
  type PillarScore,
} from '@/lib/pillars/mapping';
import type { PillarStatus } from '@/lib/pillars/types';
import type { Insight, ReportMarker } from '@/lib/pdf/types';
import {
  TIER_LABELS,
  type RatingTier,
} from '@/types/normative';

interface Props {
  open: boolean;
  onClose: () => void;
  pillar: PillarScore;
  markers: ReportMarker[];
  insights?: Insight[];
}

type GroupKey = RatingTier | 'pending';

const GROUP_ORDER: readonly GroupKey[] = [
  'poor',
  'cautious',
  'normal',
  'great',
  'elite',
  'pending',
] as const;

/** Per-status hero theming inside the drawer. Mirrors the PillarsDisplay duotone. */
const STATUS_THEME: Record<
  PillarStatus,
  {
    chipBg: string;
    chipText: string;
    chipDot: string;
    heroBg: string;
    heroAccent: string;
    scoreColor: string;
  }
> = {
  green: {
    chipBg: 'bg-emerald-500',
    chipText: 'text-white',
    chipDot: 'bg-white/90',
    heroBg:
      'bg-gradient-to-br from-emerald-500/15 via-emerald-500/8 to-transparent',
    heroAccent: 'from-emerald-400/40 via-emerald-300/15 to-transparent',
    scoreColor: 'text-emerald-300',
  },
  amber: {
    chipBg: 'bg-amber-500',
    chipText: 'text-white',
    chipDot: 'bg-white/90',
    heroBg: 'bg-gradient-to-br from-amber-500/15 via-amber-500/8 to-transparent',
    heroAccent: 'from-amber-400/40 via-amber-300/15 to-transparent',
    scoreColor: 'text-amber-300',
  },
  red: {
    chipBg: 'bg-red-500',
    chipText: 'text-white',
    chipDot: 'bg-white/90',
    heroBg: 'bg-gradient-to-br from-red-500/15 via-red-500/8 to-transparent',
    heroAccent: 'from-red-400/40 via-red-300/15 to-transparent',
    scoreColor: 'text-red-300',
  },
  pending: {
    chipBg: 'bg-bg-3',
    chipText: 'text-text-dim',
    chipDot: 'bg-text-dim',
    heroBg: 'bg-gradient-to-br from-bg-3 via-bg-2 to-transparent',
    heroAccent: 'from-line-2 via-line to-transparent',
    scoreColor: 'text-text-dim',
  },
};

const STATUS_LABEL: Record<PillarStatus, string> = {
  green: 'Strong',
  amber: 'Needs focus',
  red: 'Priority',
  pending: 'Awaiting data',
};

/** Per-tier marker row theming. */
const TIER_THEME: Record<
  GroupKey,
  { rail: string; pill: string; dot: string }
> = {
  poor: {
    rail: 'bg-red-500',
    pill: 'bg-red-500 text-white',
    dot: 'bg-red-500',
  },
  cautious: {
    rail: 'bg-amber-500',
    pill: 'bg-amber-500 text-white',
    dot: 'bg-amber-500',
  },
  normal: {
    rail: 'bg-slate-400',
    pill: 'bg-slate-400 text-white',
    dot: 'bg-slate-400',
  },
  great: {
    rail: 'bg-blue-500',
    pill: 'bg-blue-500 text-white',
    dot: 'bg-blue-500',
  },
  elite: {
    rail: 'bg-emerald-500',
    pill: 'bg-emerald-500 text-white',
    dot: 'bg-emerald-500',
  },
  pending: {
    rail: 'bg-line-2',
    pill: 'bg-bg-3 text-text-dim ring-1 ring-line-2',
    dot: 'bg-line-2',
  },
};

/** L-shaped corner bracket — echoes the landing teaser's `.teaser-corner`. */
function CornerBrackets() {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute top-3 left-3 size-3 border-l border-t border-gold-dark/60"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-3 right-3 size-3 border-r border-t border-gold-dark/60"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-3 left-3 size-3 border-l border-b border-gold-dark/60"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-3 right-3 size-3 border-r border-b border-gold-dark/60"
      />
    </>
  );
}

const TABBABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getTabbables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null,
  );
}

export default function PillarsDisplayModal({
  open,
  onClose,
  pillar,
  markers,
  insights = [],
}: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

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

  const def = PILLARS.find((p) => p.key === pillar.key);
  const blurb = def?.blurb ?? pillar.blurb;
  const theme = STATUS_THEME[pillar.status];
  const isPending = pillar.status === 'pending';

  const pillarMarkers = markers.filter(
    (m) => markerToPillar(m).pillar === pillar.key,
  );

  // Route each insight into the modal of the marker it relates to. The
  // insight carries the marker test key from generatePeak360Insights; we
  // intersect that with the markers already classified into this pillar.
  const pillarMarkerKeys = new Set(pillarMarkers.map((m) => m.key));
  const pillarInsights = insights.filter((i) => pillarMarkerKeys.has(i.markerKey));

  const grouped: Record<GroupKey, ReportMarker[]> = {
    poor: [],
    cautious: [],
    normal: [],
    great: [],
    elite: [],
    pending: [],
  };
  for (const m of pillarMarkers) {
    grouped[m.tier ?? 'pending'].push(m);
  }

  // Tier counts excluding pending — for the score breakdown row
  const tierCounts: Array<{ tier: RatingTier; count: number }> = (
    ['poor', 'cautious', 'normal', 'great', 'elite'] as const
  ).map((t) => ({ tier: t, count: grouped[t].length }));

  const drawer = (
    <>
      {/* Backdrop — centred modal overlay (was right-drawer). Blur the portal behind. */}
      <div
        className="fixed inset-0 z-40 bg-bg/70 backdrop-blur-md motion-safe:transition-opacity duration-200"
        onClick={onClose}
        aria-hidden
      />

      {/* Centred dialog — vertically + horizontally on screen, dark portal surface. */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${pillar.label} pillar details`}
        tabIndex={-1}
        className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-6 pointer-events-none outline-none"
      >
        <div className="relative w-full max-w-[640px] max-h-[90vh] overflow-y-auto bg-bg-2 border border-line rounded-2xl shadow-2xl pointer-events-auto motion-safe:transition-all duration-200">
        {/* Hero — gradient surface with corner brackets, mono eyebrow, big score */}
        <div
          className={`relative px-6 pt-6 pb-5 border-b border-line ${theme.heroBg}`}
        >
          <CornerBrackets />

          {/* Decorative status-tinted radial accent */}
          <div
            aria-hidden
            className={`pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-gradient-radial blur-3xl ${theme.heroAccent}`}
            style={{
              background: `radial-gradient(circle, var(--tw-gradient-stops))`,
            }}
          />

          {/* Top row — gold mono eyebrow + close button */}
          <div className="relative flex items-center justify-between mb-4">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-brand">
              Pillar · Detail
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              data-autofocus
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-bg-3 text-text-dim hover:bg-line hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-2 transition-colors"
            >
              <svg viewBox="0 0 14 14" className="size-3" aria-hidden>
                <path
                  d="M1 1l12 12M13 1L1 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* Hero — pillar name + score */}
          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-text">
              {pillar.label}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-text-dim max-w-md">
              {blurb}
            </p>

            <div className="mt-5 flex items-end gap-4">
              <span
                className={`font-mono text-6xl md:text-7xl font-bold tabular-nums leading-none ${theme.scoreColor}`}
              >
                {isPending || pillar.score == null ? '—' : pillar.score}
              </span>
              <div className="pb-2 flex flex-col items-start gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-sm ${theme.chipBg} ${theme.chipText}`}
                >
                  <span
                    className={`size-1.5 rounded-full ${theme.chipDot}`}
                    aria-hidden
                  />
                  {STATUS_LABEL[pillar.status]}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
                  Composite index · /100
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tier breakdown bar */}
        {!isPending && pillarMarkers.length > 0 && (
          <div className="px-6 py-5 border-b border-line">
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-text-dim">
                Score breakdown
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
                {pillarMarkers.length} markers
              </span>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-bg-3 ring-1 ring-line">
              {tierCounts
                .filter((t) => t.count > 0)
                .map((t) => (
                  <div
                    key={t.tier}
                    className={TIER_THEME[t.tier].rail}
                    style={{
                      width: `${(t.count / pillarMarkers.length) * 100}%`,
                    }}
                    title={`${TIER_LABELS[t.tier]}: ${t.count}`}
                  />
                ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-text-dim">
              {tierCounts
                .filter((t) => t.count > 0)
                .map((t) => (
                  <span
                    key={t.tier}
                    className="inline-flex items-center gap-1.5"
                  >
                    <span
                      className={`size-1.5 rounded-full ${TIER_THEME[t.tier].dot}`}
                    />
                    {TIER_LABELS[t.tier]} · {t.count}
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Marker rows — grouped by tier */}
        <div className="px-6 py-5">
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-text-dim mb-3">
            Contributing markers
          </h3>

          {pillarMarkers.length === 0 ? (
            <p className="text-sm text-text-dim py-4">
              No markers classified into this pillar.
            </p>
          ) : (
            <div className="space-y-5">
              {GROUP_ORDER.map((tier) => {
                const rows = grouped[tier];
                if (rows.length === 0) return null;
                const label =
                  tier === 'pending' ? 'Pending' : TIER_LABELS[tier];
                const tierCls = TIER_THEME[tier];
                return (
                  <div key={tier}>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`size-2 rounded-full ${tierCls.dot}`}
                      />
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-text">
                        {label}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
                        ·  {rows.length}
                      </span>
                    </div>
                    <ul className="rounded-2xl bg-bg-3 ring-1 ring-line overflow-hidden">
                      {rows.map((m) => (
                        <li
                          key={m.key}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-line/70 last:border-b-0"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`block h-6 w-1 rounded-full ${tierCls.rail}`}
                              aria-hidden
                            />
                            <span className="text-sm text-text truncate">
                              {m.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            {m.value != null ? (
                              <span className="font-mono text-sm tabular-nums text-text">
                                {m.value}
                                {m.unit ? (
                                  <span className="ml-0.5 text-text-dim text-xs">
                                    {m.unit}
                                  </span>
                                ) : null}
                              </span>
                            ) : (
                              <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
                                No data
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tierCls.pill}`}
                            >
                              {label}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Insights & recommendations — routed in from generatePeak360Insights. */}
        {pillarInsights.length > 0 && (
          <div className="px-6 py-5 border-t border-line">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-text-dim mb-3">
              Insights &amp; recommendations
            </h3>
            <div className="space-y-3">
              {pillarInsights.map((insight, i) => (
                <div
                  key={`${insight.markerKey}-${i}`}
                  className="relative bg-bg-3 rounded-xl border border-line overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gold-brand to-champagne" />
                  <div className="pl-5 pr-5 py-4">
                    <h4 className="text-sm font-semibold text-text mb-1.5">{insight.title}</h4>
                    <p className="text-[12px] leading-relaxed text-text-dim mb-3">
                      {insight.why}
                    </p>
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
        </div>
      </aside>
    </>
  );

  return createPortal(drawer, document.body);
}
