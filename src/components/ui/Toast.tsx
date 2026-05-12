'use client';

import { useEffect } from 'react';
import MonoEyebrow from '@/components/ui/MonoEyebrow';

export type ToastVariant = 'success' | 'error';

type ToastProps = {
  variant: ToastVariant;
  message: string;
  onDismiss: () => void;
};

/**
 * Hand-rolled toast (UI-SPEC §Component Inventory — explicit instruction:
 * "Do NOT install a toast library for two toasts; one component is enough.").
 *
 * - Fixed top-right (per Phase 9 UI-SPEC §Layout sticky behaviour)
 * - 3-second auto-dismiss
 * - Mono eyebrow above message (SAVED / ERROR)
 * - Gold-brand left border for success, danger for error
 * - role="status" for success, role="alert" for error (a11y)
 */
export default function Toast({ variant, message, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const borderColor = variant === 'success' ? 'border-l-4 border-gold-brand' : 'border-l-4 border-danger';
  const role = variant === 'success' ? 'status' : 'alert';
  const eyebrow = variant === 'success' ? 'SAVED' : 'ERROR';

  return (
    <div
      role={role}
      className={`fixed top-6 right-6 z-50 bg-bg-3 px-4 py-3 rounded-lg shadow-lg border border-line-2 ${borderColor} text-[13px] text-text max-w-sm`}
    >
      <MonoEyebrow variant="hero" as="div" className="mb-1">
        {eyebrow}
      </MonoEyebrow>
      <p className="text-[13px] text-text">{message}</p>
    </div>
  );
}
