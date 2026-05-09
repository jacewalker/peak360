'use client';

import Dialog from '@/components/ui/Dialog';
import {
  PILLARS,
  TRAFFIC_LIGHT,
  markerToPillar,
  type PillarScore,
} from '@/lib/pillars/mapping';
import type { ReportMarker } from '@/lib/pdf/types';
import {
  TIER_LABELS,
  TIER_COLORS,
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

const PENDING_PILL_CLASSES =
  'text-slate-600 bg-slate-100 border-slate-300';

/**
 * Section 11 — per-pillar detail modal.
 *
 * Wraps the shared `Dialog` primitive (backdrop blur, focus trap, ESC close,
 * mobile bottom-sheet via `mode="auto"`). Filters the caller's full marker
 * array down to those classified into the selected pillar via the SAME
 * `markerToPillar` classifier `computeAllPillarScoresLegacy` uses, so the
 * groupings stay consistent with the score the user clicked.
 *
 * Includes BOTH primary and supporting markers — the modal is informational,
 * not score-strict. Markers without a tier (no value or no norms) are bucketed
 * into a separate "Pending" group at the end.
 */
export default function PillarsDisplayModal({
  open,
  onClose,
  pillar,
  markers,
}: Props) {
  const def = PILLARS.find((p) => p.key === pillar.key);
  const blurb = def?.blurb ?? pillar.blurb;
  const tone = TRAFFIC_LIGHT[pillar.status];
  const isPending = pillar.status === 'pending';

  const pillarMarkers = markers.filter(
    (m) => markerToPillar(m).pillar === pillar.key,
  );

  // Group by tier, with a final "pending" bucket for tier === null
  const grouped: Record<GroupKey, ReportMarker[]> = {
    poor: [],
    cautious: [],
    normal: [],
    great: [],
    elite: [],
    pending: [],
  };
  for (const m of pillarMarkers) {
    const bucket: GroupKey = m.tier ?? 'pending';
    grouped[bucket].push(m);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      mode="auto"
      ariaLabel={`${pillar.label} pillar details`}
    >
      {/* Header — pillar name + close */}
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-semibold text-[#1a365d] tracking-tight">
          {pillar.label}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          data-autofocus
          className="-mt-1 -mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#1a365d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24a]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <span aria-hidden className="text-lg leading-none">
            ×
          </span>
        </button>
      </div>

      {/* Score + status row */}
      <div className="mt-3 flex items-baseline gap-3">
        <span
          className="text-4xl font-bold tabular-nums leading-none"
          style={{
            color: tone.text,
            fontFeatureSettings: '"tnum"',
          }}
        >
          {isPending || pillar.score == null ? '—' : pillar.score}
        </span>
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
          style={{ backgroundColor: tone.bg, color: tone.text }}
        >
          {tone.label}
        </span>
      </div>

      {/* Blurb */}
      <p className="text-sm text-[#475569] mt-2 leading-relaxed">{blurb}</p>

      {/* Markers section */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-[#1a365d]">Markers</h3>
          <span className="text-[11px] uppercase tracking-wider text-[#64748b]">
            {pillarMarkers.length} contributing
          </span>
        </div>

        {pillarMarkers.length === 0 ? (
          <p className="text-sm text-[#94a3b8] mt-4">
            No markers classified into this pillar.
          </p>
        ) : (
          GROUP_ORDER.map((tier) => {
            const rows = grouped[tier];
            if (rows.length === 0) return null;
            const label =
              tier === 'pending' ? 'Pending' : TIER_LABELS[tier];
            const pillClasses =
              tier === 'pending'
                ? PENDING_PILL_CLASSES
                : TIER_COLORS[tier];
            return (
              <div key={tier}>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b] mt-4 mb-2">
                  {label}
                </h4>
                <ul className="divide-y divide-[#f1f5f9]">
                  {rows.map((m) => (
                    <li
                      key={m.key}
                      className="flex items-center justify-between gap-3 py-1.5"
                    >
                      <span className="text-sm text-[#1a365d]">
                        {m.label}
                      </span>
                      <div className="flex items-center gap-2">
                        {m.value != null ? (
                          <span className="text-sm tabular-nums text-[#475569]">
                            {m.value}
                            {m.unit ? ` ${m.unit}` : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-[#94a3b8]">
                            No data
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${pillClasses}`}
                        >
                          {label}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </div>
    </Dialog>
  );
}
