'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Assessment } from '@/types/assessment';
import ConfirmDeleteModal from '@/components/ui/ConfirmDeleteModal';
import MonoEyebrow from '@/components/ui/MonoEyebrow';

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
    router.push(`/portal/assessment/${data.id}/section/1`);
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
      {/* Hero */}
      <header className="pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <MonoEyebrow variant="hero" as="div" className="mb-3">
                PORTAL · ASSESSMENTS
              </MonoEyebrow>
              <h1 className="text-[32px] sm:text-[40px] font-medium text-text leading-none tracking-[-0.03em]">
                Assessments
              </h1>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">
                {assessments.length} TOTAL · {completedCount} COMPLETED · {inProgressCount} IN PROGRESS
              </p>
            </div>
            <button
              onClick={createAssessment}
              aria-label="Start new assessment"
              className="bg-gold-brand text-bg hover:bg-champagne text-[13px] font-medium tracking-[0.02em] px-6 py-3 rounded-lg transition-colors whitespace-nowrap"
            >
              Start new assessment
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-6 h-6 border-2 border-gold-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gold-brand">Loading…</p>
          </div>
        ) : assessments.length === 0 ? (
          <div className="space-y-6">
            {/* Export / Import toolbar */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { window.location.href = '/api/assessments/export'; }}
                className="px-4 py-2 text-[13px] font-medium tracking-[0.02em] rounded-lg border border-line-2 text-text hover:border-gold-brand hover:text-gold-brand transition-colors"
              >
                Export CSV
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importState === 'uploading'}
                className="px-4 py-2 text-[13px] font-medium tracking-[0.02em] rounded-lg border border-line-2 text-text hover:border-gold-brand hover:text-gold-brand transition-colors disabled:opacity-50"
              >
                {importState === 'uploading' ? 'Importing…' : 'Import CSV'}
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

            {importResult && (
              <ImportResultBanner result={importResult} onDismiss={() => { setImportResult(null); setImportState('idle'); }} />
            )}

            <div className="bg-bg-3 rounded-xl border border-line p-12 text-center">
              <h3 className="text-[20px] font-medium text-text tracking-[-0.015em]">No assessments in scope.</h3>
              <p className="text-[13px] text-text-dim mt-2 leading-[1.55]">Adjust your filter or create a new assessment.</p>
              <button
                onClick={createAssessment}
                className="mt-6 bg-gold-brand text-bg hover:bg-champagne py-3 px-6 rounded-lg text-[13px] font-medium tracking-[0.02em] transition-colors"
              >
                Start new assessment
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Metrics bar */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-bg-3 rounded-xl border border-line p-5">
                <p className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">Total</p>
                <p className="font-mono text-[40px] font-medium text-text leading-none mt-2" style={{ fontVariantNumeric: 'tabular-nums' }}>{assessments.length}</p>
              </div>
              <div className="bg-bg-3 rounded-xl border border-line p-5">
                <p className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">Completed</p>
                <p className="font-mono text-[40px] font-medium text-status-good leading-none mt-2" style={{ fontVariantNumeric: 'tabular-nums' }}>{completedCount}</p>
              </div>
              <div className="bg-bg-3 rounded-xl border border-line p-5">
                <p className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">In progress</p>
                <p className="font-mono text-[40px] font-medium text-gold-brand leading-none mt-2" style={{ fontVariantNumeric: 'tabular-nums' }}>{inProgressCount}</p>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer text-[13px] text-text-dim">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="w-4 h-4 rounded border-line accent-gold-brand"
                  onChange={toggleSelectAll}
                  aria-label="Select all assessments"
                />
                Select all
              </label>
              <div className="w-px h-5 bg-line" />
              <button
                onClick={() => { window.location.href = '/api/assessments/export'; }}
                className="px-4 py-2 text-[13px] font-medium tracking-[0.02em] rounded-lg border border-line-2 text-text hover:border-gold-brand hover:text-gold-brand transition-colors"
              >
                Export CSV
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importState === 'uploading'}
                className="px-4 py-2 text-[13px] font-medium tracking-[0.02em] rounded-lg border border-line-2 text-text hover:border-gold-brand hover:text-gold-brand transition-colors disabled:opacity-50"
              >
                {importState === 'uploading' ? 'Importing…' : 'Import CSV'}
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
                  aria-label={`Delete ${selectedIds.size} selected assessments`}
                  className="px-4 py-2 text-[13px] font-medium tracking-[0.02em] rounded-lg bg-danger text-bg hover:opacity-90 transition-colors ml-auto"
                >
                  Delete {selectedIds.size} selected
                </button>
              )}
            </div>

            {importResult && (
              <ImportResultBanner result={importResult} onDismiss={() => { setImportResult(null); setImportState('idle'); }} />
            )}

            {/* Search */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by client name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-12 pl-9 pr-4 rounded-lg border border-line bg-bg-3 text-[13px] text-text placeholder:text-text-faint focus:outline-none focus:border-gold-brand transition-colors"
                />
              </div>
              <span className="text-[13px] text-text-dim whitespace-nowrap">
                {filtered.length === assessments.length
                  ? `${assessments.length} total`
                  : `${filtered.length} of ${assessments.length}`}
              </span>
            </div>

            {/* List */}
            {filtered.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-[13px] text-text-dim">No assessments match &quot;{search}&quot;.</p>
              </div>
            ) : (
              <div className="bg-bg-3 rounded-xl border border-line overflow-hidden">
                <div className="divide-y divide-line">
                  {filtered.map((a) => (
                    <div
                      key={a.id}
                      className="px-5 py-4 flex items-center justify-between hover:bg-bg-2 transition-colors cursor-pointer group"
                      onClick={() =>
                        router.push(`/portal/assessment/${a.id}/section/${a.currentSection}`)
                      }
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-line accent-gold-brand"
                            checked={selectedIds.has(a.id)}
                            onChange={() => toggleSelectOne(a.id)}
                            aria-label={`Select assessment for ${a.clientName || 'Unnamed Client'}`}
                          />
                        </div>
                        <div className="w-10 h-10 rounded-full bg-bg-2 flex items-center justify-center text-text font-medium text-[13px] group-hover:bg-gold-brand/10 transition-colors shrink-0">
                          {(a.clientName || 'U')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-text truncate">
                            {a.clientName || 'Unnamed Client'}
                          </div>
                          <div className="text-[13px] text-text-dim flex items-center gap-1 sm:gap-2 flex-wrap">
                            <span>{a.assessmentDate || a.createdAt.split('T')[0]}</span>
                            <span className="text-line-2">&bull;</span>
                            <span>Section {a.currentSection}/11</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`font-mono text-[11px] font-medium uppercase tracking-[0.16em] px-2 py-0.5 rounded-full border ${
                          a.status === 'completed'
                            ? 'bg-status-good/10 text-status-good border-status-good/30'
                            : 'bg-gold-brand/10 text-gold-brand border-gold-brand/30'
                        }`}>
                          {a.status === 'completed' ? 'COMPLETED' : 'IN PROGRESS'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this assessment?')) deleteAssessment(a.id);
                          }}
                          aria-label={`Delete assessment for ${a.clientName || 'Unnamed Client'}`}
                          className="px-3 py-1.5 text-[13px] text-text-dim hover:text-danger hover:bg-danger/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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

function ImportResultBanner({ result, onDismiss }: { result: ImportResult; onDismiss: () => void }) {
  return (
    <div className="bg-bg-3 rounded-xl border border-line p-4 text-[13px] space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-text">
          Imported {result.imported} assessment{result.imported !== 1 ? 's' : ''}
        </span>
        <button onClick={onDismiss} aria-label="Dismiss import result" className="text-text-dim hover:text-text text-[11px]">
          Dismiss
        </button>
      </div>
      {result.errors.length > 0 && (
        <div className="text-danger">
          {result.errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}
      {result.warnings.length > 0 && (
        <div className="text-gold-brand">
          {result.warnings.map((w, i) => <p key={i}>{w}</p>)}
        </div>
      )}
    </div>
  );
}
