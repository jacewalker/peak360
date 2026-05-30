'use client';

import { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import { TIER_LABELS } from '@/types/normative';
import type { RatingTier } from '@/types/normative';

/**
 * Quick 260529-mwp Task 4 - Inline marker-content editor as a centered modal.
 *
 * Clones the editor body from the legacy full-page editor at
 * /portal/admin/marker-content/[marker] (left untouched) into a
 * <Dialog mode="centered"> so admins can author Definition / Impact / the
 * 5-tier x Male/Female coach-insight matrix without leaving
 * /portal/admin/markers. Backdrop, ESC, focus trap, scroll lock and focus
 * restoration all come from Dialog - not re-implemented here.
 *
 * Differences from the page version:
 * - label / category / subcategory arrive as props, so we skip the extra
 *   /api/markers marker-resolution fetch.
 * - the beforeunload dirty guard is dropped in favour of a handleAttemptClose
 *   window.confirm (a modal that fights the browser unload event would be
 *   hostile when the parent page wants to navigate).
 *
 * Optimistic concurrency: the load captures the server updatedAt and sends it
 * back on PUT. A 409 surfaces a Reload affordance (no silent data loss) that
 * re-runs the load effect via a tick counter.
 */

const TIER_ORDER: RatingTier[] = ['poor', 'cautious', 'normal', 'great', 'elite'];

const TIER_HEX: Record<RatingTier, string> = {
  elite: '#10b981',
  great: '#3b82f6',
  normal: '#94a3b8',
  cautious: '#f59e0b',
  poor: '#ef4444',
};

type CoachInsightMatrix = Record<RatingTier, { male: string; female: string }>;

function emptyMatrix(): CoachInsightMatrix {
  return {
    poor: { male: '', female: '' },
    cautious: { male: '', female: '' },
    normal: { male: '', female: '' },
    great: { male: '', female: '' },
    elite: { male: '', female: '' },
  };
}

/** Coerce a partial/nullable server payload into a full string matrix. */
function normalizeMatrix(
  raw: Partial<Record<RatingTier, { male: string | null; female: string | null }>> | null | undefined
): CoachInsightMatrix {
  const base = emptyMatrix();
  if (!raw) return base;
  for (const tier of TIER_ORDER) {
    const cell = raw[tier];
    if (cell) {
      base[tier] = {
        male: cell.male ?? '',
        female: cell.female ?? '',
      };
    }
  }
  return base;
}

interface Props {
  markerKey: string;
  markerLabel: string;
  markerCategory?: string;
  markerSubcategory?: string;
  onClose: () => void;
  onSaved?: () => void;
}

export default function ContentEditModal({
  markerKey,
  markerLabel,
  markerCategory,
  markerSubcategory,
  onClose,
  onSaved,
}: Props) {
  const [definition, setDefinition] = useState('');
  const [impact, setImpact] = useState('');
  const [coachInsights, setCoachInsights] = useState<CoachInsightMatrix>(emptyMatrix());
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [serverUpdatedAt, setServerUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeGender, setActiveGender] = useState<'male' | 'female'>('male');
  // Bumping this re-runs the load effect (Reload affordance after a 409).
  const [loadTick, setLoadTick] = useState(0);

  // Load existing content on mount / reload. All set-state runs inside the
  // async callbacks (never synchronously in the effect body) to satisfy
  // react-hooks/set-state-in-effect, mirroring the sibling modal convention.
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/admin/marker-content/${markerKey}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;

        setIsDirty(false);
        setConflict(false);
        setSaveSuccess(false);

        if (!json.success) {
          setError(json.error || 'Failed to load marker content');
          setLoading(false);
          return;
        }
        const { data } = json;
        setError(null);
        setDefinition(data.definition ?? '');
        setImpact(data.impact ?? '');
        setCoachInsights(normalizeMatrix(data.coachInsights));
        setServerUpdatedAt(data.updatedAt ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Failed to load marker content. Check your connection and try again.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [markerKey, loadTick]);

  const handleReload = () => {
    setConflict(false);
    setError(null);
    setLoading(true);
    setLoadTick((n) => n + 1);
  };

  const handleInsightChange = (tier: RatingTier, gender: 'male' | 'female', value: string) => {
    setCoachInsights((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], [gender]: value },
    }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setConflict(false);
    try {
      const res = await fetch(`/api/admin/marker-content/${markerKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ definition, impact, coachInsights, updatedAt: serverUpdatedAt }),
      });
      const json = await res.json();

      if (res.status === 409) {
        setConflict(true);
        setError(
          json.error ||
            'This marker was updated by another admin. Reload to see their changes before saving.'
        );
      } else if (!res.ok) {
        setError(json.error || 'Failed to save marker content. Check your connection and try again.');
      } else {
        setIsDirty(false);
        setSaveSuccess(true);
        // Adopt the server's authoritative timestamp rather than the browser
        // clock, so the optimistic-concurrency check stays on one clock.
        setServerUpdatedAt(json.data?.updatedAt ?? Date.now());
        onSaved?.();
        // Auto-close shortly after a successful save so the admin returns to
        // the list immediately (matches the "edit without leaving" intent).
        setTimeout(() => onClose(), 600);
      }
    } catch {
      setError('Failed to save marker content. Check your connection and try again.');
    }
    setIsSaving(false);
  };

  const handleAttemptClose = () => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    onClose();
  };

  return (
    <Dialog open onClose={handleAttemptClose} mode="centered" ariaLabel={`Edit content for ${markerLabel}`}>
      {/* Modal chrome - header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            {saveSuccess ? (
              <span className="flex items-center gap-1 text-[10px] text-status-good">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Saved
              </span>
            ) : (
              isDirty && (
                <span className="flex items-center gap-1 text-[10px] text-gold-brand/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold-brand inline-block" />
                  Unsaved
                </span>
              )
            )}
          </div>
          <h2 className="text-2xl font-black text-text tracking-tight leading-tight">
            {markerLabel}
          </h2>
          {(markerCategory || markerSubcategory) && (
            <p className="text-[11px] text-text-faint mt-1 leading-tight">
              {markerCategory}
              {markerSubcategory ? ` / ${markerSubcategory}` : ''}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleAttemptClose}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-text-faint hover:text-text hover:bg-line transition-colors"
          aria-label="Close dialog"
        >
          <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tone guidance (kept verbatim from the legacy editor, em-dashes replaced) */}
      <p className="text-[12px] text-text-dim mb-6 max-w-2xl leading-[1.55]">
        Write in consumer-friendly language. Avoid disease-prevention claims, longevity guarantees,
        or fabricated numbers. Focus on what the marker means and what the client can do about it.
      </p>

      {/* Body */}
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-line rounded w-32" />
          <div className="h-24 bg-line rounded" />
          <div className="h-24 bg-line rounded" />
          <div className="h-48 bg-line rounded" />
        </div>
      ) : (
        <>
          {/* Definition */}
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-0.5 h-4 rounded-full bg-gold-brand" />
              <h3 className="font-mono text-[11px] font-medium text-text-dim uppercase tracking-[0.18em]">
                What it is - Definition
              </h3>
            </div>
            <textarea
              data-autofocus
              value={definition}
              onChange={(e) => {
                setDefinition(e.target.value);
                setIsDirty(true);
              }}
              rows={4}
              placeholder="Gender-neutral explanation of what this marker measures..."
              className="w-full px-3.5 py-3 border border-line rounded-xl text-[14px] leading-[1.6] bg-bg-3 text-text placeholder:text-text-faint focus:border-gold-brand focus:ring-2 focus:ring-gold-brand/20 outline-none transition-colors resize-y"
            />
          </div>

          {/* Impact */}
          <div className="mb-8">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-0.5 h-4 rounded-full bg-gold-brand" />
              <h3 className="font-mono text-[11px] font-medium text-text-dim uppercase tracking-[0.18em]">
                How it affects you - Impact
              </h3>
            </div>
            <textarea
              value={impact}
              onChange={(e) => {
                setImpact(e.target.value);
                setIsDirty(true);
              }}
              rows={4}
              placeholder="Gender-neutral explanation of how this marker affects the client..."
              className="w-full px-3.5 py-3 border border-line rounded-xl text-[14px] leading-[1.6] bg-bg-3 text-text placeholder:text-text-faint focus:border-gold-brand focus:ring-2 focus:ring-gold-brand/20 outline-none transition-colors resize-y"
            />
          </div>

          {/* Coach insight matrix */}
          <div className="mb-2">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="w-0.5 h-4 rounded-full bg-gold-brand" />
              <h3 className="font-mono text-[11px] font-medium text-text-dim uppercase tracking-[0.18em]">
                Coach insight - per tier / per gender
              </h3>
            </div>
            <p className="text-[12px] text-text-faint mb-4 max-w-2xl leading-[1.5]">
              The client sees the insight matching their marker tier and gender. Author all five tiers
              for each gender.
            </p>

            {/* Gender tabs */}
            <div className="flex gap-1 mb-5 border-b border-line">
              {(['male', 'female'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setActiveGender(g)}
                  className={`text-[13px] font-bold px-4 py-2 rounded-t-lg transition-colors ${
                    activeGender === g
                      ? 'border-b-2 border-gold-brand text-text'
                      : 'text-text-dim hover:text-text'
                  }`}
                >
                  {g === 'male' ? 'Male' : 'Female'}
                </button>
              ))}
            </div>

            {/* Per-tier textareas for active gender */}
            <div className="space-y-4">
              {TIER_ORDER.map((tier) => (
                <div key={tier}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-none"
                      style={{ backgroundColor: TIER_HEX[tier] }}
                    />
                    <span className="text-[13px] font-bold text-text">{TIER_LABELS[tier]}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">
                      {tier}
                    </span>
                  </div>
                  <textarea
                    value={coachInsights[tier][activeGender]}
                    onChange={(e) => handleInsightChange(tier, activeGender, e.target.value)}
                    rows={3}
                    placeholder={`${activeGender === 'male' ? 'Male' : 'Female'} / ${TIER_LABELS[tier]} coach insight...`}
                    className="w-full px-3.5 py-2.5 border border-line rounded-xl text-[14px] leading-[1.6] bg-bg-3 text-text placeholder:text-text-faint focus:border-gold-brand focus:ring-2 focus:ring-gold-brand/20 outline-none transition-colors resize-y"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Error / conflict */}
          {error && (
            <div className="mt-4 p-3 bg-danger/10 text-danger rounded-xl text-sm border border-danger/30 flex items-start justify-between gap-3">
              <span className="min-w-0">{error}</span>
              {conflict && (
                <button
                  type="button"
                  onClick={handleReload}
                  className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg border border-danger/40 hover:bg-danger/20 transition-colors"
                >
                  Reload
                </button>
              )}
            </div>
          )}

          {/* Inline saved pill */}
          {saveSuccess && (
            <div className="mt-4 flex items-center gap-1.5 text-sm font-bold text-status-good">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Saved
            </div>
          )}

          {/* Action bar */}
          <div className="mt-6 pt-4 border-t border-line flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleAttemptClose}
              className="text-sm font-bold text-text-dim hover:text-text px-3 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className={`text-sm font-bold px-5 py-2 rounded-lg transition-all duration-200 ${
                isDirty && !isSaving
                  ? 'bg-gold-brand text-bg hover:bg-champagne shadow-sm hover:shadow-md'
                  : 'bg-gold-brand/25 text-text-faint cursor-not-allowed'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
