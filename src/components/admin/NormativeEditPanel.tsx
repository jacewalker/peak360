'use client';

import { useState, useEffect, useCallback } from 'react';
import { REPORT_MARKERS } from '@/lib/report-markers';
import type { MarkerDef } from '@/lib/report-markers';
import type { RatingTier, TierRanges, NormativeRangeRow } from '@/types/normative';

const TIER_ORDER: RatingTier[] = ['poor', 'cautious', 'normal', 'great', 'elite'];

const TIER_CONFIG: Record<RatingTier, { color: string; label: string; bg: string; ring: string }> = {
  poor:     { color: '#ef4444', label: 'Poor',     bg: 'rgba(239,68,68,0.05)',    ring: '#ef444440' },
  cautious: { color: '#f59e0b', label: 'Cautious', bg: 'rgba(245,158,11,0.05)',   ring: '#f59e0b40' },
  normal:   { color: '#6b7280', label: 'Normal',   bg: 'rgba(107,114,128,0.05)',  ring: '#6b728040' },
  great:    { color: '#3b82f6', label: 'Great',    bg: 'rgba(59,130,246,0.05)',   ring: '#3b82f640' },
  elite:    { color: '#10b981', label: 'Elite',    bg: 'rgba(16,185,129,0.05)',   ring: '#10b98140' },
};

interface HardcodedDefaults {
  [key: string]: { unit: string | null; note: string | null; standards: TierRanges | null };
}

function emptyTiers(): TierRanges {
  return {
    poor: { min: 0, max: 0 }, cautious: { min: 0, max: 0 }, normal: { min: 0, max: 0 },
    great: { min: 0, max: 0 }, elite: { min: 0, max: 0 },
  };
}

function getVariantKey(gender: string | null, ageGroup: string | null): string {
  if (!gender && !ageGroup) return 'unisex';
  if (gender && !ageGroup) return gender;
  if (gender && ageGroup) return `${gender}_${ageGroup}`;
  return 'unisex';
}

function validateTiers(tiers: TierRanges): string[] {
  const errors: string[] = [];
  for (const tier of TIER_ORDER) {
    const r = tiers[tier];
    if (r && r.min >= r.max) errors.push(`${tier}: min must be less than max`);
  }
  for (let i = 0; i < TIER_ORDER.length - 1; i++) {
    const prev = tiers[TIER_ORDER[i]];
    const next = tiers[TIER_ORDER[i + 1]];
    if (prev && next && prev.max !== next.min) {
      errors.push(`Tiers must be contiguous: ${TIER_ORDER[i]} max ≠ ${TIER_ORDER[i + 1]} min`);
    }
  }
  return errors;
}

interface Props {
  markerKey: string;
  onClose: () => void;
  onSaved?: () => void;
}

export default function NormativeEditPanel({ markerKey, onClose, onSaved }: Props) {
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

  const hasGenderVariants = Object.keys(hardcodedDefaults).some(k => k === 'male' || k === 'female');
  const hasAgeVariants = Object.keys(editTiers).some(k => k.includes('_'));
  const ageGroups = Array.from(
    new Set(Object.keys(editTiers).filter(k => k.includes('_')).map(k => k.split('_')[1]))
  );

  useEffect(() => {
    setLoading(true);
    setIsDirty(false);
    setError(null);
    setSaveSuccess(false);
    setValidationErrors({});
    setActiveGender('all');
    setActiveAgeGroup(null);

    const def = REPORT_MARKERS.find(m => m.testKey === markerKey);
    setMarkerDef(def || null);

    fetch(`/api/admin/normative/${markerKey}`)
      .then(res => res.json())
      .then(json => {
        if (!json.success) { setError(json.error || 'Failed to load'); setLoading(false); return; }

        const { dbOverrides: overrides, hardcodedDefaults: defaults } = json.data;
        setDbOverrides(overrides);
        setHardcodedDefaults(defaults);

        const firstDefault = Object.values(defaults)[0] as HardcodedDefaults[string] | undefined;
        setUnit(firstDefault?.unit ?? def?.fallbackUnit ?? null);

        const tiers: Record<string, TierRanges> = {};
        if (overrides.length > 0) {
          for (const row of overrides as NormativeRangeRow[]) {
            tiers[getVariantKey(row.gender, row.ageGroup)] = (row.tiers as TierRanges) || emptyTiers();
          }
          const firstRow = overrides[0] as NormativeRangeRow;
          setSeverityWeight(firstRow.severityWeight ?? 0);
          const latestUpdate = (overrides as NormativeRangeRow[]).reduce(
            (latest: string, row: NormativeRangeRow) => row.updatedAt > latest ? row.updatedAt : latest, ''
          );
          setServerUpdatedAt(latestUpdate || null);
        } else {
          for (const [key, val] of Object.entries(defaults as HardcodedDefaults)) {
            if (val.standards) tiers[key] = val.standards;
          }
        }

        if (Object.keys(tiers).length === 0) tiers.unisex = emptyTiers();
        setEditTiers(tiers);

        const ageKeys = Object.keys(tiers).filter(k => k.includes('_'));
        if (ageKeys.length > 0) {
          const maleAgeKeys = ageKeys.filter(k => k.startsWith('male_'));
          if (maleAgeKeys.length > 0) { setActiveAgeGroup(maleAgeKeys[0].split('_')[1]); setActiveGender('male'); }
        }
        setLoading(false);
      })
      .catch(() => { setError('Failed to load. Check your connection.'); setLoading(false); });
  }, [markerKey]);

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
    const updated: TierRanges = {
      ...(editTiers[key] || emptyTiers()),
      [tier]: { ...(editTiers[key]?.[tier] || { min: 0, max: 0 }), [field]: isNaN(numVal) ? 0 : numVal },
    };
    setEditTiers(prev => ({ ...prev, [key]: updated }));
    setIsDirty(true);
    setValidationErrors(prev => ({ ...prev, [key]: validateTiers(updated) }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    const variants = Object.entries(editTiers).map(([key, tiers]) => {
      let gender: string | null = null, ageGroup: string | null = null;
      if (key !== 'unisex') {
        if (key.includes('_')) { const p = key.split('_'); gender = p[0]; ageGroup = p.slice(1).join('_'); }
        else gender = key;
      }
      return { gender, ageGroup, tiers, unit: unit ?? undefined, severityWeight };
    });

    try {
      const res = await fetch(`/api/admin/normative/${markerKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variants, updatedAt: serverUpdatedAt }),
      });
      const json = await res.json();
      if (res.status === 409) setError(json.error || 'Conflict — reload to see latest changes.');
      else if (!res.ok) setError(json.error || 'Failed to save.');
      else {
        setIsDirty(false);
        setSaveSuccess(true);
        setServerUpdatedAt(new Date().toISOString());
        setTimeout(() => setSaveSuccess(false), 2500);
        onSaved?.();
      }
    } catch { setError('Failed to save. Check your connection.'); }
    setIsSaving(false);
  };

  const handleReset = async () => {
    if (!window.confirm(`Remove all custom ranges for "${markerDef?.label || markerKey}" and revert to hardcoded defaults?`)) return;
    try {
      const res = await fetch(`/api/admin/normative/${markerKey}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        const tiers: Record<string, TierRanges> = {};
        for (const [key, val] of Object.entries(hardcodedDefaults)) {
          if (val.standards) tiers[key] = val.standards;
        }
        if (Object.keys(tiers).length === 0) tiers.unisex = emptyTiers();
        setEditTiers(tiers);
        setDbOverrides([]);
        setIsDirty(false);
        setSeverityWeight(0);
        setServerUpdatedAt(null);
        setValidationErrors({});
        onSaved?.();
      } else setError(json.error || 'Failed to reset.');
    } catch { setError('Failed to reset.'); }
  };

  const handleClose = () => {
    if (isDirty && !window.confirm('Discard unsaved changes?')) return;
    onClose();
  };

  const allValidationErrors = Object.values(validationErrors).flat();
  const isDbOverride = dbOverrides.length > 0;

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Panel header — dark navy matching sidebar */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-white/10" style={{ backgroundColor: '#0f2440' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              {isDbOverride ? (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30">
                  DB Override
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/40 border border-white/10">
                  Hardcoded
                </span>
              )}
              {saveSuccess ? (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Saved
                </span>
              ) : isDirty && (
                <span className="flex items-center gap-1 text-[10px] text-gold/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block" />
                  Unsaved
                </span>
              )}
            </div>
            <h2 className="text-[1.1rem] font-black text-white tracking-tight leading-tight">
              {markerDef?.label || markerKey}
            </h2>
            <p className="text-[11px] text-white/35 mt-0.5 leading-tight">
              {markerDef?.category}
              {markerDef?.subcategory ? ` · ${markerDef.subcategory}` : ''}
              {unit ? ` · ${unit}` : ''}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-5 space-y-2.5">
            {TIER_ORDER.map((_, i) => (
              <div key={i} className="animate-pulse h-14 bg-border/50 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Gender tabs */}
            {hasGenderVariants && (
              <div className="flex border-b border-border">
                {(['all', 'male', 'female'] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => {
                      setActiveGender(g);
                      if (g !== 'all' && hasAgeVariants && ageGroups.length > 0) setActiveAgeGroup(ageGroups[0]);
                    }}
                    className={`flex-1 text-xs font-bold py-2.5 border-b-2 transition-all ${
                      activeGender === g ? 'border-gold text-navy' : 'border-transparent text-muted hover:text-navy'
                    }`}
                  >
                    {g === 'all' ? 'All' : g === 'male' ? 'Male' : 'Female'}
                  </button>
                ))}
              </div>
            )}

            {/* Age group selector */}
            {hasAgeVariants && activeGender !== 'all' && (
              <div className="px-5 pt-4">
                <select
                  value={activeAgeGroup || ''}
                  onChange={e => setActiveAgeGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface"
                >
                  {ageGroups.map(ag => <option key={ag} value={ag}>{ag}</option>)}
                </select>
              </div>
            )}

            {/* Gender-specific note */}
            {hasGenderVariants && activeGender === 'all' && !editTiers.unisex && (
              <div className="px-5 pt-4 pb-2">
                <p className="text-xs text-muted bg-surface-alt rounded-lg px-3 py-2.5 border border-border">
                  This marker has gender-specific ranges. Select Male or Female to edit.
                </p>
              </div>
            )}

            {/* ── Tier rows ── */}
            {(activeGender !== 'all' || !hasGenderVariants || editTiers.unisex) && (
              <div className="p-4 space-y-2">
                {TIER_ORDER.map(tier => {
                  const cfg = TIER_CONFIG[tier];
                  const hasMinErr = currentValidationErrors.some(e => e.includes(tier) && e.includes('min'));
                  const hasMaxErr = currentValidationErrors.some(e => e.includes(tier) && e.includes('max'));

                  return (
                    <div
                      key={tier}
                      className="flex items-center gap-0 rounded-xl overflow-hidden"
                      style={{ backgroundColor: cfg.bg, outline: `1px solid ${cfg.ring}` }}
                    >
                      {/* Colored left stripe + tier label */}
                      <div
                        className="flex-shrink-0 w-3 self-stretch"
                        style={{ backgroundColor: cfg.color }}
                      />
                      <div className="flex-shrink-0 w-[72px] px-3 py-3">
                        <span
                          className="text-[11px] font-black uppercase tracking-wider block"
                          style={{ color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      </div>

                      {/* Min / Max inputs */}
                      <div className="flex-1 flex items-center gap-2 py-2.5 pr-3">
                        <div className="flex-1">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-muted/60 mb-1">Min</p>
                          <input
                            type="number"
                            step="any"
                            value={currentVariantTiers[tier]?.min ?? ''}
                            onChange={e => handleTierChange(tier, 'min', e.target.value)}
                            className={`w-full px-2 py-1.5 border rounded-lg text-sm text-center tabular-nums bg-white font-mono ${
                              hasMinErr ? 'border-red-400 ring-1 ring-red-200' : 'border-border'
                            } focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20`}
                          />
                        </div>
                        <span className="text-muted/30 text-sm mt-4 flex-shrink-0">→</span>
                        <div className="flex-1">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-muted/60 mb-1">Max</p>
                          <input
                            type="number"
                            step="any"
                            value={currentVariantTiers[tier]?.max ?? ''}
                            onChange={e => handleTierChange(tier, 'max', e.target.value)}
                            className={`w-full px-2 py-1.5 border rounded-lg text-sm text-center tabular-nums bg-white font-mono ${
                              hasMaxErr ? 'border-red-400 ring-1 ring-red-200' : 'border-border'
                            } focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Contiguous range visualiser */}
                {Object.values(currentValidationErrors).length === 0 && (
                  <div className="flex h-2 rounded-full overflow-hidden gap-px mt-1">
                    {TIER_ORDER.map(tier => (
                      <div key={tier} className="flex-1" style={{ backgroundColor: TIER_CONFIG[tier].color }} />
                    ))}
                  </div>
                )}

                {/* Validation errors */}
                {currentValidationErrors.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    {currentValidationErrors.map((err, i) => (
                      <p key={i} className="text-xs text-red-500 flex items-start gap-1.5">
                        <svg className="w-3.5 h-3.5 flex-shrink-0 mt-px" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        {err}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Severity slider */}
            <div className="mx-4 mb-4 p-4 rounded-xl border border-border bg-white">
              <h3 className="text-[10px] font-black uppercase tracking-wider text-muted mb-3">
                Red Flag Severity
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted/60 w-4 text-center">0</span>
                <input
                  type="range" min="0" max="10" step="1"
                  value={severityWeight}
                  onChange={e => { setSeverityWeight(Number(e.target.value)); setIsDirty(true); }}
                  className="flex-1"
                />
                <span className="text-xs text-muted/60 w-6 text-center">10</span>
                <span className="text-xl font-black text-navy tabular-nums w-8 text-center">{severityWeight}</span>
              </div>
              <p className="text-[10px] text-muted/60 mt-2 leading-relaxed">
                Controls referral flag prominence in reports (0 = subtle · 10 = critical)
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-4 mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-200">
                {error}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky footer */}
      {!loading && (
        <div className="flex-shrink-0 border-t border-border bg-surface-alt px-4 py-3 flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="text-xs font-bold text-red-500 hover:text-red-700 px-3 py-2 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            Reset to defaults
          </button>
          <button
            onClick={handleSave}
            disabled={(!isDirty && !saveSuccess) || isSaving || allValidationErrors.length > 0}
            className={`text-sm font-bold px-5 py-2 rounded-lg transition-all duration-200 ${
              saveSuccess
                ? 'bg-emerald-500 text-white shadow-sm cursor-default'
                : isDirty && !isSaving && allValidationErrors.length === 0
                  ? 'bg-gold text-white hover:bg-gold-dark shadow-sm hover:shadow-md'
                  : 'bg-gold/25 text-white/50 cursor-not-allowed'
            }`}
          >
            {isSaving ? 'Saving…' : saveSuccess ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
