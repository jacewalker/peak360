'use client';

import { TRAFFIC_LIGHT, type PillarScore } from '@/lib/pillars/mapping';

interface Props {
  pillars: PillarScore[];
}

export default function PillarsDisplay({ pillars }: Props) {
  return (
    <section className="mt-10 print:mt-6">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-6 bg-[#F5A623] rounded-full" />
          <h2 className="text-xl font-bold text-[#1a365d] tracking-tight">The Peak Living Pillars</h2>
        </div>
        <p className="text-sm text-[#475569] max-w-2xl">
          Five pillars summarise the assessment. Each is scored from the rated markers in that domain and
          colour-coded — green is strong, amber needs work, red is a priority, grey means data is pending.
        </p>
      </header>

      <div className="grid grid-cols-5 gap-2 sm:gap-4">
        {pillars.map((p) => (
          <Pillar key={p.key} pillar={p} />
        ))}
      </div>
    </section>
  );
}

function Pillar({ pillar }: { pillar: PillarScore }) {
  const palette = TRAFFIC_LIGHT[pillar.status];
  const fillPct = pillar.score ?? 0;
  const isPending = pillar.status === 'pending';

  return (
    <article className="flex flex-col items-center text-center">
      {/* Score */}
      <div className="flex items-baseline gap-0.5 mb-2">
        <span
          className="text-2xl sm:text-3xl font-bold tabular-nums leading-none"
          style={{ color: palette.text }}
        >
          {isPending ? '—' : pillar.score}
        </span>
        {!isPending && (
          <span className="text-[10px] font-medium text-[#94a3b8]">/100</span>
        )}
      </div>

      {/* Thin vertical pillar */}
      <div
        className="relative w-6 sm:w-7 h-48 sm:h-56 rounded-full overflow-hidden ring-1"
        style={{
          backgroundColor: palette.bg,
          boxShadow: `inset 0 0 0 1px ${palette.ring}`,
        }}
        aria-label={`${pillar.label} score ${isPending ? 'pending' : pillar.score}`}
      >
        {!isPending && (
          <div
            className="absolute bottom-0 left-0 right-0 transition-[height] duration-700 ease-out"
            style={{
              height: `${fillPct}%`,
              background: `linear-gradient(180deg, ${palette.fill} 0%, ${palette.fill} 100%)`,
            }}
          />
        )}
        {/* tick marks for visual reference */}
        <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-px bg-white/50 mx-1" />
          ))}
        </div>
      </div>

      {/* Status dot + label */}
      <div className="mt-3 flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: palette.fill }}
          aria-hidden="true"
        />
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: palette.text }}
        >
          {palette.label}
        </span>
      </div>

      {/* Pillar name */}
      <p className="mt-2 text-[11px] sm:text-xs font-semibold text-[#1a365d] leading-tight px-1">
        {pillar.label}
      </p>
      <p className="mt-0.5 text-[10px] text-[#94a3b8]">
        {pillar.rated}/{pillar.total}
      </p>
    </article>
  );
}
