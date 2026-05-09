'use client';

import { useState } from 'react';
import Toast, { type ToastVariant } from '@/components/ui/Toast';
import type {
  PillarDefinition,
  PillarPageCopy,
  PillarKey,
} from '@/lib/pillars/types';

type ToastState = { variant: ToastVariant; message: string } | null;

const INPUT_CLASS =
  'w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/10 transition-all disabled:opacity-50';

const ANTI_CLAIMS_GUIDANCE =
  'Use plain English. Avoid medical claims, diagnoses, or longevity guarantees.';

interface Props {
  definitions: PillarDefinition[];
  pageCopy: PillarPageCopy | null;
}

interface DefinitionDraft {
  pillarKey: PillarKey;
  label: string;
  shortSummary: string;
  plainMeaning: string;
  sortOrder: number;
}

interface PageCopyDraft {
  heading: string;
  intro: string;
}

function defToDraft(d: PillarDefinition): DefinitionDraft {
  return {
    pillarKey: d.pillarKey,
    label: d.label,
    shortSummary: d.shortSummary,
    plainMeaning: d.plainMeaning,
    sortOrder: d.sortOrder,
  };
}

export default function AdminPillarsForm({ definitions, pageCopy }: Props) {
  const [drafts, setDrafts] = useState<DefinitionDraft[]>(
    definitions.map(defToDraft)
  );
  const [pageCopyDraft, setPageCopyDraft] = useState<PageCopyDraft>({
    heading: pageCopy?.heading ?? '',
    intro: pageCopy?.intro ?? '',
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const updateDraft = (
    pillarKey: PillarKey,
    patch: Partial<DefinitionDraft>
  ) => {
    setDrafts((prev) =>
      prev.map((d) => (d.pillarKey === pillarKey ? { ...d, ...patch } : d))
    );
  };

  const handleSaveDefinition = async (draft: DefinitionDraft) => {
    setSavingKey(`def:${draft.pillarKey}`);
    try {
      const res = await fetch('/api/admin/pillars', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'definition', ...draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setToast({ variant: 'success', message: 'Pillar definitions saved.' });
      } else {
        const serverError =
          (data && typeof data.error === 'string' && data.error) || 'Unknown error';
        setToast({
          variant: 'error',
          message: `Couldn't save. ${serverError} — try again or refresh the page.`,
        });
      }
    } catch {
      setToast({
        variant: 'error',
        message: `Couldn't save. Network error — try again or refresh the page.`,
      });
    } finally {
      setSavingKey(null);
    }
  };

  const handleSavePageCopy = async () => {
    setSavingKey('pageCopy');
    try {
      const res = await fetch('/api/admin/pillars', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'pageCopy', ...pageCopyDraft }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setToast({ variant: 'success', message: 'Pillar definitions saved.' });
      } else {
        const serverError =
          (data && typeof data.error === 'string' && data.error) || 'Unknown error';
        setToast({
          variant: 'error',
          message: `Couldn't save. ${serverError} — try again or refresh the page.`,
        });
      }
    } catch {
      setToast({
        variant: 'error',
        message: `Couldn't save. Network error — try again or refresh the page.`,
      });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Page copy editor — top of page so it bookends the heading clients see */}
      <section className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
        <h2 className="text-base font-semibold text-navy mb-1">Page heading + intro</h2>
        <p className="text-xs text-muted mb-4">
          Hero copy shown above the five pillar cards on every client report.
        </p>
        <div className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="page-heading"
              className="block text-xs font-semibold text-navy mb-1.5"
            >
              Heading
            </label>
            <input
              id="page-heading"
              type="text"
              value={pageCopyDraft.heading}
              onChange={(e) =>
                setPageCopyDraft((p) => ({ ...p, heading: e.target.value }))
              }
              className={INPUT_CLASS}
              disabled={savingKey === 'pageCopy'}
            />
          </div>
          <div>
            <label
              htmlFor="page-intro"
              className="block text-xs font-semibold text-navy mb-1.5"
            >
              Intro
            </label>
            <p className="text-[11px] text-muted mb-1.5">{ANTI_CLAIMS_GUIDANCE}</p>
            <textarea
              id="page-intro"
              rows={3}
              value={pageCopyDraft.intro}
              onChange={(e) =>
                setPageCopyDraft((p) => ({ ...p, intro: e.target.value }))
              }
              className={INPUT_CLASS}
              disabled={savingKey === 'pageCopy'}
            />
          </div>
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleSavePageCopy}
              disabled={savingKey === 'pageCopy'}
              className="px-4 py-2 rounded-lg bg-navy text-white text-sm font-semibold hover:bg-navy/90 disabled:opacity-50 transition-colors"
            >
              {savingKey === 'pageCopy' ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </section>

      {/* Definition editors — one card per pillar */}
      {drafts.map((draft) => {
        const isSaving = savingKey === `def:${draft.pillarKey}`;
        return (
          <section
            key={draft.pillarKey}
            className="bg-surface rounded-2xl border border-border p-6 shadow-sm"
          >
            <h2 className="text-base font-semibold text-navy mb-4">
              {draft.label || draft.pillarKey}
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor={`label-${draft.pillarKey}`}
                  className="block text-xs font-semibold text-navy mb-1.5"
                >
                  Label
                </label>
                <input
                  id={`label-${draft.pillarKey}`}
                  type="text"
                  value={draft.label}
                  onChange={(e) =>
                    updateDraft(draft.pillarKey, { label: e.target.value })
                  }
                  className={INPUT_CLASS}
                  disabled={isSaving}
                />
              </div>
              <div>
                <label
                  htmlFor={`short-${draft.pillarKey}`}
                  className="block text-xs font-semibold text-navy mb-1.5"
                >
                  Short summary
                </label>
                <p className="text-[11px] text-muted mb-1.5">{ANTI_CLAIMS_GUIDANCE}</p>
                <textarea
                  id={`short-${draft.pillarKey}`}
                  rows={2}
                  value={draft.shortSummary}
                  onChange={(e) =>
                    updateDraft(draft.pillarKey, { shortSummary: e.target.value })
                  }
                  className={INPUT_CLASS}
                  disabled={isSaving}
                />
              </div>
              <div>
                <label
                  htmlFor={`plain-${draft.pillarKey}`}
                  className="block text-xs font-semibold text-navy mb-1.5"
                >
                  Plain meaning
                </label>
                <p className="text-[11px] text-muted mb-1.5">{ANTI_CLAIMS_GUIDANCE}</p>
                <textarea
                  id={`plain-${draft.pillarKey}`}
                  rows={4}
                  value={draft.plainMeaning}
                  onChange={(e) =>
                    updateDraft(draft.pillarKey, { plainMeaning: e.target.value })
                  }
                  className={INPUT_CLASS}
                  disabled={isSaving}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4 items-end">
                <div>
                  <label
                    htmlFor={`sort-${draft.pillarKey}`}
                    className="block text-xs font-semibold text-navy mb-1.5"
                  >
                    Sort order
                  </label>
                  <input
                    id={`sort-${draft.pillarKey}`}
                    type="number"
                    min={0}
                    step={1}
                    value={draft.sortOrder}
                    onChange={(e) => {
                      const next = parseInt(e.target.value, 10);
                      updateDraft(draft.pillarKey, {
                        sortOrder: Number.isFinite(next) ? next : 0,
                      });
                    }}
                    className={INPUT_CLASS}
                    disabled={isSaving}
                  />
                </div>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => handleSaveDefinition(draft)}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-lg bg-navy text-white text-sm font-semibold hover:bg-navy/90 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {toast ? (
        <Toast
          variant={toast.variant}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}
