'use client';

import { useState } from 'react';
import { markerToPillar, type PillarScore } from '@/lib/pillars/mapping';
import type { PillarKey, PillarStatus } from '@/lib/pillars/types';
import type { Insight, ReportMarker } from '@/lib/pdf/types';
import { TIER_LABELS, type RatingTier } from '@/types/normative';
import PillarsDisplayModal from '@/components/report/PillarsDisplayModal';

interface Props {
  pillars: PillarScore[];
  markers?: ReportMarker[];
}

const STATUS_RING_HEX: Record<PillarStatus, string> = {
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  pending: '#cbd5e1',
};

const STATUS_LABEL_TEXT: Record<PillarStatus, string> = {
  green: 'text-emerald-300',
  amber: 'text-amber-300',
  red: 'text-red-300',
  pending: 'text-text-dim',
};

const STATUS_LABEL: Record<PillarStatus, string> = {
  green: 'Strong',
  amber: 'Needs focus',
  red: 'Priority',
  pending: 'Awaiting data',
};

const TIER_DOT: Record<RatingTier | 'null', string> = {
  poor: 'bg-red-500',
  cautious: 'bg-amber-500',
  normal: 'bg-slate-400',
  great: 'bg-blue-500',
  elite: 'bg-emerald-500',
  null: 'bg-line-2',
};

const TIER_RANK: Record<RatingTier, number> = {
  poor: 0,
  cautious: 1,
  normal: 2,
  great: 3,
  elite: 4,
};

function getTopContributors(
  pillarKey: PillarKey,
  markers: ReportMarker[] | undefined,
): ReportMarker[] {
  if (!markers) return [];
  return markers
    .filter((m) => {
      const cls = markerToPillar(m);
      return cls.pillar === pillarKey && !cls.supporting;
    })
    .sort((a, b) => {
      const ra = a.tier ? TIER_RANK[a.tier] : 99;
      const rb = b.tier ? TIER_RANK[b.tier] : 99;
      return ra - rb;
    })
    .slice(0, 3);
}

export default function PillarsDisplay({ pillars, markers }: Props) {
  const [selectedKey, setSelectedKey] = useState<PillarKey | null>(null);
  const selected = selectedKey
    ? pillars.find((p) => p.key === selectedKey) ?? null
    : null;

  return (
    <section className="relative mt-10 print:mt-6">
      {/* Section header with landing-page-style gold mono eyebrow */}
      <header className="px-2 sm:px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-brand">
            05 · Peak Living
          </span>
          <span className="h-px w-10 bg-gold-brand/40" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text">
          The five pillars
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-dim">
          Each column reads the rated markers in its domain and reports a
          single composite signal. Tap a pillar for the marker breakdown.
        </p>
      </header>

      {/* Pillars row — Option 2 ring gauges + top-3 contributor chips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 px-2 sm:px-4 pb-10">
        {pillars.map((p, i) => (
          <Pillar
            key={p.key}
            pillar={p}
            markers={markers}
            onSelect={() => setSelectedKey(p.key)}
            index={i}
          />
        ))}
      </div>

      {selected && (
        <PillarsDisplayModal
          open
          onClose={() => setSelectedKey(null)}
          pillar={selected}
          markers={markers ?? []}
        />
      )}
    </section>
  );
}

function Pillar({
  pillar,
  markers,
  onSelect,
  index,
}: {
  pillar: PillarScore;
  markers: ReportMarker[] | undefined;
  onSelect: () => void;
  index: number;
}) {
  const accent = STATUS_RING_HEX[pillar.status];
  const pct = pillar.score ?? 0;
  const isPending = pillar.status === 'pending';
  const labelClass = STATUS_LABEL_TEXT[pillar.status];
  const top = getTopContributors(pillar.key, markers);
  const eyebrow = `P · ${String(index + 1).padStart(2, '0')}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Open ${pillar.label} pillar details`}
      className="group flex w-full flex-col items-center text-center
                 bg-bg-3 rounded-2xl border border-line p-5
                 hover:border-gold-brand/40 hover:bg-bg
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-2
                 motion-safe:transition-all duration-200 cursor-pointer"
    >
      <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-dim self-start">
        {eyebrow}
      </p>

      {/* Ring gauge — conic-gradient driven by pillar score */}
      <div
        className="size-28 rounded-full grid place-items-center my-3 motion-safe:transition-[background] duration-500"
        style={{
          background: `conic-gradient(${accent} ${pct}%, rgba(255,255,255,0.06) 0)`,
        }}
        aria-hidden
      >
        <div className="size-[88px] rounded-full bg-bg-2 grid place-items-center">
          <span className="font-mono text-2xl font-bold tabular-nums text-text">
            {isPending || pillar.score == null ? '—' : pillar.score}
          </span>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-text">{pillar.label}</h3>
      <span
        className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${labelClass}`}
      >
        {STATUS_LABEL[pillar.status]}
      </span>

      {/* Top contributor chips */}
      <div className="mt-3 w-full space-y-1.5 text-left">
        {top.length === 0 ? (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="size-1.5 rounded-full bg-line-2" aria-hidden />
            <span className="flex-1 text-text-dim">Awaiting data</span>
          </div>
        ) : (
          top.map((m) => (
            <div key={m.key} className="flex items-center gap-2 text-[11px]">
              <span
                className={`size-1.5 rounded-full ${TIER_DOT[(m.tier ?? 'null') as keyof typeof TIER_DOT]}`}
                aria-hidden
              />
              <span className="flex-1 text-text truncate">{m.label}</span>
              <span className="font-mono text-text-dim">
                {m.tier ? TIER_LABELS[m.tier].toLowerCase() : 'pending'}
              </span>
            </div>
          ))
        )}
      </div>
    </button>
  );
}
