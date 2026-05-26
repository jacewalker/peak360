'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { REPORT_MARKERS, REPORT_CATEGORIES } from '@/lib/report-markers';

/**
 * Phase 11 — client-side search + category-grouped marker list.
 *
 * Split out of the SSR page so the admin can filter markers by name, category,
 * or subcategory before opening an editor. Filtering is purely presentational
 * over the static REPORT_MARKERS set; the SSR admin gate stays in page.tsx.
 */
export default function MarkerContentList() {
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  const grouped = useMemo(() => {
    return REPORT_CATEGORIES.map((cat) => {
      const markers = REPORT_MARKERS.filter((m) => {
        if (m.category !== cat) return false;
        if (!q) return true;
        return (
          m.label.toLowerCase().includes(q) ||
          m.testKey.toLowerCase().includes(q) ||
          (m.subcategory?.toLowerCase().includes(q) ?? false) ||
          m.category.toLowerCase().includes(q)
        );
      });
      return { cat, markers };
    }).filter((g) => g.markers.length > 0);
  }, [q]);

  const total = grouped.reduce((n, g) => n + g.markers.length, 0);

  return (
    <>
      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search markers by name or category…"
            aria-label="Search markers"
            className="w-full rounded-xl border border-line bg-bg-3 pl-10 pr-3 py-2.5 text-sm text-text placeholder:text-text-faint focus:outline-none focus:border-gold-brand/60 focus:ring-1 focus:ring-gold-brand/30 transition-colors"
          />
        </div>
        {q && (
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint">
            {total} {total === 1 ? 'marker' : 'markers'} match “{query.trim()}”
          </p>
        )}
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-xl border border-line bg-bg-3 px-4 py-10 text-center">
          <p className="text-sm text-text-dim">No markers match “{query.trim()}”.</p>
        </div>
      ) : (
        grouped.map(({ cat, markers }) => (
          <section key={cat} className="mb-9">
            {/* Category header */}
            <div className="flex items-center gap-3 mb-3">
              <h2 className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">
                {cat}
              </h2>
              <div className="flex-1 h-px bg-line" />
              <span className="font-mono text-[11px] text-text-dim tabular-nums">{markers.length}</span>
            </div>

            {/* Marker rows */}
            <div className="space-y-1.5">
              {markers.map((m) => (
                <Link
                  key={m.testKey}
                  href={`/portal/admin/marker-content/${m.testKey}`}
                  className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-line bg-bg-3 hover:border-gold-brand/40 hover:bg-bg-2 transition-colors duration-150"
                >
                  <div className="min-w-0">
                    <span className="block text-sm font-medium text-text truncate group-hover:text-gold-brand transition-colors">
                      {m.label}
                    </span>
                    {m.subcategory && (
                      <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint mt-0.5">
                        {m.subcategory}
                      </span>
                    )}
                  </div>
                  <svg
                    className="w-4 h-4 flex-none text-text-faint group-hover:text-gold-brand transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}
