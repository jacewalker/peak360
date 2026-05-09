'use client';

import type { PillarDefinition, PillarStatus } from '@/lib/pillars/types';
import { TRAFFIC_LIGHT_HEX, TRAFFIC_LIGHT_TEXT, STATUS_LABEL } from '@/lib/pillars/colors';

/**
 * Phase 8 — PillarCard.
 *
 * Single-button presentational card. Whole surface opens the modal.
 * Uses ONLY the traffic-light palette (TRAFFIC_LIGHT_HEX / TRAFFIC_LIGHT_TEXT)
 * for status colour. The 5-tier marker palette is reserved for the modal and
 * the detailed-marker disclosure (D-11).
 */

interface PillarCardProps {
  pillar: PillarDefinition;
  score: number | null;
  status: PillarStatus;
  onOpen: () => void;
}

// `#94a3b8` literal: pending-state dot colour. Mirrors the slate-400 tone used
// by TRAFFIC_LIGHT_TEXT.pending (#64748b is the pending text/foreground; the
// dot is one shade lighter so the dot vs text shapes read distinctly).
const PENDING_DOT = '#94a3b8';

export default function PillarCard({ pillar, score, status, onOpen }: PillarCardProps) {
  const isPending = status === 'pending';
  const pillBg = isPending ? 'transparent' : TRAFFIC_LIGHT_HEX[status];
  const pillText = TRAFFIC_LIGHT_TEXT[status];
  const dotColor = isPending ? PENDING_DOT : TRAFFIC_LIGHT_TEXT[status];

  const borderClass = isPending ? 'border border-dashed border-border' : 'border border-border';

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open detailed view for ${pillar.label}`}
      className={`group flex flex-col items-stretch text-left bg-white rounded-2xl ${borderClass}
        min-h-[96px] md:min-h-[160px] p-4 md:p-6
        shadow-[0_1px_2px_rgba(15,36,64,0.04),0_4px_12px_rgba(15,36,64,0.06)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(245,166,35,0.25)]
        motion-safe:md:hover:-translate-y-0.5 transition-transform duration-150`}
    >
      {/* 1. Pillar label heading */}
      <h3 className="text-[20px] font-semibold leading-[1.25] text-navy">
        {pillar.label}
      </h3>

      {/* 2. Score numeral */}
      <div
        className="text-navy font-semibold leading-none mt-2"
        style={{ fontSize: 'clamp(36px, 4vw, 40px)', fontVariantNumeric: 'tabular-nums' }}
      >
        {score === null ? '—' : score}
        <span className="text-sm font-normal text-muted ml-1 align-baseline">/100</span>
      </div>

      {/* 3. Status pill */}
      <div className="mt-3">
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

      {/* 4. Short summary paragraph */}
      <p className="mt-3 text-sm text-muted leading-[1.5]">
        {pillar.shortSummary}
      </p>

      {/* 5. Drill-down row pinned to bottom */}
      <div className="mt-auto pt-3 flex items-center justify-end text-navy/70 group-hover:text-gold transition-colors">
        <span className="md:hidden text-xs text-muted mr-2">Tap for breakdown</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  );
}
