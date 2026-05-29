'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { RegistryMarker } from '@/lib/markers/registry';
import {
  SECTION_LABELS,
  ORDERED_SECTIONS,
  computeMarkerStats,
  type MarkerStats,
} from '@/lib/markers/stats';
import MarkersStatsBar from './MarkersStatsBar';
import RangesEditModal from '@/components/admin/RangesEditModal';
import ContentEditModal from '@/components/admin/ContentEditModal';

const EMPTY_STATS: MarkerStats = {
  total: 0,
  seedCount: 0,
  dbCount: 0,
  withNormsCount: 0,
  withContentCount: 0,
  perSection: ORDERED_SECTIONS.map((section) => ({
    section,
    label: SECTION_LABELS[section] || `Section ${section}`,
    total: 0,
    seed: 0,
    db: 0,
    withNorms: 0,
    withContent: 0,
  })),
};

/**
 * Phase 12 + Quick 260529-mwp - Client-side marker registry browser.
 *
 * Loads the merged registry (seed + DB) via GET /api/markers?include=stats and
 * groups markers into section accordions that are COLLAPSED by default. Each
 * accordion header is a large full-row click + keyboard target with a rotating
 * gold chevron and a marker-count chip. A typed search query auto-expands any
 * section that has a match while preserving the admin's manual collapse state
 * once the query is cleared.
 *
 * Seeded markers expose inline Ranges/Content edit buttons that open centered
 * Dialog modals (save without leaving the page). DB markers keep their
 * full-page Edit affordance and the two-click inline delete confirm.
 */
export default function MarkersList() {
  const [markers, setMarkers] = useState<RegistryMarker[]>([]);
  const [normsKeys, setNormsKeys] = useState<string[]>([]);
  const [contentKeys, setContentKeys] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // Manual accordion state. Empty set => every section collapsed on first paint.
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  // Inline edit modal selection (centered Dialogs that save without leaving the page).
  const [rangesModalKey, setRangesModalKey] = useState<{ key: string; label: string } | null>(null);
  const [contentModalKey, setContentModalKey] = useState<{
    key: string;
    label: string;
    category?: string;
    subcategory?: string;
  } | null>(null);

  // Load markers + stats keys on mount and whenever reloadTick changes.
  // Set-state inside the effect happens only via the async .then/.catch
  // callbacks, never synchronously (avoids react-hooks/set-state-in-effect).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/markers?include=stats')
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.success) {
          setMarkers(j.data.markers as RegistryMarker[]);
          setNormsKeys((j.data.normsKeys as string[]) ?? []);
          setContentKeys((j.data.contentKeys as string[]) ?? []);
        } else {
          setError(j.error || 'Could not load markers.');
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not load markers. Refresh to try again.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const reload = () => setReloadTick((n) => n + 1);

  // Auto-clear pending confirm after 5s so a stray click doesn't linger.
  useEffect(() => {
    if (!confirmDeleteKey) return;
    const t = setTimeout(() => setConfirmDeleteKey(null), 5000);
    return () => clearTimeout(t);
  }, [confirmDeleteKey]);

  const q = query.trim().toLowerCase();

  const stats = useMemo(
    () => computeMarkerStats({ markers, normsKeys, contentKeys }),
    [markers, normsKeys, contentKeys]
  );

  // Group by section (filtered by query) and compute the auto-expand set:
  // every section that currently holds a match while a query is active. When
  // the query is cleared, autoExpand is empty so only the admin's manual
  // expandedSections remain - manual collapse state is preserved.
  const { grouped, autoExpand } = useMemo(() => {
    const matches = (m: RegistryMarker) => {
      if (!q) return true;
      return (
        m.label.toLowerCase().includes(q) ||
        m.testKey.toLowerCase().includes(q) ||
        (m.subcategory?.toLowerCase().includes(q) ?? false) ||
        m.category.toLowerCase().includes(q)
      );
    };
    const groups = ORDERED_SECTIONS.map((sec) => ({
      section: sec,
      markers: markers.filter((m) => m.section === sec && matches(m)),
    })).filter((g) => g.markers.length > 0);

    const auto = new Set<number>();
    if (q) {
      for (const g of groups) auto.add(g.section);
    }
    return { grouped: groups, autoExpand: auto };
  }, [markers, q]);

  const total = grouped.reduce((n, g) => n + g.markers.length, 0);

  const toggleSection = (section: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleDeleteClick = async (testKey: string) => {
    if (confirmDeleteKey !== testKey) {
      setConfirmDeleteKey(testKey);
      setDeleteError(null);
      return;
    }
    setDeletingKey(testKey);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/markers/${testKey}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setDeleteError(json.error || 'Could not delete marker.');
        setDeletingKey(null);
        return;
      }
      setConfirmDeleteKey(null);
      setDeletingKey(null);
      reload();
    } catch {
      setDeleteError('Could not delete marker. Check your connection and try again.');
      setDeletingKey(null);
    }
  };

  if (loading) {
    return (
      <div>
        {/* Placeholder stats bar (skeleton) so the page does not jump on hydrate */}
        <div className="mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse h-[116px] bg-line rounded-xl" />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-5 lg:grid-cols-10 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse h-[76px] bg-line rounded-lg" />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse h-14 bg-line rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-danger/10 text-danger rounded-xl text-[13px] border border-danger/30">
        {error}
      </div>
    );
  }

  return (
    <>
      {/* Registry analytics */}
      <MarkersStatsBar stats={stats || EMPTY_STATS} />

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
            placeholder="Search markers by name, key, or category..."
            aria-label="Search markers"
            className="w-full rounded-xl border border-line bg-bg-3 pl-10 pr-3 py-2.5 text-sm text-text placeholder:text-text-faint focus:outline-none focus:border-gold-brand/60 focus:ring-1 focus:ring-gold-brand/30 transition-colors"
          />
        </div>
        {q && (
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint">
            {total} {total === 1 ? 'marker' : 'markers'} match &ldquo;{query.trim()}&rdquo;
          </p>
        )}
      </div>

      {deleteError && (
        <div className="mb-6 p-3 bg-danger/10 text-danger rounded-xl text-[13px] border border-danger/30">
          {deleteError}
        </div>
      )}

      {grouped.length === 0 ? (
        <div className="rounded-xl border border-line bg-bg-3 px-4 py-10 text-center">
          <p className="text-sm text-text-dim">
            {q ? `No markers match "${query.trim()}".` : 'No markers in the registry yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ section, markers: sectionMarkers }) => {
            const dbCount = sectionMarkers.filter((m) => m.source === 'db').length;
            const isExpanded = expandedSections.has(section) || autoExpand.has(section);
            const panelId = `section-${section}-panel`;
            return (
              <section key={section} className="rounded-xl border border-line bg-bg-3 overflow-hidden">
                {/* Accordion header - full-row click + keyboard target */}
                <button
                  type="button"
                  onClick={() => toggleSection(section)}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                  className="group w-full min-h-[64px] sm:min-h-[56px] flex items-center gap-3 px-4 sm:px-5 py-3 text-left hover:bg-bg-2 hover:border-gold-brand/40 border border-transparent rounded-xl transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-brand/40"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[11px] font-medium text-text uppercase tracking-[0.18em] group-hover:text-gold-brand transition-colors">
                      {SECTION_LABELS[section] || `Section ${section}`}
                    </span>
                  </div>

                  {/* Count chip - wraps below title room is tight; flex-shrink-0 keeps it tidy */}
                  <span className="flex-shrink-0 inline-flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded-full border border-line bg-bg tabular-nums">
                    <span className="text-text-dim">
                      {sectionMarkers.length} {sectionMarkers.length === 1 ? 'marker' : 'markers'}
                    </span>
                    {dbCount > 0 && (
                      <>
                        <span className="text-text-faint">&middot;</span>
                        <span className="font-medium text-gold-brand">{dbCount} DB</span>
                      </>
                    )}
                  </span>

                  {/* Chevron - rotates 180deg when expanded */}
                  <svg
                    className={`flex-shrink-0 w-6 h-6 text-gold-brand transition-transform duration-200 motion-safe:transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {/* Panel - uses hidden (not conditional render) to avoid first-open jank */}
                <div id={panelId} hidden={!isExpanded} className="px-3 sm:px-4 pb-4 pt-1 space-y-1.5">
                  {sectionMarkers.map((m) => {
                    const isSeed = m.source === 'seed';
                    const isConfirming = confirmDeleteKey === m.testKey;
                    const isDeleting = deletingKey === m.testKey;
                    return (
                      <div
                        key={m.testKey}
                        className="group/row flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-line bg-bg hover:border-gold-brand/30 transition-colors duration-150"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-text truncate">{m.label}</span>
                            {isSeed ? (
                              <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-bg-2 text-text-faint border border-line uppercase tracking-[0.16em]">
                                SEEDED
                              </span>
                            ) : (
                              <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-gold-brand/10 text-gold-brand border border-gold-brand/30 uppercase tracking-[0.16em]">
                                DB
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-text-faint">
                            <span className="font-mono">{m.testKey}</span>
                            <span>&middot;</span>
                            <span>{m.category}</span>
                            {m.subcategory && (
                              <>
                                <span>&middot;</span>
                                <span>{m.subcategory}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isSeed ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setRangesModalKey({ key: m.testKey, label: m.label })}
                                className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint hover:text-gold-brand transition-colors px-2 py-1"
                              >
                                Ranges
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setContentModalKey({
                                    key: m.testKey,
                                    label: m.label,
                                    category: m.category,
                                    subcategory: m.subcategory,
                                  })
                                }
                                className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint hover:text-gold-brand transition-colors px-2 py-1"
                              >
                                Content
                              </button>
                            </>
                          ) : (
                            <>
                              <Link
                                href={`/portal/admin/markers/${m.testKey}`}
                                className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-dim hover:text-gold-brand transition-colors px-2 py-1 border border-line rounded hover:border-gold-brand/40"
                              >
                                Edit
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(m.testKey)}
                                disabled={isDeleting}
                                className={`font-mono text-[11px] uppercase tracking-[0.14em] px-2 py-1 border rounded transition-colors ${
                                  isConfirming
                                    ? 'text-danger border-danger/50 bg-danger/10 hover:bg-danger/20'
                                    : 'text-text-faint border-line hover:text-danger hover:border-danger/40'
                                } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {isDeleting
                                  ? 'Deleting...'
                                  : isConfirming
                                  ? 'Confirm delete'
                                  : 'Delete'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Inline ranges editor - opens centered, refreshes stats on save. The
          legacy full-page editor at /portal/admin/normative/[marker] stays live. */}
      {rangesModalKey && (
        <RangesEditModal
          markerKey={rangesModalKey.key}
          markerLabel={rangesModalKey.label}
          onClose={() => setRangesModalKey(null)}
          onSaved={reload}
        />
      )}

      {/* Inline content editor - opens centered, refreshes stats on save. The
          legacy full-page editor at /portal/admin/marker-content/[marker] stays live. */}
      {contentModalKey && (
        <ContentEditModal
          markerKey={contentModalKey.key}
          markerLabel={contentModalKey.label}
          markerCategory={contentModalKey.category}
          markerSubcategory={contentModalKey.subcategory}
          onClose={() => setContentModalKey(null)}
          onSaved={reload}
        />
      )}
    </>
  );
}
