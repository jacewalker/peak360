'use client';

import type { MarkerStats } from '@/lib/markers/stats';

/**
 * Quick 260529-mwp - Admin markers redesign (stats bar).
 *
 * Renders at-a-glance registry analytics above the markers search input:
 *   - 4 chunky stat tiles (Total / Sources / With norms / With content) using
 *     the portal stat-tile prior art (mono eyebrow + 40px mono numeric value).
 *   - A per-section breakdown strip (sections 1..10) with norms/content counts.
 *
 * Pure presentational - receives a precomputed MarkerStats. Task 2 mounts it.
 */
export default function MarkersStatsBar({ stats }: { stats: MarkerStats }) {
  const isEmpty = stats.total === 0;

  return (
    <div className="mb-8">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total */}
        <div className="bg-bg-3 rounded-xl border border-line p-5">
          <p className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">
            Total
          </p>
          <p
            className={`font-mono text-[40px] font-medium leading-none mt-2 ${
              isEmpty ? 'text-danger' : 'text-text'
            }`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {stats.total}
          </p>
          <p className="text-[13px] text-text-dim mt-2">Markers</p>
        </div>

        {/* Sources (seed vs DB) */}
        <div className="bg-bg-3 rounded-xl border border-line p-5">
          <p className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">
            Sources
          </p>
          <p
            className="font-mono text-[40px] font-medium text-text leading-none mt-2"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {stats.seedCount}
          </p>
          <p className="text-[13px] text-text-dim mt-2">
            Seeded
            <span className="text-text-faint"> &middot; </span>
            <span
              className="font-mono font-medium text-gold-brand"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {stats.dbCount}
            </span>{' '}
            DB
          </p>
        </div>

        {/* With norms */}
        <div className="bg-bg-3 rounded-xl border border-line p-5">
          <p className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">
            With norms
          </p>
          <p
            className="font-mono text-[40px] font-medium text-text leading-none mt-2"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {stats.withNormsCount}
          </p>
          <p className="text-[13px] text-text-dim mt-2">Rated markers</p>
        </div>

        {/* With content */}
        <div className="bg-bg-3 rounded-xl border border-line p-5">
          <p className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">
            With content
          </p>
          <p
            className="font-mono text-[40px] font-medium text-status-good leading-none mt-2"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {stats.withContentCount}
          </p>
          <p className="text-[13px] text-text-dim mt-2">Authored</p>
        </div>
      </div>

      {/* Per-section breakdown - horizontally scrollable strip on mobile */}
      <div className="mt-4 -mx-1 overflow-x-auto">
        <div className="flex gap-2 px-1 min-w-max sm:grid sm:grid-cols-5 sm:min-w-0 lg:grid-cols-10">
          {stats.perSection.map((row) => (
            <div
              key={row.section}
              title={row.label}
              className="flex-shrink-0 w-[88px] sm:w-auto rounded-lg border border-line bg-bg-3 px-3 py-2.5"
            >
              <p className="font-mono text-[10px] font-medium text-text-faint uppercase tracking-[0.16em]">
                S{row.section}
              </p>
              <p
                className="font-mono text-[20px] font-medium text-text leading-none mt-1"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {row.total}
              </p>
              <p
                className="font-mono text-[11px] text-text-dim mt-1.5"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                <span className="text-text-dim">{row.withNorms}N</span>
                <span className="text-text-faint"> </span>
                <span className="text-status-good">{row.withContent}C</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
