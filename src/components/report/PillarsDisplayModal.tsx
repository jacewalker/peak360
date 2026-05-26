'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  PILLARS,
  markerToPillar,
  type PillarScore,
} from '@/lib/pillars/mapping';
import type { PillarStatus } from '@/lib/pillars/types';
import type { Insight, ReportMarker } from '@/lib/pdf/types';
import type { MarkerContent } from '@/lib/marker-content/queries';
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
  markerContentMap?: Map<string, MarkerContent>;
  gender?: string | null;
}

type GroupKey = RatingTier | 'recorded' | 'pending';

const GROUP_ORDER: readonly GroupKey[] = [
  'poor',
  'cautious',
  'normal',
  'great',
  'elite',
  // "Recorded" = the user entered a value but no normative range exists for
  // this marker, so we can't assign a tier. Distinct from "Pending", which
  // means no data has been entered yet.
  'recorded',
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
  recorded: {
    rail: 'bg-slate-600',
    pill: 'bg-slate-700 text-text-dim ring-1 ring-line-2',
    dot: 'bg-slate-600',
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

/** Normalise the client's stored gender string to the male/female key the
 *  coach-insight matrix is keyed by. Anything that isn't clearly female
 *  defaults to male (the seed authors both, so a miss here only affects the
 *  badge wording, never authorization — T-11-11). */
function normalizeGender(gender: string | null | undefined): 'male' | 'female' {
  return (gender ?? '').toLowerCase().startsWith('f') ? 'female' : 'male';
}

/** Tiny star glyph for the coach-insight card heading (echoes the mockup). */
function CoachStar() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      className="text-gold-brand"
    >
      <path d="M12 2l2.4 7.4H22l-6 4.4 2.3 7.4L12 16.8 5.7 21l2.3-7.4-6-4.4h7.6z" />
    </svg>
  );
}

/** A single "What it is" / "How it affects you" block — gold bar heading +
 *  paragraph. Rendered only when its text is non-empty (D-06: no fallback for
 *  definition/impact). Text is a plain React child, so React escapes it. */
function DetailBlock({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="mt-5">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="block h-[15px] w-[3px] rounded-full bg-gold-brand" aria-hidden />
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-text-dim">
          {heading}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-text-dim max-w-[62ch] whitespace-pre-line">
        {body}
      </p>
    </div>
  );
}

/** Empty-state shown in the right pane (desktop) before a marker is picked. */
function EmptyDetailState() {
  return (
    <div className="flex h-full min-h-[260px] flex-col items-center justify-center px-8 py-12 text-center">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-text-faint">
        Select a marker
      </span>
      <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-text-dim">
        Choose a marker from the list to see what it is, how it affects you,
        and tailored coaching for your result.
      </p>
    </div>
  );
}

/** Marker detail panel (D-03): header → "What it is" → "How it affects you"
 *  → gold-railed Coach insight. Resolves the (tier, gender) coach insight from
 *  authored content (D-05); falls back to generatePeak360Insights output with
 *  an "Auto-generated" note when nothing is authored (D-06). */
function MarkerDetailPanel({
  marker,
  content,
  gender,
  insights,
}: {
  marker: ReportMarker;
  content: MarkerContent | undefined;
  gender: string | null | undefined;
  insights: Insight[];
}) {
  const tier = marker.tier;
  const tierTheme = tier ? TIER_THEME[tier] : null;
  const tierLabel = tier ? TIER_LABELS[tier] : null;
  const genderKey = normalizeGender(gender);
  const genderLabel = genderKey === 'female' ? 'Female' : 'Male';

  // Authored coach insight for this (tier, gender), if present + non-empty.
  // Defensively guard against a legacy/poisoned non-string cell so a bad
  // stored value can never crash the globally-read report modal (CR-01).
  const cell = tier ? content?.coachInsights?.[tier]?.[genderKey] : null;
  const authored = typeof cell === 'string' ? cell.trim() || null : null;

  // D-06 fallback — the generatePeak360Insights output routed to this marker.
  const fallbackInsight = !authored
    ? insights.find((i) => i.markerKey === marker.key) ?? null
    : null;

  return (
    <div className="px-6 py-6 sm:px-7 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2 motion-safe:duration-200">
      {/* Header — name + category, value + unit + tier pill */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-line">
        <div className="min-w-0">
          <h3 className="text-xl font-semibold tracking-tight text-text">
            {marker.label}
          </h3>
          <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint">
            {marker.category}
            {marker.subcategory ? ` · ${marker.subcategory}` : ''}
          </div>
        </div>
        <div className="flex-none text-right">
          <div className="font-mono text-2xl font-semibold tabular-nums text-text">
            {marker.value != null ? marker.value : '—'}
            {marker.value != null && marker.unit ? (
              <span className="ml-1 text-xs text-text-dim">{marker.unit}</span>
            ) : null}
          </div>
          {tierTheme && tierLabel ? (
            <span
              className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tierTheme.pill}`}
            >
              {tierLabel}
            </span>
          ) : null}
        </div>
      </div>

      {/* "What it is" — Definition (omitted when blank, no fallback) */}
      {content?.definition?.trim() ? (
        <DetailBlock heading="What it is" body={content.definition.trim()} />
      ) : null}

      {/* "How it affects you" — Impact (omitted when blank, no fallback) */}
      {content?.impact?.trim() ? (
        <DetailBlock heading="How it affects you" body={content.impact.trim()} />
      ) : null}

      {/* Coach insight — gold-railed card */}
      {(authored || fallbackInsight) && (
        <div className="relative mt-6 overflow-hidden rounded-2xl border border-line-2 bg-gradient-to-b from-gold-brand/8 to-bg-3/60">
          <span
            aria-hidden
            className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-gold-brand to-champagne"
          />
          <div className="py-5 pl-6 pr-5">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-champagne">
                <CoachStar />
                {authored ? 'Coach insight' : 'Insights & recommendations'}
              </span>
              {tierTheme && tierLabel ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line-2 px-2.5 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-text-dim">
                  <span className={`size-1.5 rounded-full ${tierTheme.dot}`} aria-hidden />
                  {authored ? `${genderLabel} · ${tierLabel}` : tierLabel}
                </span>
              ) : null}
            </div>

            {authored ? (
              <p className="text-sm leading-relaxed text-text whitespace-pre-line">
                {authored}
              </p>
            ) : fallbackInsight ? (
              <>
                <p className="text-sm leading-relaxed text-text">
                  {fallbackInsight.why}
                </p>
                {fallbackInsight.doNow.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {fallbackInsight.doNow.map((item, j) => (
                      <li key={j} className="flex items-start gap-2.5">
                        <span
                          aria-hidden
                          className="mt-[7px] size-[5px] flex-none rounded-full bg-gold-brand"
                        />
                        <span className="text-[13.5px] leading-relaxed text-text">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3.5 flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.08em] text-text-faint">
                  <span className="size-1.5 rounded-full bg-gold-brand/70" aria-hidden />
                  Auto-generated · no coach insight authored yet
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PillarsDisplayModal({
  open,
  onClose,
  pillar,
  markers,
  insights = [],
  markerContentMap,
  gender,
}: Props) {
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  // Track the pillar+open identity so we can clear the selection during render
  // when the modal reopens or switches pillars — avoids a stale detail panel
  // without a setState-in-effect (which triggers cascading renders).
  const [paneKey, setPaneKey] = useState<string>(`${open}:${pillar.key}`);
  const currentPaneKey = `${open}:${pillar.key}`;
  if (paneKey !== currentPaneKey) {
    setPaneKey(currentPaneKey);
    setSelectedMarker(null);
  }
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

  const grouped: Record<GroupKey, ReportMarker[]> = {
    poor: [],
    cautious: [],
    normal: [],
    great: [],
    elite: [],
    recorded: [],
    pending: [],
  };
  for (const m of pillarMarkers) {
    if (m.tier) {
      grouped[m.tier].push(m);
    } else if (m.value !== null) {
      // Value entered but no normative range exists for this marker — show
      // it as "Recorded" so the user can see their data without misreading
      // a missing tier as a missing entry.
      grouped.recorded.push(m);
    } else {
      grouped.pending.push(m);
    }
  }

  // Tier counts excluding pending — for the score breakdown row
  const tierCounts: Array<{ tier: RatingTier; count: number }> = (
    ['poor', 'cautious', 'normal', 'great', 'elite'] as const
  ).map((t) => ({ tier: t, count: grouped[t].length }));

  // The currently-selected marker (or null). Looked up within this pillar's
  // markers so a stale key from another pillar resolves to nothing.
  const selected =
    selectedMarker != null
      ? pillarMarkers.find((m) => m.key === selectedMarker) ?? null
      : null;

  const detailPanel = selected ? (
    <MarkerDetailPanel
      marker={selected}
      content={markerContentMap?.get(selected.key)}
      gender={gender}
      insights={insights}
    />
  ) : null;

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
        <div className="relative w-full max-w-[980px] max-h-[90vh] overflow-x-hidden overflow-y-auto bg-bg-2 border border-line rounded-2xl shadow-2xl pointer-events-auto motion-safe:transition-all duration-200">
        {/* Hero — gradient surface with corner brackets, mono eyebrow, big score */}
        <div
          className={`relative overflow-hidden px-6 pt-6 pb-5 border-b border-line ${theme.heroBg}`}
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

        {/* Two-pane master/detail body (D-01, D-02). Desktop: left marker
            list + right detail pane side-by-side. Mobile: single column —
            the list, with a full-width drill-in overlay when a marker is
            selected. */}
        {pillarMarkers.length === 0 ? (
          <div className="px-6 py-5">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-text-dim mb-3">
              Contributing markers
            </h3>
            <p className="text-sm text-text-dim py-4">
              No markers classified into this pillar.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-[minmax(280px,38%)_1fr]">
            {/* LEFT — tier-grouped, selectable marker list. Hidden on mobile
                once a marker is selected (the detail overlay takes over). */}
            <div
              className={`md:border-r border-line md:max-h-[560px] md:overflow-y-auto ${
                selected ? 'hidden md:block' : 'block'
              }`}
            >
              <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-text-dim px-6 pt-5 pb-3">
                Contributing markers
              </h3>
              <div className="space-y-5 px-4 pb-5">
                {GROUP_ORDER.map((tier) => {
                  const rows = grouped[tier];
                  if (rows.length === 0) return null;
                  const label =
                    tier === 'pending'
                      ? 'Pending'
                      : tier === 'recorded'
                      ? 'Recorded'
                      : TIER_LABELS[tier];
                  const tierCls = TIER_THEME[tier];
                  return (
                    <div key={tier} className="px-2">
                      <div className="flex items-center gap-2 mb-2 px-1.5">
                        <span className={`size-2 rounded-full ${tierCls.dot}`} />
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-text">
                          {label}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
                          ·  {rows.length}
                        </span>
                      </div>
                      <ul
                        role="listbox"
                        aria-label={`${label} markers`}
                        className="space-y-1.5"
                      >
                        {rows.map((m) => {
                          const isSelected = selectedMarker === m.key;
                          return (
                            <li key={m.key} role="presentation">
                              <button
                                type="button"
                                role="option"
                                onClick={() => setSelectedMarker(m.key)}
                                aria-selected={isSelected}
                                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left border motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-2 ${
                                  isSelected
                                    ? 'border-gold-brand/45 bg-gradient-to-r from-gold-brand/14 to-gold-brand/4'
                                    : 'border-transparent bg-bg-3 hover:bg-bg hover:border-line-2'
                                }`}
                              >
                                <span
                                  className={`block h-6 w-[3px] rounded-full flex-none ${tierCls.rail}`}
                                  aria-hidden
                                />
                                <span className="flex-1 text-[13.5px] text-text truncate">
                                  {m.label}
                                </span>
                                {m.value != null ? (
                                  <span className="font-mono text-[12.5px] tabular-nums text-text-dim">
                                    {m.value}
                                    {m.unit ? ` ${m.unit}` : ''}
                                  </span>
                                ) : (
                                  <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
                                    No data
                                  </span>
                                )}
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 12 12"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  aria-hidden
                                  className={`flex-none motion-safe:transition-transform ${
                                    isSelected
                                      ? 'text-gold-brand translate-x-0.5'
                                      : 'text-text-faint'
                                  }`}
                                >
                                  <path d="M4.5 3L7.5 6L4.5 9" />
                                </svg>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT — detail pane. Hidden on mobile (mobile uses the overlay
                below); on desktop shows the panel or an empty-state prompt. */}
            <div className="hidden md:block md:max-h-[560px] md:overflow-y-auto">
              {detailPanel ?? <EmptyDetailState />}
            </div>

            {/* MOBILE — full-width drill-in overlay with a back control. */}
            {selected && (
              <div className="md:hidden border-t border-line">
                <button
                  type="button"
                  onClick={() => setSelectedMarker(null)}
                  className="flex items-center gap-2 px-4 py-3.5 text-gold-brand font-mono text-[10px] uppercase tracking-[0.14em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-brand/60 rounded-md"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden
                  >
                    <path d="M7.5 3L4.5 6L7.5 9" />
                  </svg>
                  {pillar.label}
                </button>
                {detailPanel}
              </div>
            )}
          </div>
        )}

        </div>
      </aside>
    </>
  );

  return createPortal(drawer, document.body);
}
