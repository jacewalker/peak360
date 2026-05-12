'use client';

import { useState } from 'react';
import Toast, { type ToastVariant } from '@/components/ui/Toast';
import Dialog from '@/components/ui/Dialog';
import type {
  PillarDefinition,
  PillarPrescription,
  PillarKey,
} from '@/lib/pillars/types';

type ToastState = { variant: ToastVariant; message: string } | null;

const INPUT_CLASS =
  'w-full px-3 py-2.5 rounded-lg border border-line bg-bg-3 text-[13px] text-text placeholder:text-text-dim focus:outline-none focus:border-gold-brand/50 focus:ring-2 focus:ring-gold-brand/10 transition-all disabled:opacity-50';

const ANTI_CLAIMS_GUIDANCE =
  'Use plain English. Avoid medical claims, diagnoses, or longevity guarantees.';

const EMPTY_HINT =
  'No plan written yet — clients see a "check back soon" message.';

interface PrescriptionDraft {
  pillarKey: PillarKey;
  summary: string;
  bulletsText: string;
  fullPlanHref: string;
}

interface Props {
  assessmentId: string;
  clientName: string;
  definitions: PillarDefinition[];
  prescriptions: PillarPrescription[];
}

interface PendingDelete {
  pillarKey: PillarKey;
  pillarLabel: string;
}

function bulletsToText(b: string[] | null | undefined): string {
  if (!b || b.length === 0) return '';
  return b.join('\n');
}

function buildDraft(
  pillarKey: PillarKey,
  prescription: PillarPrescription | undefined
): PrescriptionDraft {
  return {
    pillarKey,
    summary: prescription?.summary ?? '',
    bulletsText: bulletsToText(prescription?.bullets ?? null),
    fullPlanHref: prescription?.fullPlanHref ?? '',
  };
}

export default function AdminPrescriptionsForm({
  assessmentId,
  clientName,
  definitions,
  prescriptions,
}: Props) {
  const [localPrescriptions, setLocalPrescriptions] = useState<
    PillarPrescription[]
  >(prescriptions);

  // Build initial draft state from server-loaded prescriptions
  const initialDrafts: Record<string, PrescriptionDraft> = {};
  for (const def of definitions) {
    const found = localPrescriptions.find((p) => p.pillarKey === def.pillarKey);
    initialDrafts[def.pillarKey] = buildDraft(def.pillarKey, found);
  }
  const [drafts, setDrafts] =
    useState<Record<string, PrescriptionDraft>>(initialDrafts);

  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);

  const updateDraft = (
    pillarKey: PillarKey,
    patch: Partial<PrescriptionDraft>
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [pillarKey]: { ...prev[pillarKey], ...patch },
    }));
  };

  const hasPrescription = (pillarKey: PillarKey): boolean =>
    localPrescriptions.some((p) => p.pillarKey === pillarKey);

  const handleSave = async (pillarKey: PillarKey) => {
    const draft = drafts[pillarKey];
    if (!draft) return;
    setSavingKey(pillarKey);
    try {
      const bullets = draft.bulletsText
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const body: Record<string, unknown> = {
        pillarKey: draft.pillarKey,
        summary: draft.summary,
        bullets,
      };
      const trimmedHref = draft.fullPlanHref.trim();
      if (trimmedHref.length > 0) {
        body.fullPlanHref = trimmedHref;
      }

      const res = await fetch(
        `/api/admin/assessments/${assessmentId}/prescriptions`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        // Optimistically update local cache
        setLocalPrescriptions((prev) => {
          const without = prev.filter((p) => p.pillarKey !== pillarKey);
          return [
            ...without,
            {
              pillarKey,
              summary: draft.summary.trim(),
              bullets: bullets.length > 0 ? bullets : null,
              fullPlanHref: trimmedHref.length > 0 ? trimmedHref : null,
            },
          ];
        });
        setToast({ variant: 'success', message: 'Recommendation saved.' });
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

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const { pillarKey } = pendingDelete;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/assessments/${assessmentId}/prescriptions?pillarKey=${encodeURIComponent(pillarKey)}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setLocalPrescriptions((prev) =>
          prev.filter((p) => p.pillarKey !== pillarKey)
        );
        // Also reset the form draft for that pillar so the inputs clear visually
        setDrafts((prev) => ({
          ...prev,
          [pillarKey]: buildDraft(pillarKey, undefined),
        }));
        setToast({ variant: 'success', message: 'Plan cleared.' });
        setPendingDelete(null);
      } else {
        const serverError =
          (data && typeof data.error === 'string' && data.error) || 'Unknown error';
        setToast({
          variant: 'error',
          message: `Couldn't clear. ${serverError} — try again or refresh the page.`,
        });
      }
    } catch {
      setToast({
        variant: 'error',
        message: `Couldn't clear. Network error — try again or refresh the page.`,
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {definitions.map((def) => {
        const draft = drafts[def.pillarKey];
        if (!draft) return null;
        const isSaving = savingKey === def.pillarKey;
        const exists = hasPrescription(def.pillarKey);
        return (
          <section
            key={def.pillarKey}
            className="bg-bg-3 rounded-2xl border border-line p-6 shadow-sm"
          >
            <h2 className="text-[20px] font-semibold text-text mb-1">
              {def.label}
            </h2>
            <p className="text-[11px] text-text-dim mb-4">{def.shortSummary}</p>

            {!exists ? (
              <p className="text-[12px] text-text-dim italic mb-4">{EMPTY_HINT}</p>
            ) : null}

            <div className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor={`summary-${def.pillarKey}`}
                  className="block text-[11px] font-semibold text-text mb-1.5"
                >
                  Summary (required)
                </label>
                <p className="text-[11px] text-text-dim mb-1.5">
                  {ANTI_CLAIMS_GUIDANCE}
                </p>
                <textarea
                  id={`summary-${def.pillarKey}`}
                  rows={4}
                  value={draft.summary}
                  onChange={(e) =>
                    updateDraft(def.pillarKey, { summary: e.target.value })
                  }
                  className={INPUT_CLASS}
                  disabled={isSaving}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor={`bullets-${def.pillarKey}`}
                  className="block text-[11px] font-semibold text-text mb-1.5"
                >
                  Action items (optional, one per line)
                </label>
                <textarea
                  id={`bullets-${def.pillarKey}`}
                  rows={3}
                  value={draft.bulletsText}
                  onChange={(e) =>
                    updateDraft(def.pillarKey, { bulletsText: e.target.value })
                  }
                  className={INPUT_CLASS}
                  disabled={isSaving}
                  placeholder="One action per line"
                />
              </div>
              <div>
                <label
                  htmlFor={`href-${def.pillarKey}`}
                  className="block text-[11px] font-semibold text-text mb-1.5"
                >
                  Full-plan link (optional URL)
                </label>
                <input
                  id={`href-${def.pillarKey}`}
                  type="url"
                  value={draft.fullPlanHref}
                  onChange={(e) =>
                    updateDraft(def.pillarKey, { fullPlanHref: e.target.value })
                  }
                  className={INPUT_CLASS}
                  disabled={isSaving}
                  placeholder="https://"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                {exists ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDelete({
                        pillarKey: def.pillarKey,
                        pillarLabel: def.label,
                      })
                    }
                    disabled={isSaving}
                    className="px-4 py-2 rounded-lg border border-danger/40 text-danger text-[13px] font-semibold hover:bg-danger/10 disabled:opacity-50 transition-colors"
                  >
                    Clear this plan
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => handleSave(def.pillarKey)}
                  disabled={isSaving || draft.summary.trim().length === 0}
                  className="px-4 py-2 rounded-lg bg-gold-brand text-bg text-[13px] font-semibold hover:bg-champagne disabled:opacity-50 transition-colors"
                >
                  {isSaving ? 'Saving…' : 'Save plan'}
                </button>
              </div>
            </div>
          </section>
        );
      })}

      <Dialog
        open={pendingDelete !== null}
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
        mode="centered"
        ariaLabel="Confirm clear plan"
      >
        {pendingDelete ? (
          <div className="flex flex-col gap-4">
            <h3 className="text-[20px] font-semibold text-text">
              Clear plan
            </h3>
            <p className="text-[13px] text-text">
              Clear the {pendingDelete.pillarLabel} plan for {clientName}? They&apos;ll
              see the &quot;check back soon&quot; placeholder until you write a new one.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg border border-line text-text text-[13px] font-semibold hover:bg-bg-2 disabled:opacity-50 transition-colors"
              >
                Keep current plan
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                data-autofocus
                className="px-4 py-2 rounded-lg bg-danger text-bg text-[13px] font-semibold hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Clearing…' : 'Yes, clear'}
              </button>
            </div>
          </div>
        ) : null}
      </Dialog>

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
