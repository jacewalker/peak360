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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
    <article
      className="relative flex flex-col rounded-xl border bg-white overflow-hidden"
      style={{ borderColor: palette.ring }}
    >
      {/* Top status band */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: palette.fill }}
        aria-hidden="true"
      />

      {/* Header */}
      <div className="px-4 pt-3 pb-2">
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#64748b]">
          {pillar.label}
        </p>
        <p className="text-[11px] text-[#94a3b8] mt-0.5 leading-tight">{pillar.blurb}</p>
      </div>

      {/* Vertical pillar — score bar */}
      <div className="px-4 pb-3 flex items-end gap-3">
        <div
          className="relative w-12 h-32 rounded-md overflow-hidden"
          style={{ backgroundColor: palette.bg }}
          aria-label={`${pillar.label} score`}
        >
          {!isPending && (
            <div
              className="absolute bottom-0 left-0 right-0 transition-[height] duration-500"
              style={{
                height: `${fillPct}%`,
                background: `linear-gradient(180deg, ${palette.fill} 0%, ${palette.fill} 100%)`,
              }}
            />
          )}
          {/* Tick marks */}
          <div className="absolute inset-0 flex flex-col justify-between py-1.5 pointer-events-none">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-px bg-white/40" />
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1">
            <span
              className="text-3xl font-bold tabular-nums leading-none"
              style={{ color: palette.text }}
            >
              {isPending ? '—' : pillar.score}
            </span>
            {!isPending && (
              <span className="text-xs font-medium text-[#94a3b8]">/100</span>
            )}
          </div>
          <div
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5"
            style={{ backgroundColor: palette.bg }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: palette.fill }}
              aria-hidden="true"
            />
            <span
              className="text-[10px] font-semibold tracking-wide"
              style={{ color: palette.text }}
            >
              {palette.label}
            </span>
          </div>
          <p className="mt-2 text-[10px] text-[#94a3b8]">
            {pillar.rated}/{pillar.total} markers
          </p>
        </div>
      </div>
    </article>
  );
}
