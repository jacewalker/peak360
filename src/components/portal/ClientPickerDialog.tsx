'use client';

import { useEffect, useMemo, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import MonoEyebrow from '@/components/ui/MonoEyebrow';

interface ClientPickerDialogProps {
  open: boolean;
  onClose: () => void;
  existingNames: string[];
  onConfirm: (name: string) => void | Promise<void>;
  title?: string;
  confirmLabel?: string;
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
  busy = false,
}: ClientPickerDialogProps) {
  const [name, setName] = useState('');

  // Reset the input each time the dialog opens.
  useEffect(() => {
    if (open) setName('');
  }, [open]);

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

  const handleConfirm = async () => {
    if (!canConfirm) return;
    await onConfirm(trimmed);
  };

  return (
    <Dialog open={open} onClose={onClose} ariaLabel="Choose client">
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
        placeholder="Client name"
        className="w-full h-12 px-4 bg-bg-3 border border-line rounded-md text-[13px] text-text placeholder:text-text-faint focus:outline-none focus:border-gold-brand transition-colors"
      />

      {sortedNames.length > 0 && (
        <div className="mt-4">
          <MonoEyebrow variant="meta" as="div" className="mb-2">
            EXISTING CLIENTS
          </MonoEyebrow>
          {filteredNames.length === 0 ? (
            <p className="text-[13px] text-text-dim">No matches — confirm to create a new client.</p>
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
          onClick={onClose}
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
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
