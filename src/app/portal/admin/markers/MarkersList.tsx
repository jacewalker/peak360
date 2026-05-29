'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { RegistryMarker } from '@/lib/markers/registry';

const SECTION_LABELS: Record<number, string> = {
  1: 'Section 1 - Client Information',
  2: 'Section 2 - Daily Readiness',
  3: 'Section 3 - Medical Screening',
  4: 'Section 4 - Informed Consent',
  5: 'Section 5 - Blood Tests & Biomarkers',
  6: 'Section 6 - Body Composition',
  7: 'Section 7 - Cardiovascular Fitness',
  8: 'Section 8 - Strength Testing',
  9: 'Section 9 - Mobility & Flexibility',
  10: 'Section 10 - Balance & Power',
};

const ORDERED_SECTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Phase 12 - Client-side marker registry browser.
 *
 * Loads the merged registry (seed + DB) via GET /api/markers and groups
 * markers by section. Seeded markers show a SEEDED badge and link to the
 * existing normative + marker-content editors. DB markers show edit and
 * delete affordances (delete uses a two-click inline confirm).
 */
export default function MarkersList() {
  const [markers, setMarkers] = useState<RegistryMarker[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // Load markers on mount and whenever reloadTick changes (post-delete refresh).
  // Set-state inside the effect happens only via the async .then/.catch
  // callbacks, never synchronously (avoids react-hooks/set-state-in-effect).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/markers')
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.success) {
          setMarkers(j.data.markers as RegistryMarker[]);
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

  const grouped = useMemo(() => {
    const matches = (m: RegistryMarker) => {
      if (!q) return true;
      return (
        m.label.toLowerCase().includes(q) ||
        m.testKey.toLowerCase().includes(q) ||
        (m.subcategory?.toLowerCase().includes(q) ?? false) ||
        m.category.toLowerCase().includes(q)
      );
    };
    return ORDERED_SECTIONS.map((sec) => ({
      section: sec,
      markers: markers.filter((m) => m.section === sec && matches(m)),
    })).filter((g) => g.markers.length > 0);
  }, [markers, q]);

  const total = grouped.reduce((n, g) => n + g.markers.length, 0);

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
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse h-12 bg-line rounded-xl" />
        ))}
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
        grouped.map(({ section, markers: sectionMarkers }) => {
          const dbCount = sectionMarkers.filter((m) => m.source === 'db').length;
          return (
            <section key={section} className="mb-9">
              {/* Section header */}
              <div className="flex items-center gap-3 mb-3">
                <h2 className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">
                  {SECTION_LABELS[section] || `Section ${section}`}
                </h2>
                <div className="flex-1 h-px bg-line" />
                <span className="font-mono text-[11px] text-text-dim tabular-nums">
                  {sectionMarkers.length}
                </span>
                {dbCount > 0 && (
                  <span className="font-mono text-[11px] font-medium text-gold-brand">
                    {dbCount} DB
                  </span>
                )}
              </div>

              {/* Marker rows */}
              <div className="space-y-1.5">
                {sectionMarkers.map((m) => {
                  const isSeed = m.source === 'seed';
                  const isConfirming = confirmDeleteKey === m.testKey;
                  const isDeleting = deletingKey === m.testKey;
                  return (
                    <div
                      key={m.testKey}
                      className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-line bg-bg-3 hover:border-gold-brand/30 transition-colors duration-150"
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
                            <Link
                              href={`/portal/admin/normative/${m.testKey}`}
                              className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint hover:text-gold-brand transition-colors px-2 py-1"
                            >
                              Ranges
                            </Link>
                            <Link
                              href={`/portal/admin/marker-content/${m.testKey}`}
                              className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint hover:text-gold-brand transition-colors px-2 py-1"
                            >
                              Content
                            </Link>
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
        })
      )}
    </>
  );
}
