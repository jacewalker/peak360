'use client';

import { useState } from 'react';
import { type PillarScore } from '@/lib/pillars/mapping';
import type { PillarKey, PillarStatus } from '@/lib/pillars/types';
import type { ReportMarker } from '@/lib/pdf/types';
import PillarsDisplayModal from '@/components/report/PillarsDisplayModal';

interface Props {
  pillars: PillarScore[];
  markers?: ReportMarker[];
}

type StatusClasses = {
  ring: string;
  /** Capsule background — vibrant tint of the status hue. */
  bg: string;
  border: string;
  /** Liquid fill column gradient — multi-stop vibrant. */
  fill: string;
  /** Outer halo behind the capsule. */
  halo: string;
  /** Inner radial sheen overlay (top-left highlight blob). */
  sheen: string;
  /** Status pill chip below the capsule. */
  pill: string;
  /** Status label text colour (used on light surfaces). */
  label: string;
  /** Drop-shadow glow on the capsule when active. */
  shadow: string;
};

const STATUS: Record<PillarStatus, StatusClasses> = {
  green: {
    ring: 'focus-visible:ring-emerald-500/60',
    bg: 'bg-gradient-to-br from-emerald-100 via-emerald-200 to-emerald-300',
    border: 'border-emerald-700/20',
    fill: 'bg-gradient-to-b from-emerald-400 via-emerald-600 to-emerald-800',
    halo: 'bg-emerald-400/60',
    sheen:
      'bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.55),transparent_55%)]',
    pill: 'bg-emerald-500/90 text-white ring-1 ring-emerald-700/30 shadow-emerald-500/30',
    label: 'text-emerald-900',
    shadow: 'shadow-emerald-500/40',
  },
  amber: {
    ring: 'focus-visible:ring-amber-500/60',
    bg: 'bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300',
    border: 'border-amber-700/20',
    fill: 'bg-gradient-to-b from-amber-400 via-amber-600 to-amber-800',
    halo: 'bg-amber-400/60',
    sheen:
      'bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.55),transparent_55%)]',
    pill: 'bg-amber-500/90 text-white ring-1 ring-amber-700/30 shadow-amber-500/30',
    label: 'text-amber-900',
    shadow: 'shadow-amber-500/40',
  },
  red: {
    ring: 'focus-visible:ring-red-500/60',
    bg: 'bg-gradient-to-br from-red-100 via-red-200 to-red-300',
    border: 'border-red-700/20',
    fill: 'bg-gradient-to-b from-red-400 via-red-600 to-red-800',
    halo: 'bg-red-400/60',
    sheen:
      'bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.55),transparent_55%)]',
    pill: 'bg-red-500/90 text-white ring-1 ring-red-700/30 shadow-red-500/30',
    label: 'text-red-900',
    shadow: 'shadow-red-500/40',
  },
  pending: {
    ring: 'focus-visible:ring-slate-400/60',
    bg: 'bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300',
    border: 'border-slate-400/30',
    fill: '',
    halo: 'bg-slate-400/30',
    sheen:
      'bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.45),transparent_55%)]',
    pill: 'bg-slate-300 text-slate-700 ring-1 ring-slate-400/30',
    label: 'text-slate-600',
    shadow: 'shadow-slate-400/20',
  },
};

const STATUS_LABEL: Record<PillarStatus, string> = {
  green: 'Strong',
  amber: 'Needs focus',
  red: 'Priority',
  pending: 'Awaiting data',
};

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
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-dark">
            05 · Peak Living
          </span>
          <span className="h-px w-10 bg-gold-dark/40" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-navy">
          The five pillars
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Each column reads the rated markers in its domain and reports a
          single composite signal. Tap a pillar for the marker breakdown.
        </p>
      </header>

      {/* Pillars row */}
      <div className="grid grid-cols-5 gap-3 sm:gap-5 px-2 sm:px-4 pb-10">
        {pillars.map((p) => (
          <Pillar key={p.key} pillar={p} onSelect={() => setSelectedKey(p.key)} />
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
  onSelect,
}: {
  pillar: PillarScore;
  onSelect: () => void;
}) {
  const cls = STATUS[pillar.status];
  const isPending = pillar.status === 'pending';
  const fillPct = pillar.score ?? 0;
  const scoreOnFill = !isPending && fillPct >= 55;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Open ${pillar.label} pillar details`}
      className={`group flex w-full flex-col items-center text-center outline-none cursor-pointer
                  rounded-[2rem] focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-white
                  motion-safe:transition-all duration-300
                  hover:-translate-y-1 ${cls.ring}`}
    >
      {/* Capsule with halo */}
      <div className="relative w-full">
        {/* Soft outer halo glow */}
        <div
          aria-hidden
          className={`pointer-events-none absolute -inset-2 rounded-[3rem] blur-2xl opacity-70
                      motion-safe:transition-opacity duration-300
                      group-hover:opacity-100 ${cls.halo}`}
        />

        {/* Capsule */}
        <div
          className={`relative h-60 sm:h-64 w-full overflow-hidden rounded-[2rem] border
                      shadow-2xl ${cls.bg} ${cls.border} ${cls.shadow}
                      motion-safe:transition-shadow duration-300
                      group-hover:shadow-2xl`}
          aria-label={`${pillar.label} score ${isPending ? 'pending' : pillar.score}`}
        >
          {/* Liquid fill column */}
          {!isPending && (
            <div
              className={`absolute inset-x-0 bottom-0 motion-safe:transition-[height] motion-safe:duration-1000 motion-safe:ease-out ${cls.fill}`}
              style={{ height: `${fillPct}%` }}
            >
              {/* Meniscus shimmer */}
              <div
                aria-hidden
                className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent"
              />
              {/* Subtle shimmer overlay on the fill */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/15 to-transparent"
              />
            </div>
          )}

          {/* Inner sheen — radial highlight (the "bubble" cue) */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 ${cls.sheen}`}
          />

          {/* Centred score */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span
              className={`font-mono text-4xl sm:text-5xl font-bold tabular-nums leading-none
                          drop-shadow-md ${scoreOnFill ? 'text-white' : cls.label}`}
            >
              {isPending ? '—' : pillar.score}
            </span>
          </div>

          {/* Bottom inner shadow for orb depth */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/15 to-transparent"
          />
        </div>
      </div>

      {/* Status pill */}
      <span
        className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider shadow-md ${cls.pill}`}
      >
        <span className="size-1.5 rounded-full bg-white/90" aria-hidden />
        {STATUS_LABEL[pillar.status]}
      </span>

      {/* Pillar name */}
      <p className="mt-2 text-sm font-semibold leading-tight text-navy">
        {pillar.label}
      </p>

      {/* Rated count */}
      <p className="mt-0.5 font-mono text-[10px] tabular-nums tracking-wider text-muted">
        {String(pillar.rated).padStart(2, '0')}
        <span className="mx-0.5 opacity-50">/</span>
        {String(pillar.total).padStart(2, '0')}
      </p>
    </button>
  );
}
