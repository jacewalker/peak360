'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import FormField from '@/components/forms/FormField';
import { PILLAR_KEYS, PILLAR_LABELS, type PillarKey } from '@/lib/pillars/types';
import { SECTION_LABELS } from '@/lib/markers/stats';
import type { RatingTier, TierRanges } from '@/types/normative';

const TIER_ORDER: RatingTier[] = ['poor', 'cautious', 'normal', 'great', 'elite'];

const TIER_LABELS: Record<RatingTier, string> = {
  poor: 'Poor',
  cautious: 'Cautious',
  normal: 'Normal',
  great: 'Great',
  elite: 'Elite',
};

const TIER_HEX: Record<RatingTier, string> = {
  elite: '#10b981',
  great: '#3b82f6',
  normal: '#94a3b8',
  cautious: '#f59e0b',
  poor: '#ef4444',
};

const SECTION_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const TEST_KEY_RE = /^[a-z][a-z0-9_]*$/;
const DATA_KEY_RE = /^[a-z][a-zA-Z0-9]*$/;

function emptyTiers(): TierRanges {
  return {
    poor: { min: 0, max: 0 },
    cautious: { min: 0, max: 0 },
    normal: { min: 0, max: 0 },
    great: { min: 0, max: 0 },
    elite: { min: 0, max: 0 },
  };
}

/**
 * Derive a snake_case test_key from a human label.
 * Example: "Apolipoprotein B" -> "apolipoprotein_b"
 */
function deriveTestKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[^a-z]+/, ''); // ensure starts with [a-z]
}

/**
 * Derive a camelCase data_key from a human label.
 * Example: "Apolipoprotein B" -> "apolipoproteinB"
 */
function deriveDataKey(label: string): string {
  const words = label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '';
  return words
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('')
    .replace(/^[^a-z]+/, '');
}

export default function NewMarkerForm() {
  const router = useRouter();

  // Core fields. When the admin has not manually overridden the derived
  // keys, we treat the *override* fields as null and compute the visible
  // value from `label` via useMemo. This avoids the
  // react-hooks/set-state-in-effect anti-pattern of mirroring derived
  // state into useState via useEffect.
  const [label, setLabel] = useState('');
  const [testKeyOverride, setTestKeyOverride] = useState<string | null>(null);
  const [dataKeyOverride, setDataKeyOverride] = useState<string | null>(null);
  const [editingKeys, setEditingKeys] = useState(false);

  const testKey = testKeyOverride ?? deriveTestKey(label);
  const dataKey = dataKeyOverride ?? deriveDataKey(label);

  const [section, setSection] = useState<number>(5);
  const [pillar, setPillar] = useState<PillarKey>('cardiometabolic');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [fallbackUnit, setFallbackUnit] = useState('');

  const [hasNorms, setHasNorms] = useState(true);
  const [initialUnit, setInitialUnit] = useState('');
  const [tiers, setTiers] = useState<TierRanges>(emptyTiers());

  const [aiAliases, setAiAliases] = useState('');
  const [severityWeight, setSeverityWeight] = useState<number>(5);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Client-side validation summary
  const validationErrors = useMemo(() => {
    const errs: string[] = [];
    if (!label.trim()) errs.push('Label is required');
    if (!testKey || !TEST_KEY_RE.test(testKey)) {
      errs.push('test_key must match ^[a-z][a-z0-9_]*$');
    }
    if (!dataKey || !DATA_KEY_RE.test(dataKey)) {
      errs.push('data_key must match ^[a-z][a-zA-Z0-9]*$');
    }
    if (!category.trim()) errs.push('Category is required');
    return errs;
  }, [label, testKey, dataKey, category]);

  const handleTierChange = (tier: RatingTier, field: 'min' | 'max', value: string) => {
    const num = value === '' ? 0 : parseFloat(value);
    setTiers((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], [field]: Number.isFinite(num) ? num : 0 },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (validationErrors.length > 0) {
      setSubmitError(validationErrors.join('; '));
      return;
    }

    const aliasesArr = aiAliases
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const body: Record<string, unknown> = {
      testKey,
      label: label.trim(),
      section,
      dataKey,
      pillar,
      category: category.trim(),
      subcategory: subcategory.trim() || undefined,
      fallbackUnit: fallbackUnit.trim() || undefined,
      hasNorms,
      aiAliases: aliasesArr.length > 0 ? aliasesArr : undefined,
      severityWeight,
    };

    if (hasNorms) {
      body.initialTiers = tiers;
      body.initialUnit = initialUnit.trim() || fallbackUnit.trim() || undefined;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/markers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.status === 201 && json.success) {
        // D-06: redirect to the existing marker-content editor to author definition / impact / coach insights
        router.push(`/portal/admin/marker-content/${json.data.marker.testKey}`);
        return;
      }
      if (res.status === 400 || res.status === 409) {
        setSubmitError(json.error || 'Could not save - please check the form and try again.');
      } else {
        setSubmitError(json.error || 'Could not save - please try again.');
      }
    } catch {
      setSubmitError('Could not save - please check your connection and try again.');
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ── Identity ───────────────────────────── */}
      <section className="rounded-xl border border-line bg-bg-3 p-5 sm:p-6 space-y-4">
        <h2 className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">
          Identity
        </h2>

        <FormField
          id="label"
          label="Label"
          type="text"
          value={label}
          onChange={setLabel}
          placeholder="Apolipoprotein B"
          required
        />

        {/* Auto-derived keys preview */}
        <div className="rounded-lg border border-line bg-bg-2 p-3 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint">
              Auto-derived keys
            </span>
            <button
              type="button"
              onClick={() => setEditingKeys((v) => !v)}
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold-brand hover:text-champagne"
            >
              {editingKeys ? 'Done' : 'Edit'}
            </button>
          </div>

          {editingKeys ? (
            <div className="space-y-2.5">
              <div>
                <label htmlFor="testKey" className="block text-[11px] font-medium text-text-dim mb-1">
                  test_key
                </label>
                <input
                  id="testKey"
                  type="text"
                  value={testKey}
                  onChange={(e) => {
                    setTestKeyOverride(e.target.value);
                  }}
                  className={`w-full px-3 py-2 bg-bg-3 border rounded text-[13px] font-mono text-text focus:outline-none focus:border-gold-brand ${
                    testKey && !TEST_KEY_RE.test(testKey) ? 'border-danger' : 'border-line'
                  }`}
                />
                {testKey && !TEST_KEY_RE.test(testKey) && (
                  <p className="mt-1 text-[11px] text-danger">
                    Must match ^[a-z][a-z0-9_]*$ (lowercase, digits, underscore)
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="dataKey" className="block text-[11px] font-medium text-text-dim mb-1">
                  data_key
                </label>
                <input
                  id="dataKey"
                  type="text"
                  value={dataKey}
                  onChange={(e) => {
                    setDataKeyOverride(e.target.value);
                  }}
                  className={`w-full px-3 py-2 bg-bg-3 border rounded text-[13px] font-mono text-text focus:outline-none focus:border-gold-brand ${
                    dataKey && !DATA_KEY_RE.test(dataKey) ? 'border-danger' : 'border-line'
                  }`}
                />
                {dataKey && !DATA_KEY_RE.test(dataKey) && (
                  <p className="mt-1 text-[11px] text-danger">
                    Must match ^[a-z][a-zA-Z0-9]*$ (camelCase, no separators)
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint mb-0.5">
                  test_key
                </div>
                <div className="font-mono text-[13px] text-text">
                  {testKey || <span className="text-text-faint italic">(enter a label)</span>}
                </div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint mb-0.5">
                  data_key
                </div>
                <div className="font-mono text-[13px] text-text">
                  {dataKey || <span className="text-text-faint italic">(enter a label)</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Placement ──────────────────────────── */}
      <section className="rounded-xl border border-line bg-bg-3 p-5 sm:p-6 space-y-4">
        <h2 className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">
          Placement
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="section" className="block text-[13px] font-medium text-text">
              Section <span className="text-danger ml-1">*</span>
            </label>
            <select
              id="section"
              value={section}
              onChange={(e) => setSection(Number(e.target.value))}
              className="w-full h-12 px-4 bg-bg-3 border border-line rounded-lg text-[13px] text-text focus:outline-none focus:border-gold-brand transition-colors"
            >
              {SECTION_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {SECTION_LABELS[s] || `Section ${s}`}
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
              onChange={(e) => setPillar(e.target.value as PillarKey)}
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
            onChange={setCategory}
            placeholder="Blood Tests & Biomarkers"
            required
          />
          <FormField
            id="subcategory"
            label="Subcategory (optional)"
            type="text"
            value={subcategory}
            onChange={setSubcategory}
            placeholder="Lipid Panel"
          />
        </div>

        <FormField
          id="fallbackUnit"
          label="Fallback unit (optional)"
          type="text"
          value={fallbackUnit}
          onChange={setFallbackUnit}
          placeholder="mg/dL"
        />
      </section>

      {/* ── Normative ranges ───────────────────── */}
      <section className="rounded-xl border border-line bg-bg-3 p-5 sm:p-6 space-y-4">
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
                onChange={(e) => setHasNorms(e.target.checked)}
                className="sr-only peer"
              />
              <span className="w-9 h-5 bg-bg-2 rounded-full border border-line peer-checked:bg-gold-brand transition-colors" />
              <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-text shadow transition-transform peer-checked:translate-x-4" />
            </span>
          </label>
        </div>

        {hasNorms ? (
          <>
            <p className="text-[12px] text-text-dim leading-[1.5]">
              Set the initial unisex tier ranges. You can add gender-specific or age-bucketed
              variants later in the normative editor.
            </p>

            <FormField
              id="initialUnit"
              label="Unit (defaults to fallback unit)"
              type="text"
              value={initialUnit}
              onChange={setInitialUnit}
              placeholder={fallbackUnit || 'mg/dL'}
            />

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {TIER_ORDER.map((tier) => (
                <div key={tier} className="space-y-2">
                  <div
                    className="text-[11px] font-bold uppercase tracking-wide text-center pb-1 border-t-4 text-text"
                    style={{ borderColor: TIER_HEX[tier] }}
                  >
                    {TIER_LABELS[tier]}
                  </div>
                  <div>
                    <label className="block text-[11px] text-text-dim mb-0.5">Min</label>
                    <input
                      type="number"
                      step="any"
                      value={tiers[tier].min}
                      onChange={(e) => handleTierChange(tier, 'min', e.target.value)}
                      className="w-full px-2 py-2 border border-line rounded text-[13px] text-center tabular-nums bg-bg-2 text-text focus:border-gold-brand outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-text-dim mb-0.5">Max</label>
                    <input
                      type="number"
                      step="any"
                      value={tiers[tier].max}
                      onChange={(e) => handleTierChange(tier, 'max', e.target.value)}
                      className="w-full px-2 py-2 border border-line rounded text-[13px] text-center tabular-nums bg-bg-2 text-text focus:border-gold-brand outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-[12px] text-text-dim leading-[1.5]">
            This marker will display its value with no tier pill or range bar.
          </p>
        )}
      </section>

      {/* ── AI extraction ──────────────────────── */}
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
          onChange={(e) => setAiAliases(e.target.value)}
          rows={3}
          placeholder="apolipoprotein b, apo b, apob"
          className="w-full px-3.5 py-3 bg-bg-2 border border-line rounded-lg text-[13px] text-text placeholder:text-text-faint focus:outline-none focus:border-gold-brand transition-colors resize-y"
        />
      </section>

      {/* ── Severity weight ────────────────────── */}
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
            onChange={(e) => setSeverityWeight(Number(e.target.value))}
            className="flex-1 accent-gold-brand"
          />
          <span className="text-[11px] text-text-dim">Critical (10)</span>
        </div>
        <p className="text-[11px] text-text-dim mt-2">
          Controls how prominently this marker&apos;s referral flag appears in reports.
        </p>
      </section>

      {/* ── Submit ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="text-[12px] text-danger min-w-0 flex-1">
          {submitError && <p>{submitError}</p>}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push('/portal/admin/markers')}
            className="text-[13px] font-medium text-text-dim hover:text-text px-4 py-2.5 border border-line rounded-lg hover:bg-bg-2 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || validationErrors.length > 0}
            className={`text-[13px] font-bold px-6 py-2.5 rounded-lg transition-colors ${
              submitting || validationErrors.length > 0
                ? 'bg-gold-brand/50 text-bg opacity-50 cursor-not-allowed'
                : 'bg-gold-brand text-bg hover:bg-champagne'
            }`}
          >
            {submitting ? 'Saving...' : 'Save & continue to content'}
          </button>
        </div>
      </div>
    </form>
  );
}
