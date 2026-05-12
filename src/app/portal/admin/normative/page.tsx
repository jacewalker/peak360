'use client';

import { useState, useEffect, useCallback } from 'react';
import { REPORT_MARKERS, REPORT_CATEGORIES } from '@/lib/report-markers';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import NormativeEditPanel from '@/components/admin/NormativeEditPanel';

type FilterMode = 'all' | 'db_overrides' | 'hardcoded';

function StatusPill({ hasNorms, isDbOverride }: { hasNorms: boolean; isDbOverride: boolean }) {
  if (isDbOverride) {
    return (
      <span className="font-mono text-[11px] font-medium px-2 py-0.5 rounded-full bg-gold-brand/10 text-gold-brand border border-gold-brand/30 uppercase tracking-[0.16em]">
        DB
      </span>
    );
  }
  if (hasNorms) {
    return (
      <span className="font-mono text-[11px] font-medium px-2 py-0.5 rounded-full bg-bg-2 text-text-dim border border-line uppercase tracking-[0.16em]">
        HC
      </span>
    );
  }
  return (
    <span className="font-mono text-[11px] font-medium px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/30 uppercase tracking-[0.16em]">
      —
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>
          <div className="animate-pulse h-5 bg-line rounded w-40 mb-3" />
          <div className="space-y-1.5">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="animate-pulse h-11 bg-line rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NormativeBrowserPage() {
  const [dbOverrideKeys, setDbOverrideKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [panelVisible, setPanelVisible] = useState(false);

  const fetchOverrides = useCallback(() => {
    fetch('/api/admin/normative')
      .then(res => res.json())
      .then(json => {
        if (json.success) setDbOverrideKeys(new Set(json.data.overrideKeys as string[]));
        else setError(json.error || 'Could not load normative data.');
        setLoading(false);
      })
      .catch(() => { setError('Could not load normative data. Refresh to try again.'); setLoading(false); });
  }, []);

  useEffect(() => { fetchOverrides(); }, [fetchOverrides]);

  // Animate panel open/close with a frame delay so CSS transition fires
  const openPanel = (markerKey: string) => {
    setSelectedMarker(markerKey);
    // Small delay so the marker key is set before the panel becomes visible
    requestAnimationFrame(() => setPanelVisible(true));
  };

  const closePanel = () => {
    setPanelVisible(false);
    // Wait for the close transition before removing the marker
    setTimeout(() => setSelectedMarker(null), 300);
  };

  const filteredMarkers = REPORT_MARKERS.filter(m => {
    if (searchQuery && !m.label.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterMode === 'db_overrides') return dbOverrideKeys.has(m.testKey);
    if (filterMode === 'hardcoded') return m.hasNorms && !dbOverrideKeys.has(m.testKey);
    return true;
  });

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100vh' }}>
      <AdminPageHeader
        title="Normative Ranges"
        breadcrumb="Normative Ranges"
        description="Manage rating thresholds for biomarkers and fitness tests. DB overrides take precedence over hardcoded defaults."
        eyebrow="ADMIN · NORMATIVE"
      />

      {/* Split-panel content area — min-h-0 is critical: lets flex children shrink below content size so overflow-y-auto activates */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT: Marker list (scrolls independently) ── */}
        <div
          className="overflow-y-auto min-h-0 bg-bg flex-shrink-0"
          style={{
            width: panelVisible ? '50%' : '100%',
            transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Sticky search + filter bar */}
          <div className="sticky top-0 z-10 bg-bg border-b border-line px-6 py-3 flex gap-3">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none"
                fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search markers…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-line rounded-xl text-[13px] bg-bg-3 text-text placeholder:text-text-faint focus:border-gold-brand outline-none transition-colors"
              />
            </div>
            <select
              value={filterMode}
              onChange={e => setFilterMode(e.target.value as FilterMode)}
              className="px-3 py-2 border border-line rounded-xl text-[13px] bg-bg-3 text-text font-medium focus:outline-none focus:border-gold-brand transition-colors"
            >
              <option value="all">All</option>
              <option value="db_overrides">DB Overrides</option>
              <option value="hardcoded">Hardcoded</option>
            </select>
          </div>

          {/* List content */}
          <div className="px-6 py-5">
            {loading && <LoadingSkeleton />}

            {error && (
              <div className="p-4 bg-danger/10 text-danger rounded-xl text-[13px] border border-danger/30">{error}</div>
            )}

            {!loading && !error && REPORT_CATEGORIES.map(cat => {
              const markers = filteredMarkers.filter(m => m.category === cat);
              if (markers.length === 0) return null;
              const dbCount = markers.filter(m => dbOverrideKeys.has(m.testKey)).length;

              return (
                <section key={cat} className="mb-7">
                  {/* Category header */}
                  <div className="flex items-center gap-3 mb-2.5">
                    <h2 className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">{cat}</h2>
                    <div className="flex-1 h-px bg-line" />
                    <span className="font-mono text-[11px] text-text-dim tabular-nums">{markers.length}</span>
                    {dbCount > 0 && (
                      <span className="font-mono text-[11px] font-medium text-gold-brand">{dbCount} DB</span>
                    )}
                  </div>

                  {/* Marker rows */}
                  <div className="space-y-1">
                    {markers.map(m => {
                      const isSelected = selectedMarker === m.testKey;
                      return (
                        <button
                          key={m.testKey}
                          onClick={() => isSelected ? closePanel() : openPanel(m.testKey)}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all duration-150 group ${
                            isSelected
                              ? 'border-gold-brand/50 bg-gold-brand/10 shadow-sm'
                              : 'border-line bg-bg-3 hover:border-gold-brand/30 hover:bg-bg-2'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Selected indicator */}
                            <span
                              className={`flex-shrink-0 w-1 h-5 rounded-full transition-all duration-150 ${
                                isSelected ? 'bg-gold-brand' : 'bg-transparent group-hover:bg-line'
                              }`}
                            />
                            <span className={`text-sm font-semibold truncate transition-colors ${
                              isSelected ? 'text-gold-brand' : 'text-text group-hover:text-text'
                            }`}>
                              {m.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            <StatusPill hasNorms={m.hasNorms} isDbOverride={dbOverrideKeys.has(m.testKey)} />
                            {/* Chevron */}
                            <svg
                              className={`w-4 h-4 transition-all duration-150 ${
                                isSelected ? 'text-gold-brand rotate-90' : 'text-text-faint group-hover:text-text-dim'
                              }`}
                              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {!loading && !error && filteredMarkers.length === 0 && (
              <div className="text-center py-14">
                <div className="w-11 h-11 rounded-2xl bg-line flex items-center justify-center mx-auto mb-3">
                  <svg className="w-5 h-5 text-text-faint" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <h3 className="text-[20px] font-medium text-text mb-1 tracking-[-0.015em]">No markers found</h3>
                <p className="text-[13px] text-text-dim">
                  {searchQuery ? `No results for "${searchQuery}"` : 'No DB overrides yet — all markers use hardcoded defaults.'}
                </p>
              </div>
            )}

            <p className="font-mono text-[11px] text-text-faint mt-8 pb-6">
              Ranges are versioned automatically. Existing assessments keep the ranges they were created with.
            </p>
          </div>
        </div>

        {/* ── RIGHT: Edit panel (fixed height, internal scroll handled by NormativeEditPanel) ── */}
        <div
          className="flex-shrink-0 min-h-0 overflow-hidden border-l border-line"
          style={{
            width: panelVisible ? '50%' : '0%',
            opacity: panelVisible ? 1 : 0,
            transform: panelVisible ? 'translateX(0)' : 'translateX(8px)',
            transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 250ms ease, transform 300ms ease',
          }}
        >
          {selectedMarker && (
            <NormativeEditPanel
              key={selectedMarker}
              markerKey={selectedMarker}
              onClose={closePanel}
              onSaved={fetchOverrides}
            />
          )}
        </div>
      </div>
    </div>
  );
}
