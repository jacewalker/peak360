'use client';

import { useState, useRef, useEffect } from 'react';

type ExtractedField = { value: string | number; confidence: string };

interface ExtractedValuesPanelProps {
  fields: Record<string, ExtractedField>;
  onAcceptAll: (finalFields: Record<string, { value: string | number; confidence: string }>) => void;
  onDismiss: () => void;
}

const CONFIDENCE_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

const CONFIDENCE_CONFIG = {
  high: {
    label: 'High confidence',
    tag: 'HIGH',
    tagClass: 'bg-status-good/10 text-status-good border-status-good/30',
    cardClass: 'border-status-good/30 bg-status-good/[0.04]',
    cardEditingClass: 'border-status-good/50 bg-status-good/[0.08] ring-2 ring-status-good/20',
    dotClass: 'bg-status-good',
    iconClass: 'text-status-good',
  },
  medium: {
    label: 'Medium confidence',
    tag: 'MED',
    tagClass: 'bg-gold-brand/10 text-gold-brand border-gold-brand/30',
    cardClass: 'border-gold-brand/30 bg-gold-brand/[0.04]',
    cardEditingClass: 'border-gold-brand/50 bg-gold-brand/[0.08] ring-2 ring-gold-brand/20',
    dotClass: 'bg-gold-brand',
    iconClass: 'text-gold-brand',
  },
  low: {
    label: 'Low confidence',
    tag: 'LOW',
    tagClass: 'bg-danger/10 text-danger border-danger/30',
    cardClass: 'border-danger/30 bg-danger/[0.04]',
    cardEditingClass: 'border-danger/50 bg-danger/[0.08] ring-2 ring-danger/20',
    dotClass: 'bg-danger',
    iconClass: 'text-danger',
  },
} as const;

function ConfidenceIcon({ confidence }: { confidence: string }) {
  const config = CONFIDENCE_CONFIG[confidence as keyof typeof CONFIDENCE_CONFIG] || CONFIDENCE_CONFIG.medium;

  if (confidence === 'high') {
    return (
      <svg className={`w-4 h-4 ${config.iconClass}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" />
      </svg>
    );
  }
  if (confidence === 'low') {
    return (
      <svg className={`w-4 h-4 ${config.iconClass}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    );
  }
  return (
    <svg className={`w-4 h-4 ${config.iconClass}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function EditableValue({
  fieldKey,
  value,
  isOverridden,
  onOverride,
}: {
  fieldKey: string;
  value: string | number;
  isOverridden: boolean;
  onOverride: (key: string, newValue: string | number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed === '' || trimmed === String(value)) {
      setDraft(String(value));
      return;
    }
    const numeric = Number(trimmed);
    onOverride(fieldKey, isNaN(numeric) ? trimmed : numeric);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(String(value)); setEditing(false); }
        }}
        className="w-16 text-[13px] font-medium text-text tabular-nums bg-bg-3 border border-line-2 rounded px-1.5 py-0.5 text-right focus:outline-none focus:border-gold-brand"
      />
    );
  }

  return (
    <button
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      className={`
        text-[13px] font-medium tabular-nums text-right cursor-text
        border-b border-dashed transition-colors
        ${isOverridden
          ? 'text-gold-brand border-gold-brand/50 hover:border-gold-brand'
          : 'text-text border-transparent hover:border-line-2'
        }
      `}
      title="Click to edit"
    >
      {value}
    </button>
  );
}

export default function ExtractedValuesPanel({ fields, onAcceptAll, onDismiss }: ExtractedValuesPanelProps) {
  const [overrides, setOverrides] = useState<Record<string, string | number>>({});

  const handleOverride = (key: string, newValue: string | number) => {
    setOverrides((prev) => ({ ...prev, [key]: newValue }));
  };

  const getFinalValue = (key: string, original: string | number) => {
    return key in overrides ? overrides[key] : original;
  };

  const handleAcceptAll = () => {
    const finalFields: Record<string, { value: string | number; confidence: string }> = {};
    for (const [key, field] of Object.entries(fields)) {
      finalFields[key] = {
        value: getFinalValue(key, field.value),
        confidence: key in overrides ? 'high' : field.confidence,
      };
    }
    onAcceptAll(finalFields);
  };

  const overrideCount = Object.keys(overrides).length;

  const sorted = Object.entries(fields).sort(
    ([, a], [, b]) => (CONFIDENCE_ORDER[a.confidence] ?? 1) - (CONFIDENCE_ORDER[b.confidence] ?? 1)
  );

  const groups = {
    high: sorted.filter(([, v]) => v.confidence === 'high'),
    medium: sorted.filter(([, v]) => v.confidence === 'medium'),
    low: sorted.filter(([, v]) => v.confidence === 'low'),
  };

  return (
    <div className="rounded-xl border border-line bg-bg-3 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-bg-2 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold-brand/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-gold-brand" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-text text-[13px]">Extracted Values</h4>
            <p className="text-[11px] text-text-dim">
              {sorted.length} field{sorted.length !== 1 ? 's' : ''} found
              {overrideCount > 0 && (
                <span className="text-gold-brand font-medium"> &middot; {overrideCount} edited</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDismiss}
            className="px-3 py-1.5 text-[13px] font-medium text-text-dim hover:text-text hover:bg-bg-3 rounded-lg transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handleAcceptAll}
            className="px-4 py-1.5 bg-gold-brand text-bg text-[13px] font-medium rounded-lg hover:bg-champagne transition-all"
          >
            Accept All
          </button>
        </div>
      </div>

      {/* Confidence legend + edit hint */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-line bg-bg-2/30">
        <div className="flex gap-4">
          {(['high', 'medium', 'low'] as const).map((level) => {
            const config = CONFIDENCE_CONFIG[level];
            const count = groups[level].length;
            return (
              <div key={level} className="flex items-center gap-1.5 text-[11px]">
                <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
                <span className="text-text-dim font-medium">
                  {config.label} ({count})
                </span>
              </div>
            );
          })}
        </div>
        <span className="text-[11px] text-text-faint hidden sm:block">Click any value to edit</span>
      </div>

      {/* Field cards grouped by confidence */}
      <div className="p-3 space-y-3">
        {(['high', 'medium', 'low'] as const).map((level) => {
          const entries = groups[level];
          if (entries.length === 0) return null;
          const config = CONFIDENCE_CONFIG[level];

          return (
            <div key={level}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {entries.map(([key, val]) => {
                  const isOverridden = key in overrides;
                  const displayValue = getFinalValue(key, val.value);

                  return (
                    <div
                      key={key}
                      className={`
                        flex items-center justify-between rounded-lg px-2.5 py-2 border
                        transition-all ${isOverridden ? config.cardEditingClass : config.cardClass}
                      `}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isOverridden ? (
                          <svg className="w-4 h-4 text-gold-brand shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                          </svg>
                        ) : (
                          <ConfidenceIcon confidence={level} />
                        )}
                        <span className="text-[11px] text-text-dim truncate">{key}</span>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        <EditableValue
                          fieldKey={key}
                          value={displayValue}
                          isOverridden={isOverridden}
                          onOverride={handleOverride}
                        />
                        {isOverridden ? (
                          <span className="text-[11px] font-medium px-1 py-0.5 rounded border bg-gold-brand/10 text-gold-brand border-gold-brand/30 font-mono">
                            EDIT
                          </span>
                        ) : (
                          <span className={`text-[11px] font-medium px-1 py-0.5 rounded border ${config.tagClass} font-mono`}>
                            {config.tag}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
