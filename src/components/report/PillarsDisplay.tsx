'use client';

import { useState } from 'react';
import { TRAFFIC_LIGHT, type PillarScore } from '@/lib/pillars/mapping';
import type { PillarKey, PillarStatus } from '@/lib/pillars/types';
import type { ReportMarker } from '@/lib/pdf/types';
import PillarsDisplayModal from '@/components/report/PillarsDisplayModal';

interface Props {
  pillars: PillarScore[];
  markers?: ReportMarker[];
}

const MONO = 'ui-monospace, "JetBrains Mono", "SF Mono", Menlo, monospace';

/**
 * Per-status duotone palette: a lighter tint for the empty capsule background
 * and a darker, saturated tone for the rising fill. Keeps each pillar in a
 * single hue family so the bubble reads as one coherent vessel.
 */
const DUOTONE: Record<
  PillarStatus,
  {
    bg: string;
    bgDeep: string;
    fillTop: string;
    fillBottom: string;
    ring: string;
    glow: string;
    accent: string;
  }
> = {
  green: {
    bg: '#d1fae5',
    bgDeep: '#a7f3d0',
    fillTop: '#047857',
    fillBottom: '#064e3b',
    ring: 'rgba(6,78,59,0.22)',
    glow: 'rgba(4,120,87,0.40)',
    accent: '#10b981',
  },
  amber: {
    bg: '#fde68a',
    bgDeep: '#fcd34d',
    fillTop: '#b45309',
    fillBottom: '#7c2d12',
    ring: 'rgba(180,83,9,0.24)',
    glow: 'rgba(180,83,9,0.40)',
    accent: '#f59e0b',
  },
  red: {
    bg: '#fecaca',
    bgDeep: '#fca5a5',
    fillTop: '#b91c1c',
    fillBottom: '#7f1d1d',
    ring: 'rgba(127,29,29,0.24)',
    glow: 'rgba(185,28,28,0.40)',
    accent: '#ef4444',
  },
  pending: {
    bg: '#e2e8f0',
    bgDeep: '#cbd5e1',
    fillTop: '#64748b',
    fillBottom: '#475569',
    ring: 'rgba(100,116,139,0.24)',
    glow: 'rgba(100,116,139,0.20)',
    accent: '#94a3b8',
  },
};

/**
 * "Liquid Signal Columns" — futuristic glass capsules echoing the landing
 * page's gold/champagne accents and atmospheric radial glows. Each pillar is
 * a backlit vial; the score sits centred inside the bubble. Layout (5-up row,
 * heights, scoring data) is preserved.
 */
export default function PillarsDisplay({ pillars, markers }: Props) {
  const [selectedKey, setSelectedKey] = useState<PillarKey | null>(null);
  const selected = selectedKey
    ? pillars.find((p) => p.key === selectedKey) ?? null
    : null;

  return (
    <section className="relative mt-10 print:mt-6">
      {/* Atmospheric backdrop — radial gold bloom + faint grid mask */}
      <div
        aria-hidden
        className="absolute inset-0 -mx-2 sm:-mx-4 rounded-[32px] pointer-events-none overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(245,166,35,0.08), transparent 70%),' +
            'radial-gradient(ellipse 50% 80% at 50% 100%, rgba(26,54,93,0.04), transparent 70%),' +
            'linear-gradient(180deg, rgba(248,250,252,0.6) 0%, rgba(255,255,255,0) 80%)',
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(26,54,93,0.06) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(26,54,93,0.06) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage:
              'radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent 80%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent 80%)',
          }}
        />
      </div>

      {/* Header — mono eyebrow + display heading + live status */}
      <header className="relative px-2 sm:px-4 pt-6 sm:pt-8 pb-6 flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span
              className="text-[10px] tracking-[0.22em] uppercase font-semibold"
              style={{ color: '#c9a24a', fontFamily: MONO }}
            >
              05 · Peak Living
            </span>
            <span className="h-px w-10 bg-[#c9a24a]/40" />
          </div>
          <h2
            className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1a365d]"
            style={{ letterSpacing: '-0.02em' }}
          >
            The five pillars
          </h2>
          <p className="mt-2 text-sm text-[#475569] max-w-2xl leading-relaxed">
            Each column reads the rated markers in its domain and reports a
            single composite signal — green is strong, amber needs attention,
            red is a priority, grey is awaiting data.
          </p>
        </div>

        {/* Live signal chip */}
        <div
          className="inline-flex items-center gap-2 text-[10px] uppercase font-semibold px-2.5 py-1 rounded-sm"
          style={{
            color: '#c9a24a',
            letterSpacing: '0.2em',
            fontFamily: MONO,
            border: '1px solid rgba(201,162,74,0.35)',
            background:
              'linear-gradient(180deg, rgba(201,162,74,0.06), rgba(201,162,74,0.01))',
          }}
        >
          <span className="relative inline-flex h-1.5 w-1.5">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
              style={{ backgroundColor: '#c9a24a' }}
            />
            <span
              className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: '#c9a24a' }}
            />
          </span>
          Signal · Live
        </div>
      </header>

      {/* Pillars row */}
      <div className="relative grid grid-cols-5 gap-2 sm:gap-3 px-2 sm:px-4 pb-8">
        {pillars.map((p, idx) => (
          <Pillar
            key={p.key}
            pillar={p}
            index={idx}
            onSelect={() => setSelectedKey(p.key)}
          />
        ))}
      </div>

      {selected && (
        <PillarsDisplayModal
          open={selected !== null}
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
  index,
  onSelect,
}: {
  pillar: PillarScore;
  index: number;
  onSelect: () => void;
}) {
  const palette = TRAFFIC_LIGHT[pillar.status];
  const tone = DUOTONE[pillar.status];
  const fillPct = pillar.score ?? 0;
  const isPending = pillar.status === 'pending';
  const scoreOnFill = !isPending && fillPct >= 55;
  const idxLabel = `P.${String(index + 1).padStart(2, '0')}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Open ${pillar.label} pillar details`}
      className="group relative flex flex-col items-center text-center cursor-pointer rounded-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24a]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-safe:transition-transform hover:-translate-y-0.5"
    >
      {/* Mono channel label above */}
      <div
        className="mb-2 text-[9px] uppercase font-semibold tabular-nums"
        style={{
          color: tone.fillBottom,
          letterSpacing: '0.22em',
          fontFamily: MONO,
          opacity: 0.7,
        }}
      >
        {idxLabel} · CH {String(index + 1).padStart(2, '0')}
      </div>

      {/* Outer glow halo — sits behind capsule */}
      {!isPending && (
        <div
          aria-hidden
          className="absolute left-1/2 top-10 -translate-x-1/2 w-[80%] h-48 sm:h-56 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: tone.fillTop }}
        />
      )}

      {/* Capsule */}
      <div
        className="relative w-full h-56 sm:h-64 overflow-hidden"
        style={{
          borderRadius: '36px',
          background: `linear-gradient(180deg, ${tone.bg} 0%, ${tone.bgDeep} 100%)`,
          border: `1px solid ${tone.ring}`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45),
                      inset 0 -20px 40px -16px ${tone.glow},
                      0 6px 20px -10px ${tone.glow},
                      0 1px 2px rgba(15,23,42,0.05)`,
        }}
        aria-label={`${pillar.label} score ${isPending ? 'pending' : pillar.score}`}
      >
        {/* Liquid fill column */}
        {!isPending && (
          <div
            className="absolute bottom-0 left-0 right-0 transition-[height] duration-700 ease-out"
            style={{
              height: `${fillPct}%`,
              background: `linear-gradient(180deg, ${tone.fillTop} 0%, ${tone.fillBottom} 100%)`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18),
                          inset 0 -24px 48px -16px rgba(0,0,0,0.30)`,
            }}
          >
            {/* CRT scanlines across the fill */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 1px, transparent 4px)',
              }}
            />
            {/* Meniscus highlight at the top of the fill */}
            <div
              aria-hidden
              className="absolute top-0 left-2 right-2 h-px opacity-80"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)',
              }}
            />
          </div>
        )}

        {/* HUD corner brackets — gold accent at each corner */}
        <CornerBrackets color={tone.fillBottom} />

        {/* Vertical tick scale on right edge */}
        <div
          aria-hidden
          className="absolute right-3 top-6 bottom-6 w-1.5 flex flex-col justify-between pointer-events-none"
        >
          {[100, 75, 50, 25, 0].map((pct) => (
            <div key={pct} className="flex items-center justify-end gap-1">
              <span
                className="text-[7px] font-semibold tabular-nums"
                style={{
                  color: tone.fillBottom,
                  fontFamily: MONO,
                  opacity: pct % 50 === 0 ? 0.55 : 0.3,
                  letterSpacing: '0.05em',
                }}
              >
                {String(pct).padStart(3, '0')}
              </span>
              <span
                className="block h-px"
                style={{
                  width: pct % 50 === 0 ? '6px' : '3px',
                  backgroundColor: tone.fillBottom,
                  opacity: pct % 50 === 0 ? 0.45 : 0.25,
                }}
              />
            </div>
          ))}
        </div>

        {/* Live indicator dot — top centre */}
        {!isPending && (
          <div
            aria-hidden
            className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1"
          >
            <span className="relative inline-flex h-1 w-1">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping"
                style={{ backgroundColor: tone.accent }}
              />
              <span
                className="relative inline-flex h-1 w-1 rounded-full"
                style={{ backgroundColor: tone.accent }}
              />
            </span>
          </div>
        )}

        {/* Specular dome highlight (top inner glow) */}
        <div
          aria-hidden
          className="absolute top-0 left-0 right-0 h-12 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(255,255,255,0.35), transparent 70%)',
          }}
        />

        {/* Centred digital readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="text-3xl sm:text-4xl font-bold tabular-nums leading-none"
            style={{
              color: scoreOnFill ? '#ffffff' : tone.fillBottom,
              textShadow: scoreOnFill
                ? `0 0 12px ${tone.accent}99, 0 1px 2px rgba(0,0,0,0.45)`
                : `0 1px 0 rgba(255,255,255,0.5)`,
              fontFamily: MONO,
              fontFeatureSettings: '"tnum", "ss01"',
              letterSpacing: '-0.03em',
            }}
          >
            {isPending ? '—' : String(pillar.score).padStart(2, '0')}
          </span>
          <span
            className="mt-1 text-[8px] font-semibold uppercase"
            style={{
              color: scoreOnFill ? 'rgba(255,255,255,0.65)' : tone.fillBottom,
              opacity: scoreOnFill ? 1 : 0.55,
              letterSpacing: '0.3em',
              fontFamily: MONO,
            }}
          >
            Index
          </span>
        </div>
      </div>

      {/* Status row — mono uppercase, tinted to match the pillar */}
      <div className="mt-4 flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: tone.fillTop,
            boxShadow: isPending ? undefined : `0 0 8px ${tone.fillTop}88`,
          }}
          aria-hidden
        />
        <span
          className="text-[10px] font-semibold uppercase"
          style={{
            color: tone.fillBottom,
            letterSpacing: '0.18em',
            fontFamily: MONO,
          }}
        >
          {palette.label}
        </span>
      </div>

      {/* Pillar name */}
      <p
        className="mt-2 text-[12px] sm:text-sm font-semibold text-[#1a365d] leading-tight px-1"
        style={{ letterSpacing: '-0.005em' }}
      >
        {pillar.label}
      </p>

      {/* Rated count — mono fraction */}
      <p
        className="mt-1 text-[10px] tabular-nums"
        style={{
          color: '#94a3b8',
          letterSpacing: '0.12em',
          fontFamily: MONO,
        }}
      >
        {String(pillar.rated).padStart(2, '0')}{' '}
        <span className="opacity-50">/</span>{' '}
        {String(pillar.total).padStart(2, '0')}
      </p>
    </button>
  );
}

/**
 * HUD-style L-shaped corner brackets — echoes the landing page's `.teaser-corner`
 * markers. Sized to sit just inside the rounded capsule corners.
 */
function CornerBrackets({ color }: { color: string }) {
  const size = 10;
  const inset = 12;
  const stroke = `1px solid ${color}`;
  const opacity = 0.55;
  const corners: Array<{
    pos: React.CSSProperties;
    borders: React.CSSProperties;
  }> = [
    {
      pos: { top: inset, left: inset },
      borders: { borderTop: stroke, borderLeft: stroke },
    },
    {
      pos: { top: inset, right: inset },
      borders: { borderTop: stroke, borderRight: stroke },
    },
    {
      pos: { bottom: inset, left: inset },
      borders: { borderBottom: stroke, borderLeft: stroke },
    },
    {
      pos: { bottom: inset, right: inset },
      borders: { borderBottom: stroke, borderRight: stroke },
    },
  ];
  return (
    <>
      {corners.map((c, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            width: size,
            height: size,
            opacity,
            ...c.pos,
            ...c.borders,
          }}
        />
      ))}
    </>
  );
}
