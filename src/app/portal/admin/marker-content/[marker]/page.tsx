'use client';

import { useState, useEffect, use } from 'react';
import { REPORT_MARKERS } from '@/lib/report-markers';
import type { MarkerDef } from '@/lib/report-markers';
import { TIER_LABELS } from '@/types/normative';
import type { RatingTier } from '@/types/normative';

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

export default function MarkerContentEditorPage({
  params,
}: {
  params: Promise<{ marker: string }>;
}) {
  const { marker } = use(params);

  const [markerDef, setMarkerDef] = useState<MarkerDef | null>(null);
  const [definition, setDefinition] = useState('');
  const [impact, setImpact] = useState('');
  const [coachInsights, setCoachInsights] = useState<CoachInsightMatrix>(emptyMatrix());
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverUpdatedAt, setServerUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeGender, setActiveGender] = useState<'male' | 'female'>('male');

  // Fetch existing content on mount
  useEffect(() => {
    const def = REPORT_MARKERS.find((m) => m.testKey === marker);
    setMarkerDef(def || null);

    fetch(`/api/admin/marker-content/${marker}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          setError(json.error || 'Failed to load marker content');
          setLoading(false);
          return;
        }
        const { data } = json;
        setDefinition(data.definition ?? '');
        setImpact(data.impact ?? '');
        setCoachInsights(normalizeMatrix(data.coachInsights));
        setServerUpdatedAt(data.updatedAt ?? null);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load marker content. Check your connection and try again.');
        setLoading(false);
      });
  }, [marker]);

  // Beforeunload dirty guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

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
    try {
      const res = await fetch(`/api/admin/marker-content/${marker}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ definition, impact, coachInsights, updatedAt: serverUpdatedAt }),
      });
      const json = await res.json();

      if (res.status === 409) {
        setError(
          json.error ||
            'This marker was updated by another admin. Reload to see their changes before saving.'
        );
      } else if (!res.ok) {
        setError(json.error || 'Failed to save marker content. Check your connection and try again.');
      } else {
        setIsDirty(false);
        setSaveSuccess(true);
        setServerUpdatedAt(Date.now());
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch {
      setError('Failed to save marker content. Check your connection and try again.');
    }
    setIsSaving(false);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 pt-24">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-line rounded w-48" />
          <div className="h-4 bg-line rounded w-32" />
          <div className="h-28 bg-line rounded" />
          <div className="h-28 bg-line rounded" />
          <div className="h-64 bg-line rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 pt-24">
      {/* Back link */}
      <a
        href="/portal/admin/marker-content"
        className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-text-faint hover:text-gold-brand mb-4 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Marker Content
      </a>

      {/* Marker header */}
      <div className="mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-[32px] sm:text-[40px] font-medium text-text leading-none tracking-[-0.03em]">
            {markerDef?.label || marker}
          </h1>
          {isDirty && (
            <span className="w-2 h-2 rounded-full bg-gold-brand" title="Unsaved changes" />
          )}
        </div>
        <p className="text-[13px] text-text-dim mt-2">
          {markerDef?.category}
          {markerDef?.subcategory ? ` › ${markerDef.subcategory}` : ''}
        </p>
      </div>

      {/* D-14 tone guidance */}
      <p className="text-[12px] text-text-dim mt-2 mb-8 max-w-2xl leading-[1.55]">
        Write in consumer-friendly language. Avoid disease-prevention claims, longevity guarantees,
        or fabricated numbers. Focus on what the marker means and what the client can do about it.
      </p>

      {/* Definition */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-0.5 h-4 rounded-full bg-gold-brand" />
          <h2 className="font-mono text-[11px] font-medium text-text-dim uppercase tracking-[0.18em]">
            What it is — Definition
          </h2>
        </div>
        <textarea
          value={definition}
          onChange={(e) => {
            setDefinition(e.target.value);
            setIsDirty(true);
          }}
          rows={4}
          placeholder="Gender-neutral explanation of what this marker measures…"
          className="w-full px-3.5 py-3 border border-line rounded-xl text-[14px] leading-[1.6] bg-bg-3 text-text placeholder:text-text-faint focus:border-gold-brand focus:ring-2 focus:ring-gold-brand/20 outline-none transition-colors resize-y"
        />
      </div>

      {/* Impact */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-0.5 h-4 rounded-full bg-gold-brand" />
          <h2 className="font-mono text-[11px] font-medium text-text-dim uppercase tracking-[0.18em]">
            How it affects you — Impact
          </h2>
        </div>
        <textarea
          value={impact}
          onChange={(e) => {
            setImpact(e.target.value);
            setIsDirty(true);
          }}
          rows={4}
          placeholder="Gender-neutral explanation of how this marker affects the client…"
          className="w-full px-3.5 py-3 border border-line rounded-xl text-[14px] leading-[1.6] bg-bg-3 text-text placeholder:text-text-faint focus:border-gold-brand focus:ring-2 focus:ring-gold-brand/20 outline-none transition-colors resize-y"
        />
      </div>

      {/* Coach insight matrix */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="w-0.5 h-4 rounded-full bg-gold-brand" />
          <h2 className="font-mono text-[11px] font-medium text-text-dim uppercase tracking-[0.18em]">
            Coach insight — per tier · per gender
          </h2>
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
                placeholder={`${activeGender === 'male' ? 'Male' : 'Female'} · ${TIER_LABELS[tier]} coach insight…`}
                className="w-full px-3.5 py-2.5 border border-line rounded-xl text-[14px] leading-[1.6] bg-bg-3 text-text placeholder:text-text-faint focus:border-gold-brand focus:ring-2 focus:ring-gold-brand/20 outline-none transition-colors resize-y"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex justify-end items-center p-4 border-t border-line mt-8">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className={`text-[13px] font-bold px-6 py-2.5 rounded-lg transition-colors ${
            isDirty && !isSaving
              ? 'bg-gold-brand text-bg hover:bg-champagne'
              : 'bg-gold-brand/50 text-bg opacity-50 cursor-not-allowed'
          }`}
        >
          {isSaving ? 'Saving…' : saveSuccess ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mt-2 p-3 bg-danger/10 text-danger rounded-lg text-[13px] border border-danger/30">
          {error}
        </div>
      )}
    </div>
  );
}
