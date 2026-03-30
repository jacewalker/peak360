'use client';

import { useState, useEffect } from 'react';
import { REPORT_MARKERS, REPORT_CATEGORIES } from '@/lib/report-markers';

type FilterMode = 'all' | 'db_overrides' | 'hardcoded';

function StatusPill({
  hasNorms,
  isDbOverride,
}: {
  testKey: string;
  hasNorms: boolean;
  isDbOverride: boolean;
}) {
  if (isDbOverride) {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-gold/10 text-gold font-bold">
        DB override
      </span>
    );
  }
  if (hasNorms) {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 font-bold">
        Hardcoded
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-500 font-bold">
      No ranges
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i}>
          <div className="animate-pulse h-7 bg-gray-200 rounded w-48 mb-3" />
          <div className="grid gap-2">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="animate-pulse h-12 bg-gray-200 rounded-lg" />
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

  useEffect(() => {
    fetch('/api/admin/normative')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setDbOverrideKeys(new Set(json.data.overrideKeys as string[]));
        } else {
          setError(json.error || 'Could not load normative data. Refresh the page to try again.');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load normative data. Refresh the page to try again.');
        setLoading(false);
      });
  }, []);

  const filteredMarkers = REPORT_MARKERS.filter((m) => {
    if (searchQuery && !m.label.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterMode === 'db_overrides') {
      return dbOverrideKeys.has(m.testKey);
    }
    if (filterMode === 'hardcoded') {
      return m.hasNorms && !dbOverrideKeys.has(m.testKey);
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-navy mb-6">Normative Range Management</h1>

      <div className="sticky top-0 z-10 bg-background pb-4 flex gap-3">
        <input
          type="text"
          placeholder="Search markers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none"
        />
        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value as FilterMode)}
          className="px-3 py-2 border border-border rounded-lg text-sm"
        >
          <option value="all">All Markers</option>
          <option value="db_overrides">DB Overrides Only</option>
          <option value="hardcoded">Hardcoded Only</option>
        </select>
      </div>

      {loading && <LoadingSkeleton />}

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}

      {!loading &&
        !error &&
        REPORT_CATEGORIES.map((cat) => {
          const markers = filteredMarkers.filter((m) => m.category === cat);
          if (markers.length === 0) return null;
          const dbCount = markers.filter((m) => dbOverrideKeys.has(m.testKey)).length;
          return (
            <section key={cat} className="mb-8">
              <div className="flex items-center gap-3 border-b border-border pb-2 mb-3">
                <h2 className="text-xl font-bold text-navy">{cat}</h2>
                <span className="text-xs text-muted">
                  {markers.length} marker{markers.length !== 1 ? 's' : ''}
                </span>
                {dbCount > 0 && (
                  <span className="text-xs text-muted">
                    {dbCount} with DB overrides
                  </span>
                )}
              </div>
              <div className="grid gap-2">
                {markers.map((m) => (
                  <a
                    key={m.testKey}
                    href={`/admin/normative/${m.testKey}`}
                    className="flex justify-between items-center p-3 bg-surface border border-border rounded-lg hover:border-gold transition-colors"
                  >
                    <span className="text-sm font-bold text-navy">{m.label}</span>
                    <StatusPill
                      testKey={m.testKey}
                      hasNorms={m.hasNorms}
                      isDbOverride={dbOverrideKeys.has(m.testKey)}
                    />
                  </a>
                ))}
              </div>
            </section>
          );
        })}

      {!loading && !error && filteredMarkers.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-xl font-bold text-navy mb-2">No DB Overrides Yet</h3>
          <p className="text-sm text-muted">
            All markers are using hardcoded defaults. Select a marker to customize its ranges.
          </p>
        </div>
      )}

      <p className="text-xs text-muted mt-8">
        Ranges are versioned automatically. Existing assessments keep the ranges they were created
        with.
      </p>
    </div>
  );
}
