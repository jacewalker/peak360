'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { REPORT_MARKERS } from '@/lib/report-markers';
import type { MarkerDef } from '@/lib/report-markers';
import type { RatingTier, TierRanges, NormativeRangeRow } from '@/types/normative';

const TIER_ORDER: RatingTier[] = ['poor', 'cautious', 'normal', 'great', 'elite'];

const TIER_HEX: Record<RatingTier, string> = {
  elite: '#10b981',
  great: '#3b82f6',
  normal: '#6b7280',
  cautious: '#f59e0b',
  poor: '#ef4444',
};

interface HardcodedDefaults {
  [key: string]: {
    unit: string | null;
    note: string | null;
    standards: TierRanges | null;
  };
}

function emptyTiers(): TierRanges {
  return {
    poor: { min: 0, max: 0 },
    cautious: { min: 0, max: 0 },
    normal: { min: 0, max: 0 },
    great: { min: 0, max: 0 },
    elite: { min: 0, max: 0 },
  };
}

function validateTiers(tiers: TierRanges): string[] {
  const errors: string[] = [];

  for (const tier of TIER_ORDER) {
    const range = tiers[tier];
    if (range && range.min >= range.max) {
      errors.push(`${tier}: min (${range.min}) must be less than max (${range.max})`);
    }
  }

  for (let i = 0; i < TIER_ORDER.length - 1; i++) {
    const prev = tiers[TIER_ORDER[i]];
    const next = tiers[TIER_ORDER[i + 1]];
    if (prev && next && prev.max !== next.min) {
      errors.push(
        `Gap between tiers: ${TIER_ORDER[i]} max (${prev.max}) must equal ${TIER_ORDER[i + 1]} min (${next.min})`
      );
    }
  }

  return errors;
}

function getVariantKey(gender: string | null, ageGroup: string | null): string {
  if (!gender && !ageGroup) return 'unisex';
  if (gender && !ageGroup) return gender;
  if (gender && ageGroup) return `${gender}_${ageGroup}`;
  return 'unisex';
}

export default function MarkerEditorPage({
  params,
}: {
  params: Promise<{ marker: string }>;
}) {
  const { marker } = use(params);

  const [markerDef, setMarkerDef] = useState<MarkerDef | null>(null);
  const [dbOverrides, setDbOverrides] = useState<NormativeRangeRow[]>([]);
  const [hardcodedDefaults, setHardcodedDefaults] = useState<HardcodedDefaults>({});
  const [editTiers, setEditTiers] = useState<Record<string, TierRanges>>({});
  const [severityWeight, setSeverityWeight] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [activeGender, setActiveGender] = useState<'all' | 'male' | 'female'>('all');
  const [activeAgeGroup, setActiveAgeGroup] = useState<string | null>(null);
  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState<string | null>(null);

  const hasGenderVariants = Object.keys(hardcodedDefaults).some(
    (k) => k === 'male' || k === 'female'
  );

  const hasAgeVariants = Object.keys(editTiers).some((k) => k.includes('_'));

  const ageGroups = Array.from(
    new Set(
      Object.keys(editTiers)
        .filter((k) => k.includes('_'))
        .map((k) => k.split('_')[1])
    )
  );

  useEffect(() => {
    const def = REPORT_MARKERS.find((m) => m.testKey === marker);
    setMarkerDef(def || null);

    fetch(`/api/admin/normative/${marker}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          setError(json.error || 'Failed to load marker data');
          setLoading(false);
          return;
        }

        const { dbOverrides: overrides, hardcodedDefaults: defaults } = json.data;
        setDbOverrides(overrides);
        setHardcodedDefaults(defaults);

        // Determine unit from first available source
        const firstDefault = Object.values(defaults)[0] as HardcodedDefaults[string] | undefined;
        setUnit(firstDefault?.unit ?? def?.fallbackUnit ?? null);

        // Initialize editTiers from DB overrides or hardcoded defaults
        const tiers: Record<string, TierRanges> = {};

        if (overrides.length > 0) {
          for (const row of overrides as NormativeRangeRow[]) {
            const key = getVariantKey(row.gender, row.ageGroup);
            tiers[key] = (row.tiers as TierRanges) || emptyTiers();
          }
          const firstRow = overrides[0] as NormativeRangeRow;
          setSeverityWeight(firstRow.severityWeight ?? 0);
          const latestUpdate = (overrides as NormativeRangeRow[]).reduce(
            (latest: string, row: NormativeRangeRow) =>
              row.updatedAt > latest ? row.updatedAt : latest,
            ''
          );
          setServerUpdatedAt(latestUpdate || null);
        } else {
          for (const [key, val] of Object.entries(defaults as HardcodedDefaults)) {
            if (val.standards) {
              tiers[key] = val.standards;
            }
          }
        }

        if (Object.keys(tiers).length === 0) {
          tiers.unisex = emptyTiers();
        }

        setEditTiers(tiers);

        // Set initial active age group if applicable
        const ageKeys = Object.keys(tiers).filter((k) => k.includes('_'));
        if (ageKeys.length > 0) {
          const maleAgeKeys = ageKeys.filter((k) => k.startsWith('male_'));
          if (maleAgeKeys.length > 0) {
            setActiveAgeGroup(maleAgeKeys[0].split('_')[1]);
            setActiveGender('male');
          }
        }

        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load marker data. Check your connection and try again.');
        setLoading(false);
      });
  }, [marker]);

  // Beforeunload guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const getCurrentVariantKey = useCallback((): string => {
    if (!hasGenderVariants) return 'unisex';
    if (activeGender === 'all') return 'unisex';
    if (hasAgeVariants && activeAgeGroup) return `${activeGender}_${activeAgeGroup}`;
    return activeGender;
  }, [hasGenderVariants, hasAgeVariants, activeGender, activeAgeGroup]);

  const currentVariantTiers = editTiers[getCurrentVariantKey()] || emptyTiers();
  const currentValidationErrors = validationErrors[getCurrentVariantKey()] || [];

  const handleTierChange = (tier: RatingTier, field: 'min' | 'max', value: string) => {
    const numVal = value === '' ? 0 : parseFloat(value);
    const key = getCurrentVariantKey();
    const currentTiers = editTiers[key] || emptyTiers();

    const updatedTiers: TierRanges = {
      ...currentTiers,
      [tier]: {
        ...currentTiers[tier],
        [field]: isNaN(numVal) ? 0 : numVal,
      },
    };

    setEditTiers((prev) => ({ ...prev, [key]: updatedTiers }));
    setIsDirty(true);

    // Validate
    const errors = validateTiers(updatedTiers);
    setValidationErrors((prev) => ({ ...prev, [key]: errors }));
  };

  const hasValidationError = (tier: RatingTier, field: 'min' | 'max'): boolean => {
    return currentValidationErrors.some(
      (err) => err.toLowerCase().includes(tier) && err.toLowerCase().includes(field)
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    const variants = Object.entries(editTiers).map(([key, tiers]) => {
      let gender: string | null = null;
      let ageGroup: string | null = null;

      if (key === 'unisex') {
        gender = null;
        ageGroup = null;
      } else if (key.includes('_')) {
        const parts = key.split('_');
        gender = parts[0];
        ageGroup = parts.slice(1).join('_');
      } else {
        gender = key;
      }

      return {
        gender,
        ageGroup,
        tiers,
        unit: unit ?? undefined,
        severityWeight,
      };
    });

    try {
      const res = await fetch(`/api/admin/normative/${marker}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variants, updatedAt: serverUpdatedAt }),
      });
      const json = await res.json();

      if (res.status === 409) {
        setError(json.error || 'Conflict detected. Reload to see changes.');
      } else if (!res.ok) {
        setError(json.error || 'Failed to save range changes. Check your connection and try again.');
      } else {
        setIsDirty(false);
        setSaveSuccess(true);
        setServerUpdatedAt(new Date().toISOString());
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch {
      setError('Failed to save range changes. Check your connection and try again.');
    }
    setIsSaving(false);
  };

  const handleReset = async () => {
    const name = markerDef?.label || marker;
    const confirmed = window.confirm(
      `This will remove all custom ranges for ${name} and revert to hardcoded values. This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/normative/${marker}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        // Reload from hardcoded defaults
        const tiers: Record<string, TierRanges> = {};
        for (const [key, val] of Object.entries(hardcodedDefaults)) {
          if (val.standards) {
            tiers[key] = val.standards;
          }
        }
        if (Object.keys(tiers).length === 0) {
          tiers.unisex = emptyTiers();
        }
        setEditTiers(tiers);
        setDbOverrides([]);
        setIsDirty(false);
        setSeverityWeight(0);
        setServerUpdatedAt(null);
        setValidationErrors({});
      } else {
        setError(json.error || 'Failed to reset ranges.');
      }
    } catch {
      setError('Failed to reset ranges. Check your connection and try again.');
    }
  };

  const allValidationErrors = Object.values(validationErrors).flat();

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Back link */}
      <a
        href="/admin/normative"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-navy mb-4"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Normative Ranges
      </a>

      {/* Marker header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-navy">{markerDef?.label || marker}</h1>
          {isDirty && <span className="w-2 h-2 rounded-full bg-gold" title="Unsaved changes" />}
        </div>
        <p className="text-sm text-muted">
          {markerDef?.category}
          {markerDef?.subcategory ? ` > ${markerDef.subcategory}` : ''}
        </p>
        {unit && (
          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-muted font-bold mt-1 inline-block">
            {unit}
          </span>
        )}
      </div>

      {/* Variant tabs (if gendered) */}
      {hasGenderVariants && (
        <div className="flex gap-1 mb-4 border-b border-border">
          {(['all', 'male', 'female'] as const).map((g) => (
            <button
              key={g}
              onClick={() => {
                setActiveGender(g);
                if (g !== 'all' && hasAgeVariants && ageGroups.length > 0) {
                  setActiveAgeGroup(ageGroups[0]);
                }
              }}
              className={`text-sm font-bold px-4 py-2 rounded-t-lg ${
                activeGender === g
                  ? 'border-b-2 border-gold text-navy'
                  : 'text-muted hover:text-navy'
              }`}
            >
              {g === 'all' ? 'All' : g === 'male' ? 'Male' : 'Female'}
            </button>
          ))}
        </div>
      )}

      {/* Age group dropdown (if age-bucketed) */}
      {hasAgeVariants && activeGender !== 'all' && (
        <select
          value={activeAgeGroup || ''}
          onChange={(e) => setActiveAgeGroup(e.target.value)}
          className="mb-4 px-3 py-2 border border-border rounded-lg text-sm"
        >
          {ageGroups.map((ag) => (
            <option key={ag} value={ag}>
              {ag}
            </option>
          ))}
        </select>
      )}

      {/* No data message for "All" tab on gendered markers */}
      {hasGenderVariants && activeGender === 'all' && !editTiers.unisex && (
        <div className="p-4 bg-gray-50 rounded-lg text-sm text-muted mb-6">
          This marker has gender-specific ranges. Select the Male or Female tab to edit.
        </div>
      )}

      {/* 5-column tier grid */}
      {(activeGender !== 'all' || !hasGenderVariants || editTiers.unisex) && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
          {TIER_ORDER.map((tier) => (
            <div key={tier} className="space-y-2">
              <div
                className="text-xs font-bold uppercase tracking-wide text-center pb-1 border-t-4"
                style={{ borderColor: TIER_HEX[tier] }}
              >
                {tier}
              </div>
              <div>
                <label className="text-xs text-muted">Min</label>
                <input
                  type="number"
                  step="any"
                  value={currentVariantTiers[tier]?.min ?? ''}
                  onChange={(e) => handleTierChange(tier, 'min', e.target.value)}
                  className={`w-full px-2 py-2 border rounded text-sm text-center tabular-nums ${
                    hasValidationError(tier, 'min') ? 'border-red-500' : 'border-border'
                  } focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none`}
                />
              </div>
              <div>
                <label className="text-xs text-muted">Max</label>
                <input
                  type="number"
                  step="any"
                  value={currentVariantTiers[tier]?.max ?? ''}
                  onChange={(e) => handleTierChange(tier, 'max', e.target.value)}
                  className={`w-full px-2 py-2 border rounded text-sm text-center tabular-nums ${
                    hasValidationError(tier, 'max') ? 'border-red-500' : 'border-border'
                  } focus:border-gold focus:ring-2 focus:ring-gold/25 outline-none`}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Validation errors */}
      {currentValidationErrors.length > 0 && (
        <div className="text-xs text-red-500 space-y-1 mb-4">
          {currentValidationErrors.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}

      {/* Severity weight slider */}
      <div className="mb-6 p-4 border border-border rounded-lg">
        <h3 className="text-sm font-bold text-navy mb-2">Red Flag Severity</h3>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted">Low (0)</span>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={severityWeight}
            onChange={(e) => {
              setSeverityWeight(Number(e.target.value));
              setIsDirty(true);
            }}
            className="flex-1 accent-gold"
          />
          <span className="text-xs text-muted">Critical (10)</span>
          <span className="text-xl font-bold text-navy tabular-nums w-8 text-center">
            {severityWeight}
          </span>
        </div>
        <p className="text-xs text-muted mt-1">
          Controls how prominently this marker&apos;s referral flag appears in reports (0 = subtle,
          10 = critical)
        </p>
      </div>

      {/* Action bar */}
      <div className="flex justify-between items-center p-4 border-t border-border">
        <button
          onClick={handleReset}
          className="text-sm font-bold text-red-500 hover:text-red-700 px-4 py-2 border border-red-200 rounded-lg hover:bg-red-50"
        >
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving || allValidationErrors.length > 0}
          className={`text-sm font-bold px-6 py-2.5 rounded-lg ${
            isDirty && !isSaving && allValidationErrors.length === 0
              ? 'bg-gold text-white hover:bg-gold/90'
              : 'bg-gold/50 text-white opacity-50 cursor-not-allowed'
          }`}
        >
          {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
      )}
    </div>
  );
}
