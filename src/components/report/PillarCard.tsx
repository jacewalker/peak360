'use client';

import type { PillarDefinition, PillarStatus } from '@/lib/pillars/types';
import type { ReportMarker } from '@/lib/pdf/types';
import type { RatingTier } from '@/types/normative';
import { TRAFFIC_LIGHT_HEX } from '@/lib/pillars/colors';

/**
 * Phase 8 — PillarCard (Option 2 visual — see mockups/pillar-options.html
 * lines 162-245).
 *
 * Whoop/Oura aesthetic: conic-gradient ring gauge driven by the pillar
 * score, mono "P · NN" eyebrow, small status label, and a worst-tier-first
 * top-3 contributor list.
 *
 * D-11 anti-pattern: the ring accent uses ONLY the traffic-light palette
 * (TRAFFIC_LIGHT_HEX). The 5-tier marker palette (TIER_DOT below) is
 * reserved for the contributor chips — it lives at the marker layer, not
 * the pillar layer.
 */

interface PillarCardProps {
  pillar: PillarDefinition;
  score: number | null;
  status: PillarStatus;
  markers: ReportMarker[];
  onOpen: () => void;
}

const STATUS_LABEL: Record<PillarStatus, string> = {
  green: 'Strong',
  amber: 'Needs focus',
  red: 'Priority',
  pending: 'Awaiting data',
};

const STATUS_LABEL_TEXT: Record<PillarStatus, string> = {
  green: 'text-emerald-700',
  amber: 'text-amber-700',
  red: 'text-red-700',
  pending: 'text-slate-500',
};

const TIER_DOT: Record<RatingTier | 'null', string> = {
  poor: 'bg-red-500',
  cautious: 'bg-amber-500',
  normal: 'bg-slate-400',
  great: 'bg-blue-500',
  elite: 'bg-emerald-500',
  null: 'bg-slate-300',
};

const TIER_RANK: Record<RatingTier, number> = {
  poor: 0,
  cautious: 1,
  normal: 2,
  great: 3,
  elite: 4,
};

/**
 * Worst-tier-first top-3 contributors. Mirrors the same selection logic
 * used by `PillarsDisplay` so the Section 11 form preview, the portal
 * report, and the PDF all surface the same three markers per pillar.
 */
function getTopContributors(markers: ReportMarker[]): ReportMarker[] {
  return [...markers]
    .sort((a, b) => {
      const ra = a.tier ? TIER_RANK[a.tier] : 99;
      const rb = b.tier ? TIER_RANK[b.tier] : 99;
      return ra - rb;
    })
    .slice(0, 3);
}

export default function PillarCard({
  pillar,
  score,
  status,
  markers,
  onOpen,
}: PillarCardProps) {
  const isPending = status === 'pending';
  const accent = TRAFFIC_LIGHT_HEX[status];
  const pct = score ?? 0;
  const eyebrow = `P · ${String(pillar.sortOrder).padStart(2, '0')}`;
  const top = getTopContributors(markers);

  const borderClass = isPending
    ? 'border border-dashed border-slate-300'
    : 'border border-slate-200';

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open detailed view for ${pillar.label}`}
      className={`group flex w-full flex-col items-center text-center
                  bg-white rounded-2xl ${borderClass} p-5
                  hover:border-gold-dark/50 hover:shadow-md
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-dark/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white
                  motion-safe:transition-all duration-200 cursor-pointer`}
    >
      {/* 1. Mono eyebrow — "P · 01" */}
      <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500 self-start">
        {eyebrow}
      </p>

      {/* 2. Ring gauge — conic-gradient driven by score % */}
      <div
        className="size-28 rounded-full grid place-items-center my-3 motion-safe:transition-[background] duration-500"
        style={{
          background: `conic-gradient(${accent} ${pct}%, #e2e8f0 0)`,
        }}
        aria-hidden
      >
        <div className="size-[88px] rounded-full bg-white grid place-items-center">
          <span className="font-mono text-2xl font-bold tabular-nums text-navy">
            {isPending || score === null ? '—' : score}
          </span>
        </div>
      </div>

      {/* 3. Pillar name + status label */}
      <h3 className="text-sm font-semibold text-navy">{pillar.label}</h3>
      <span
        className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${STATUS_LABEL_TEXT[status]}`}
      >
        {STATUS_LABEL[status]}
      </span>

      {/* 4. Top-3 contributor chips */}
      <div className="mt-3 w-full space-y-1.5 text-left">
        {top.length === 0 ? (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="size-1.5 rounded-full bg-slate-300" aria-hidden />
            <span className="flex-1 text-slate-500">Awaiting data</span>
          </div>
        ) : (
          top.map((m) => (
            <div key={m.key} className="flex items-center gap-2 text-[11px]">
              <span
                className={`size-1.5 rounded-full ${TIER_DOT[(m.tier ?? 'null') as keyof typeof TIER_DOT]}`}
                aria-hidden
              />
              <span className="flex-1 text-slate-700 truncate">{m.label}</span>
              <span className="font-mono text-slate-500">
                {m.tier ?? 'pending'}
              </span>
            </div>
          ))
        )}
      </div>
    </button>
  );
}
