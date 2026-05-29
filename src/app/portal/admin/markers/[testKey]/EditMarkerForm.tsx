'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MonoEyebrow from '@/components/ui/MonoEyebrow';
import FormField from '@/components/forms/FormField';
import { PILLAR_KEYS, type PillarKey } from '@/lib/pillars/types';
import type { MarkerRow } from '@/lib/markers/queries';

/**
 * Phase 12 - Admin-managed marker editor (D-12, D-13, D-15).
 *
 * Loads a DB-driven marker by testKey, prefills the same form fields the
 * create page captures. testKey is read-only (immutable PK); dataKey is
 * shown but disabled (server-side D-13 guard would 400 a change anyway).
 * Optimistic concurrency: PUT body carries the row's updatedAt; on 409 the
 * admin sees an inline error and a Reload button. Delete uses a two-click
 * inline confirm and cascade-deletes marker_content + normative_ranges.
 *
 * Seeded markers (REPORT_MARKERS) are NOT editable here - GET /api/admin/
 * markers/[testKey] returns 404 for seed keys; the friendly Not Found view
 * points the admin at the existing /portal/admin/normative/[testKey] and
 * /portal/admin/marker-content/[testKey] editors instead.
 */

const PILLAR_LABELS: Record<PillarKey, string> = {
  cardiometabolic: 'Cardiometabolic',
  bodyComposition: 'Body Composition',
  strength: 'Strength',
  balance: 'Balance',
  vo2: 'VO2',
};

const SECTION_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export default function EditMarkerForm({ testKey }: { testKey: string }) {
  const router = useRouter();

  const [marker, setMarker] = useState<MarkerRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Editable fields (prefilled from marker)
  const [label, setLabel] = useState('');
  const [section, setSection] = useState<number>(5);
  const [pillar, setPillar] = useState<PillarKey>('cardiometabolic');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [fallbackUnit, setFallbackUnit] = useState('');
  const [hasNorms, setHasNorms] = useState(true);
  const [aiAliases, setAiAliases] = useState('');
  const [severityWeight, setSeverityWeight] = useState<number>(5);

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  // Delete state (two-click inline confirm)
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Reload trigger: incrementing this re-runs the fetch effect (used after
  // a 409 conflict to pull fresh server state). Set-state inside the
  // effect happens only via async .then/.catch callbacks (never synchronously)
  // to satisfy react-hooks/set-state-in-effect.
  const [reloadTick, setReloadTick] = useState(0);
  const reload = () => setReloadTick((n) => n + 1);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/markers/${testKey}`)
      .then(async (r) => ({ status: r.status, json: await r.json() }))
      .then(({ status, json }) => {
        if (cancelled) return;
        if (status === 404) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        if (!json.success) {
          setLoadError(json.error || 'Could not load marker.');
          setLoading(false);
          return;
        }
        const m = json.data.marker as MarkerRow;
        setMarker(m);
        setLabel(m.label);
        setSection(m.section);
        setPillar(m.pillar);
        setCategory(m.category);
        setSubcategory(m.subcategory ?? '');
        setFallbackUnit(m.fallbackUnit ?? '');
        setHasNorms(m.hasNorms);
        setAiAliases(Array.isArray(m.aiAliases) ? m.aiAliases.join(', ') : '');
        setSeverityWeight(typeof m.severityWeight === 'number' ? m.severityWeight : 5);
        setIsDirty(false);
        setConflict(false);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError('Could not load marker. Check your connection and try again.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [testKey, reloadTick]);

  // Beforeunload dirty guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Auto-clear delete confirm after 5s
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 5000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  const markDirty = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setIsDirty(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!marker) return;
    setIsSaving(true);
    setSaveError(null);
    setConflict(false);

    const aliasesArr = aiAliases
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const body = {
      label: label.trim(),
      section,
      pillar,
      category: category.trim(),
      subcategory: subcategory.trim() || null,
      fallbackUnit: fallbackUnit.trim() || null,
      hasNorms,
      aiAliases: aliasesArr.length > 0 ? aliasesArr : null,
      severityWeight,
      updatedAt: marker.updatedAt,
    };

    try {
      const res = await fetch(`/api/admin/markers/${testKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.status === 409) {
        setConflict(true);
        setSaveError(
          json.error ||
            'This marker was updated by another admin. Reload to see their changes before saving.'
        );
      } else if (!res.ok || !json.success) {
        setSaveError(json.error || 'Could not save - please try again.');
      } else {
        const updated = json.data.marker as MarkerRow;
        setMarker(updated);
        setIsDirty(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch {
      setSaveError('Could not save - please check your connection and try again.');
    }
    setIsSaving(false);
  };

  const handleDeleteClick = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setDeleteError(null);
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/markers/${testKey}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setDeleteError(json.error || 'Could not delete marker.');
        setDeleting(false);
        return;
      }
      router.push('/portal/admin/markers');
    } catch {
      setDeleteError('Could not delete marker. Check your connection and try again.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <header className="pt-24 pb-10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="animate-pulse space-y-3">
              <div className="h-3 w-24 bg-line rounded" />
              <div className="h-9 w-64 bg-line rounded" />
              <div className="h-3 w-48 bg-line rounded" />
            </div>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 space-y-4">
          <div className="animate-pulse h-32 bg-bg-3 rounded-xl" />
          <div className="animate-pulse h-40 bg-bg-3 rounded-xl" />
        </main>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen">
        <header className="pt-24 pb-10">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <Link
              href="/portal/admin/markers"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-text-faint hover:text-gold-brand mb-4 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              MARKERS
            </Link>
            <MonoEyebrow variant="hero" as="div" className="mb-3">
              ADMIN &middot; NOT FOUND
            </MonoEyebrow>
            <h1 className="text-[32px] sm:text-[40px] font-medium text-text leading-none tracking-[-0.03em]">
              Marker not found
            </h1>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
          <div className="rounded-xl border border-line bg-bg-3 p-6">
            <p className="text-[13px] text-text-dim leading-[1.55]">
              No DB-managed marker exists with the key <span className="font-mono">{testKey}</span>.
              If this is a seeded marker (shipped in code), edit it via the existing tools instead:
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href={`/portal/admin/normative/${testKey}`}
                className="font-mono text-[12px] uppercase tracking-[0.14em] text-gold-brand hover:text-champagne"
              >
                Edit ranges (gender / age) -&gt; /portal/admin/normative/{testKey}
              </Link>
              <Link
                href={`/portal/admin/marker-content/${testKey}`}
                className="font-mono text-[12px] uppercase tracking-[0.14em] text-gold-brand hover:text-champagne"
              >
                Edit content (definition / impact / coach insights) -&gt; /portal/admin/marker-content/{testKey}
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen pt-24">
        <main className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="p-4 bg-danger/10 text-danger rounded-xl text-[13px] border border-danger/30">
            {loadError}
          </div>
        </main>
      </div>
    );
  }

  if (!marker) return null;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <header className="pt-24 pb-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Link
            href="/portal/admin/markers"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-text-faint hover:text-gold-brand mb-4 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            MARKERS
          </Link>
          <MonoEyebrow variant="hero" as="div" className="mb-3">
            ADMIN &middot; EDIT MARKER
          </MonoEyebrow>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[32px] sm:text-[40px] font-medium text-text leading-none tracking-[-0.03em]">
              {marker.label}
            </h1>
            {isDirty && (
              <span className="w-2 h-2 rounded-full bg-gold-brand" title="Unsaved changes" />
            )}
          </div>
          <p className="mt-3 text-[13px] text-text-dim leading-[1.55]">
            <span className="font-mono">testKey: {marker.testKey}</span>
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
          className="space-y-8"
        >
          {/* ── Identity (read-only) ───────────── */}
          <section className="rounded-xl border border-line bg-bg-3 p-5 sm:p-6 space-y-3">
            <h2 className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">
              Identity (locked)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint mb-0.5">
                  test_key
                </div>
                <div className="font-mono text-[13px] text-text">{marker.testKey}</div>
              </div>
              <div>
                <label
                  htmlFor="dataKey"
                  className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint mb-0.5"
                >
                  data_key
                </label>
                <input
                  id="dataKey"
                  type="text"
                  value={marker.dataKey}
                  disabled
                  readOnly
                  title="Locked after creation - changing this would orphan existing assessment data."
                  className="w-full px-3 py-2 bg-bg-2 border border-line rounded text-[13px] font-mono text-text-faint cursor-not-allowed"
                />
                <p className="mt-1 text-[11px] text-text-faint">
                  Locked after creation - changing this would orphan existing assessment data.
                </p>
              </div>
            </div>
          </section>

          {/* ── Editable: label + placement ─────── */}
          <section className="rounded-xl border border-line bg-bg-3 p-5 sm:p-6 space-y-4">
            <h2 className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">
              Label & placement
            </h2>

            <FormField
              id="label"
              label="Label"
              type="text"
              value={label}
              onChange={markDirty(setLabel)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="section" className="block text-[13px] font-medium text-text">
                  Section <span className="text-danger ml-1">*</span>
                </label>
                <select
                  id="section"
                  value={section}
                  onChange={(e) => {
                    setSection(Number(e.target.value));
                    setIsDirty(true);
                    setSaveSuccess(false);
                  }}
                  className="w-full h-12 px-4 bg-bg-3 border border-line rounded-lg text-[13px] text-text focus:outline-none focus:border-gold-brand transition-colors"
                >
                  {SECTION_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      Section {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pillar" className="block text-[13px] font-medium text-text">
                  Pillar <span className="text-danger ml-1">*</span>
                </label>
                <select
                  id="pillar"
                  value={pillar}
                  onChange={(e) => {
                    setPillar(e.target.value as PillarKey);
                    setIsDirty(true);
                    setSaveSuccess(false);
                  }}
                  className="w-full h-12 px-4 bg-bg-3 border border-line rounded-lg text-[13px] text-text focus:outline-none focus:border-gold-brand transition-colors"
                >
                  {PILLAR_KEYS.map((p) => (
                    <option key={p} value={p}>
                      {PILLAR_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="category"
                label="Category"
                type="text"
                value={category}
                onChange={markDirty(setCategory)}
                required
              />
              <FormField
                id="subcategory"
                label="Subcategory (optional)"
                type="text"
                value={subcategory}
                onChange={markDirty(setSubcategory)}
              />
            </div>

            <FormField
              id="fallbackUnit"
              label="Fallback unit (optional)"
              type="text"
              value={fallbackUnit}
              onChange={markDirty(setFallbackUnit)}
            />
          </section>

          {/* ── hasNorms toggle ──────────────────── */}
          <section className="rounded-xl border border-line bg-bg-3 p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">
                Normative ranges
              </h2>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <span className="text-[12px] text-text-dim">hasNorms</span>
                <span className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={hasNorms}
                    onChange={(e) => {
                      setHasNorms(e.target.checked);
                      setIsDirty(true);
                      setSaveSuccess(false);
                    }}
                    className="sr-only peer"
                  />
                  <span className="w-9 h-5 bg-bg-2 rounded-full border border-line peer-checked:bg-gold-brand transition-colors" />
                  <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-text shadow transition-transform peer-checked:translate-x-4" />
                </span>
              </label>
            </div>
            <p className="text-[12px] text-text-dim leading-[1.5]">
              Edit gender-specific or age-bucketed ranges in the dedicated normative editor (see
              cross-links below).
            </p>
          </section>

          {/* ── AI aliases ───────────────────────── */}
          <section className="rounded-xl border border-line bg-bg-3 p-5 sm:p-6 space-y-3">
            <h2 className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">
              AI extraction aliases (optional)
            </h2>
            <p className="text-[12px] text-text-dim leading-[1.5]">
              Be specific. Prefer multi-word terms (e.g. &ldquo;apolipoprotein b&rdquo; not
              &ldquo;iron&rdquo;). Markers without aliases are manual-entry only.
            </p>
            <textarea
              value={aiAliases}
              onChange={(e) => {
                setAiAliases(e.target.value);
                setIsDirty(true);
                setSaveSuccess(false);
              }}
              rows={3}
              placeholder="apolipoprotein b, apo b, apob"
              className="w-full px-3.5 py-3 bg-bg-2 border border-line rounded-lg text-[13px] text-text placeholder:text-text-faint focus:outline-none focus:border-gold-brand transition-colors resize-y"
            />
          </section>

          {/* ── Severity weight ──────────────────── */}
          <section className="rounded-xl border border-line bg-bg-3 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">
                Red flag severity
              </h2>
              <span className="text-[18px] font-bold text-text tabular-nums">{severityWeight}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-text-dim">Low (0)</span>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={severityWeight}
                onChange={(e) => {
                  setSeverityWeight(Number(e.target.value));
                  setIsDirty(true);
                  setSaveSuccess(false);
                }}
                className="flex-1 accent-gold-brand"
              />
              <span className="text-[11px] text-text-dim">Critical (10)</span>
            </div>
          </section>

          {/* ── Save / error / reload ────────────── */}
          <div className="pt-2">
            <div className="flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={!isDirty || isSaving}
                className={`text-[13px] font-bold px-6 py-2.5 rounded-lg transition-colors ${
                  !isDirty || isSaving
                    ? 'bg-gold-brand/50 text-bg opacity-50 cursor-not-allowed'
                    : 'bg-gold-brand text-bg hover:bg-champagne'
                }`}
              >
                {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save changes'}
              </button>
            </div>

            {saveError && (
              <div className="mt-3 p-3 bg-danger/10 text-danger rounded-lg text-[13px] border border-danger/30 flex items-center justify-between gap-3">
                <span className="flex-1">{saveError}</span>
                {conflict && (
                  <button
                    type="button"
                    onClick={reload}
                    className="font-mono text-[11px] uppercase tracking-[0.14em] px-3 py-1.5 rounded border border-danger/40 text-danger hover:bg-danger/20 transition-colors flex-none"
                  >
                    Reload
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Cross-links to other editors ─────── */}
          <section className="rounded-xl border border-line bg-bg-3/60 p-5 sm:p-6 space-y-3">
            <h2 className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">
              Related editors
            </h2>
            <div className="flex flex-col gap-2">
              <Link
                href={`/portal/admin/normative/${marker.testKey}`}
                className="font-mono text-[12px] uppercase tracking-[0.14em] text-gold-brand hover:text-champagne"
              >
                Edit ranges (gender / age) -&gt; /portal/admin/normative/{marker.testKey}
              </Link>
              <Link
                href={`/portal/admin/marker-content/${marker.testKey}`}
                className="font-mono text-[12px] uppercase tracking-[0.14em] text-gold-brand hover:text-champagne"
              >
                Edit content (definition / impact / coach insights) -&gt; /portal/admin/marker-content/{marker.testKey}
              </Link>
            </div>
          </section>

          {/* ── Danger zone: delete ─────────────── */}
          <section className="rounded-xl border border-danger/30 bg-danger/5 p-5 sm:p-6 space-y-3">
            <h2 className="font-mono text-[11px] font-medium text-danger uppercase tracking-[0.18em]">
              Danger zone
            </h2>
            <p className="text-[12px] text-text-dim leading-[1.5]">
              Deleting a marker also clears its marker_content and normative_ranges rows. Existing
              assessment data is left untouched (orphan field, harmless).
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={deleting}
                className={`text-[12px] font-bold px-4 py-2 rounded-lg border transition-colors ${
                  confirmDelete
                    ? 'bg-danger text-bg border-danger hover:bg-danger/80'
                    : 'text-danger border-danger/40 hover:bg-danger/10'
                } ${deleting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {deleting
                  ? 'Deleting...'
                  : confirmDelete
                  ? 'Confirm delete - this also clears marker_content and normative ranges'
                  : 'Delete marker'}
              </button>
              {confirmDelete && !deleting && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-[12px] font-medium text-text-dim hover:text-text"
                >
                  Cancel
                </button>
              )}
            </div>
            {deleteError && (
              <div className="p-3 bg-danger/10 text-danger rounded-lg text-[13px] border border-danger/30">
                {deleteError}
              </div>
            )}
          </section>
        </form>
      </main>
    </div>
  );
}
