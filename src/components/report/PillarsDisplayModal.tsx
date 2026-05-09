'use client';

import Dialog from '@/components/ui/Dialog';
import {
  PILLARS,
  markerToPillar,
  type PillarScore,
} from '@/lib/pillars/mapping';
import type { PillarStatus } from '@/lib/pillars/types';
import type { ReportMarker } from '@/lib/pdf/types';
import {
  TIER_LABELS,
  type RatingTier,
} from '@/types/normative';

interface Props {
  open: boolean;
  onClose: () => void;
  pillar: PillarScore;
  markers: ReportMarker[];
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

/** Per-status hero theming inside the modal. Mirrors the PillarsDisplay duotone. */
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
      'bg-gradient-to-br from-emerald-50 via-emerald-100/60 to-white',
    heroAccent: 'from-emerald-400/40 via-emerald-300/15 to-transparent',
    scoreColor: 'text-emerald-700',
  },
  amber: {
    chipBg: 'bg-amber-500',
    chipText: 'text-white',
    chipDot: 'bg-white/90',
    heroBg: 'bg-gradient-to-br from-amber-50 via-amber-100/60 to-white',
    heroAccent: 'from-amber-400/40 via-amber-300/15 to-transparent',
    scoreColor: 'text-amber-700',
  },
  red: {
    chipBg: 'bg-red-500',
    chipText: 'text-white',
    chipDot: 'bg-white/90',
    heroBg: 'bg-gradient-to-br from-red-50 via-red-100/60 to-white',
    heroAccent: 'from-red-400/40 via-red-300/15 to-transparent',
    scoreColor: 'text-red-700',
  },
  pending: {
    chipBg: 'bg-slate-300',
    chipText: 'text-slate-700',
    chipDot: 'bg-slate-500',
    heroBg: 'bg-gradient-to-br from-slate-50 via-slate-100/60 to-white',
    heroAccent: 'from-slate-300/30 via-slate-200/15 to-transparent',
    scoreColor: 'text-slate-500',
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
    rail: 'bg-slate-300',
    pill: 'bg-slate-200 text-slate-600 ring-1 ring-slate-300',
    dot: 'bg-slate-300',
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

export default function PillarsDisplayModal({
  open,
  onClose,
  pillar,
  markers,
}: Props) {
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
    pending: [],
  };
  for (const m of pillarMarkers) {
    grouped[m.tier ?? 'pending'].push(m);
  }

  // Tier counts excluding pending — for the score breakdown row
  const tierCounts: Array<{ tier: RatingTier; count: number }> = (
    ['poor', 'cautious', 'normal', 'great', 'elite'] as const
  ).map((t) => ({ tier: t, count: grouped[t].length }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      mode="auto"
      ariaLabel={`${pillar.label} pillar details`}
    >
      {/* Hero — gradient surface with corner brackets, mono eyebrow, big score */}
      <div className={`relative -mx-6 -mt-6 md:-mx-8 md:-mt-8 px-6 md:px-8 pt-7 pb-6 ${theme.heroBg}`}>
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
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">
            Pillar · Detail
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-autofocus
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/60 text-muted hover:bg-white hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-dark/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white transition-colors"
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
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-navy">
            {pillar.label}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted max-w-md">
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
                <span className={`size-1.5 rounded-full ${theme.chipDot}`} aria-hidden />
                {STATUS_LABEL[pillar.status]}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Composite index · /100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tier breakdown bar */}
      {!isPending && pillarMarkers.length > 0 && (
        <div className="mt-6">
          <div className="flex items-baseline justify-between mb-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Score breakdown
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              {pillarMarkers.length} markers
            </span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
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
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-muted">
            {tierCounts
              .filter((t) => t.count > 0)
              .map((t) => (
                <span key={t.tier} className="inline-flex items-center gap-1.5">
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
      <div className="mt-6">
        <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted mb-3">
          Contributing markers
        </h3>

        {pillarMarkers.length === 0 ? (
          <p className="text-sm text-muted py-4">
            No markers classified into this pillar.
          </p>
        ) : (
          <div className="space-y-5">
            {GROUP_ORDER.map((tier) => {
              const rows = grouped[tier];
              if (rows.length === 0) return null;
              const label = tier === 'pending' ? 'Pending' : TIER_LABELS[tier];
              const tierCls = TIER_THEME[tier];
              return (
                <div key={tier}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`size-2 rounded-full ${tierCls.dot}`} />
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-navy">
                      {label}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                      ·  {rows.length}
                    </span>
                  </div>
                  <ul className="rounded-2xl bg-slate-50/70 ring-1 ring-slate-200 overflow-hidden">
                    {rows.map((m) => (
                      <li
                        key={m.key}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-200/70 last:border-b-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`block h-6 w-1 rounded-full ${tierCls.rail}`} aria-hidden />
                          <span className="text-sm text-navy truncate">
                            {m.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          {m.value != null ? (
                            <span className="font-mono text-sm tabular-nums text-navy">
                              {m.value}
                              {m.unit ? (
                                <span className="ml-0.5 text-muted text-xs">
                                  {m.unit}
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
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
    </Dialog>
  );
}
