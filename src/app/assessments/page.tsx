'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Assessment } from '@/types/assessment';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';

interface ImportResult {
  imported: number;
  assessments: { sourceId: string; newId: string; clientName: string }[];
  errors: string[];
  warnings: string[];
}

export default function HomePage() {
  const router = useRouter();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [importState, setImportState] = useState<'idle' | 'uploading' | 'done'>('idle');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const fetchAssessments = useCallback(async () => {
    try {
      const r = await fetch('/api/assessments');
      const res = await r.json();
      setAssessments(res.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  // Clear selection when search changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [search]);

  const createAssessment = async () => {
    const res = await fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const { data } = await res.json();
    router.push(`/assessment/${data.id}/section/1`);
  };

  const deleteAssessment = async (id: string) => {
    await fetch(`/api/assessments/${id}`, { method: 'DELETE' });
    setAssessments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleImport = async (file: File) => {
    setImportState('uploading');
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/assessments/import', { method: 'POST', body: formData });
      const json = await res.json();
      setImportResult(json.data);
      setImportState('done');
      // Refresh assessment list
      const listRes = await fetch('/api/assessments');
      const listJson = await listRes.json();
      setAssessments(listJson.data || []);
    } catch {
      setImportResult({ imported: 0, assessments: [], errors: ['Upload failed'], warnings: [] });
      setImportState('done');
    }
  };

  const completedCount = assessments.filter((a) => a.status === 'completed').length;
  const inProgressCount = assessments.filter((a) => a.status !== 'completed').length;

  const filtered = useMemo(() => {
    if (!search.trim()) return assessments;
    const q = search.toLowerCase();
    return assessments.filter((a) =>
      (a.clientName || '').toLowerCase().includes(q)
    );
  }, [assessments, search]);

  // Indeterminate state for select-all checkbox
  useEffect(() => {
    if (selectAllRef.current) {
      const allSelected = selectedIds.size === filtered.length && filtered.length > 0;
      const someSelected = selectedIds.size > 0 && selectedIds.size < filtered.length;
      selectAllRef.current.indeterminate = someSelected;
      selectAllRef.current.checked = allSelected;
    }
  }, [selectedIds, filtered]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((a) => a.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    try {
      await fetch('/api/assessments/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      setSelectedIds(new Set());
      setShowDeleteModal(false);
      await fetchAssessments();
    } catch {
      // error handled by modal
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero section */}
      <div className="bg-gradient-to-b from-navy-dark to-navy py-10 sm:py-16 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="text-white/80">11-Section Comprehensive Evaluation</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">
            Complete Longevity Assessment
          </h2>
          <p className="text-white/70 max-w-xl mx-auto text-base sm:text-lg leading-relaxed mb-8">
            Body composition, cardiovascular fitness, strength, mobility, biomarkers &mdash; all in one place.
          </p>
          <button
            onClick={createAssessment}
            className="px-8 py-3.5 bg-gold text-navy font-bold rounded-lg hover:bg-gold-light transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-base"
          >
            + New Assessment
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {loading ? (
          <div className="text-center text-muted py-12">
            <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading assessments...
          </div>
        ) : assessments.length === 0 ? (
          <div className="space-y-5">
            {/* Export / Import toolbar */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { window.location.href = '/api/assessments/export'; }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-navy/20 text-navy bg-white hover:bg-navy/5 transition-colors"
              >
                Export CSV
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importState === 'uploading'}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-navy/20 text-navy bg-white hover:bg-navy/5 transition-colors disabled:opacity-50"
              >
                {importState === 'uploading' ? 'Importing...' : 'Import CSV'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                  e.target.value = '';
                }}
              />
            </div>

            {/* Import results */}
            {importResult && (
              <div className="bg-white rounded-xl border border-border p-4 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-navy">
                    Imported {importResult.imported} assessment{importResult.imported !== 1 ? 's' : ''}
                  </span>
                  <button onClick={() => { setImportResult(null); setImportState('idle'); }} className="text-muted hover:text-foreground text-xs">
                    Dismiss
                  </button>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="text-red-600">
                    {importResult.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
                {importResult.warnings.length > 0 && (
                  <div className="text-gold">
                    {importResult.warnings.map((w, i) => <p key={i}>{w}</p>)}
                  </div>
                )}
              </div>
            )}

            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-surface-alt flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-muted">&#9776;</span>
              </div>
              <p className="text-lg text-foreground mb-1">No assessments yet</p>
              <p className="text-sm text-muted">Click &quot;New Assessment&quot; above to get started.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Metrics bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-bold text-navy">{assessments.length}</p>
                <p className="text-xs text-muted font-medium mt-0.5">Total</p>
              </div>
              <div className="bg-white rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
                <p className="text-xs text-muted font-medium mt-0.5">Completed</p>
              </div>
              <div className="bg-white rounded-xl border border-border p-4 text-center">
                <p className="text-2xl font-bold text-gold">{inProgressCount}</p>
                <p className="text-xs text-muted font-medium mt-0.5">In Progress</p>
              </div>
            </div>

            {/* Export / Import / Bulk toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-muted">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="w-4 h-4 rounded border-border text-navy accent-navy"
                  onChange={toggleSelectAll}
                />
                Select all
              </label>
              <div className="w-px h-5 bg-border" />
              <button
                onClick={() => { window.location.href = '/api/assessments/export'; }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-navy/20 text-navy bg-white hover:bg-navy/5 transition-colors"
              >
                Export CSV
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importState === 'uploading'}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-navy/20 text-navy bg-white hover:bg-navy/5 transition-colors disabled:opacity-50"
              >
                {importState === 'uploading' ? 'Importing...' : 'Import CSV'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImport(file);
                  e.target.value = '';
                }}
              />
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors ml-auto"
                >
                  Delete {selectedIds.size} selected
                </button>
              )}
            </div>

            {/* Import results */}
            {importResult && (
              <div className="bg-white rounded-xl border border-border p-4 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-navy">
                    Imported {importResult.imported} assessment{importResult.imported !== 1 ? 's' : ''}
                  </span>
                  <button onClick={() => { setImportResult(null); setImportState('idle'); }} className="text-muted hover:text-foreground text-xs">
                    Dismiss
                  </button>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="text-red-600">
                    {importResult.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                )}
                {importResult.warnings.length > 0 && (
                  <div className="text-gold">
                    {importResult.warnings.map((w, i) => <p key={i}>{w}</p>)}
                  </div>
                )}
              </div>
            )}

            {/* Search + header */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by client name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/10 transition-all"
                />
              </div>
              <span className="text-sm text-muted whitespace-nowrap">
                {filtered.length === assessments.length
                  ? `${assessments.length} total`
                  : `${filtered.length} of ${assessments.length}`}
              </span>
            </div>

            {/* Assessment list */}
            {filtered.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted">No assessments match &quot;{search}&quot;</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white rounded-xl border border-border p-4 sm:p-5 flex items-center justify-between hover:shadow-md hover:border-gold/30 transition-all cursor-pointer group"
                    onClick={() =>
                      router.push(`/assessment/${a.id}/section/${a.currentSection}`)
                    }
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-border text-navy accent-navy"
                          checked={selectedIds.has(a.id)}
                          onChange={() => toggleSelectOne(a.id)}
                        />
                      </div>
                      <div className="w-10 h-10 rounded-full bg-navy/5 flex items-center justify-center text-navy font-bold text-sm group-hover:bg-gold/10 transition-colors shrink-0">
                        {(a.clientName || 'U')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-navy group-hover:text-navy-light transition-colors truncate">
                          {a.clientName || 'Unnamed Client'}
                        </div>
                        <div className="text-sm text-muted flex items-center gap-1 sm:gap-2 flex-wrap">
                          <span>{a.assessmentDate || a.createdAt.split('T')[0]}</span>
                          <span className="text-border">&bull;</span>
                          <span>Section {a.currentSection}/11</span>
                          <span className="text-border hidden sm:inline">&bull;</span>
                          <span
                            className={`hidden sm:inline ${
                              a.status === 'completed' ? 'text-rating-elite' : 'text-gold'
                            }`}
                          >
                            {a.status === 'completed' ? 'Completed' : 'In Progress'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this assessment?')) deleteAssessment(a.id);
                      }}
                      className="px-3 py-1.5 text-sm text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        itemCount={selectedIds.size}
        itemLabel="assessment"
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
