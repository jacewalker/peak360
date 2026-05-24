'use client';

import { useMemo, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import MonoEyebrow from '@/components/ui/MonoEyebrow';

interface ClientPickerDialogProps {
  open: boolean;
  onClose: () => void;
  existingNames: string[];
  onConfirm: (name: string) => void | Promise<void>;
  title?: string;
  confirmLabel?: string;
  /**
   * Confirm-button label used when the typed name does NOT match an existing
   * client (i.e. confirming will create a brand-new client). When omitted, the
   * button always shows `confirmLabel` — this preserves current behavior for
   * call sites like the assign dialog that should never show a create label.
   */
  createLabel?: string;
  busy?: boolean;
}

/**
 * Quick task 260524-gre — reusable client-name picker on top of the Dialog primitive.
 *
 * Name-based client model (no clientId / no DB table): the coach either picks an
 * existing name from the list or types a new one. A non-empty name is REQUIRED —
 * the confirm button stays disabled until one is present (locked decision).
 *
 * The text input doubles as a typeahead filter over `existingNames`; clicking a
 * listed name fills the input. Confirm trims whitespace and a typed name that
 * already exists (case-insensitive) is treated the same as picking it. The dialog
 * does not close itself on confirm — the parent owns `open` so it can keep the
 * dialog up if the underlying request fails.
 */
export default function ClientPickerDialog({
  open,
  onClose,
  existingNames,
  onConfirm,
  title = 'WHICH CLIENT?',
  confirmLabel = 'Start assessment',
  createLabel,
  busy = false,
}: ClientPickerDialogProps) {
  const [name, setName] = useState('');

  // The parent owns `open`. Clearing the input on close means the next open
  // always starts empty without a setState-in-effect (which the project's
  // react-hooks lint rule forbids).
  const handleClose = () => {
    setName('');
    onClose();
  };

  // Distinct non-empty names, deduped case-insensitively, sorted.
  const sortedNames = useMemo(() => {
    const byLower = new Map<string, string>();
    for (const raw of existingNames) {
      const trimmed = (raw ?? '').trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (!byLower.has(key)) byLower.set(key, trimmed);
    }
    return Array.from(byLower.values()).sort((a, b) => a.localeCompare(b));
  }, [existingNames]);

  // Typeahead: filter the list by the current input (case-insensitive substring).
  const filteredNames = useMemo(() => {
    const q = name.trim().toLowerCase();
    if (!q) return sortedNames;
    return sortedNames.filter((n) => n.toLowerCase().includes(q));
  }, [sortedNames, name]);

  const trimmed = name.trim();
  const canConfirm = trimmed.length > 0 && !busy;

  // A non-empty name that doesn't match an existing client (case-insensitive)
  // means confirming will create a brand-new client.
  const isExisting = sortedNames.some(
    (n) => n.toLowerCase() === trimmed.toLowerCase(),
  );
  const isNewClient = trimmed.length > 0 && !isExisting;

  // Use the create-flavored label only when a create label was provided AND the
  // typed name is new; otherwise fall back to the standard confirm label.
  const activeLabel = isNewClient && createLabel ? createLabel : confirmLabel;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    await onConfirm(trimmed);
    // Clear so a subsequent open (the parent may reuse this instance, e.g. the
    // assign flow) starts fresh. The parent owns whether the dialog closes.
    setName('');
  };

  return (
    <Dialog open={open} onClose={handleClose} ariaLabel="Choose client">
      <MonoEyebrow variant="meta" as="div" className="mb-4">
        {title}
      </MonoEyebrow>

      <input
        data-autofocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
          }
        }}
        placeholder="Search existing or type a new client name"
        className="w-full h-12 px-4 bg-bg-3 border border-line rounded-md text-[13px] text-text placeholder:text-text-faint focus:outline-none focus:border-gold-brand transition-colors"
      />

      <p className="mt-2 text-[12px] text-text-dim">
        {isNewClient ? (
          <>
            New client — <span className="text-gold-brand">“{trimmed}”</span>{' '}
            will be created.
          </>
        ) : (
          'Pick an existing client, or type a new name to create one.'
        )}
      </p>

      {sortedNames.length > 0 && (
        <div className="mt-4">
          <MonoEyebrow variant="meta" as="div" className="mb-2">
            EXISTING CLIENTS
          </MonoEyebrow>
          {filteredNames.length === 0 ? (
            <p className="text-[13px] text-text-dim">No matches.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded-md border border-line divide-y divide-line">
              {filteredNames.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setName(n)}
                  className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors hover:bg-bg-2 ${
                    n.toLowerCase() === trimmed.toLowerCase()
                      ? 'text-gold-brand'
                      : 'text-text'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2.5 text-[13px] font-medium tracking-[0.02em] rounded-md border border-line-2 text-text hover:border-gold-brand hover:text-gold-brand transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="px-6 py-2.5 text-[13px] font-medium tracking-[0.02em] rounded-md bg-gold-brand text-bg hover:bg-champagne disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {busy ? 'Working…' : activeLabel}
        </button>
      </div>
    </Dialog>
  );
}
